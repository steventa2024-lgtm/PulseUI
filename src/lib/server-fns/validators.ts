/**
 * Zod schemas for every server-function input. Shared so the client can use
 * the same limits for early feedback.
 */
import { z } from "zod";

import { ATTACHMENT_LIMITS } from "../domain/types";

export const projectIdSchema = z.string().regex(/^prj_[a-z0-9]{6,40}$/, "Invalid project id");
export const runIdSchema = z.string().regex(/^run_[a-z0-9]{6,40}$/, "Invalid run id");
export const versionIdSchema = z.string().regex(/^ver_[a-z0-9]{6,40}$/, "Invalid version id");
export const deploymentIdSchema = z.string().regex(/^dpl_[a-z0-9]{6,40}$/, "Invalid deployment id");
export const relativePathSchema = z.string().min(1).max(400);
export const modelIdSchema = z.string().min(1).max(240);

const base64 = /^[A-Za-z0-9+/]+={0,2}$/;

export const attachmentSchema = z
  .object({
    name: z.string().min(1).max(200),
    mimeType: z.string().max(120),
    size: z.number().int().nonnegative(),
    kind: z.enum(["image", "text"]),
    data: z.string(),
  })
  .superRefine((attachment, ctx) => {
    if (attachment.kind === "image") {
      if (!(ATTACHMENT_LIMITS.imageTypes as readonly string[]).includes(attachment.mimeType)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `${attachment.name}: unsupported image type`,
        });
      }
      const bytes = Math.floor((attachment.data.length * 3) / 4);
      if (bytes > ATTACHMENT_LIMITS.maxImageBytes || !base64.test(attachment.data.slice(0, 4096))) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `${attachment.name}: image too large or malformed`,
        });
      }
    } else {
      const lower = attachment.name.toLowerCase();
      if (!ATTACHMENT_LIMITS.textExtensions.some((extension) => lower.endsWith(extension))) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `${attachment.name}: unsupported file type`,
        });
      }
      if (attachment.data.length > ATTACHMENT_LIMITS.maxTextBytes) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `${attachment.name}: text file too large`,
        });
      }
    }
  });

export const attachmentsSchema = z
  .array(attachmentSchema)
  .max(ATTACHMENT_LIMITS.maxCount)
  .default([]);

export const promptSchema = z.string().trim().min(2, "Describe what to build").max(50_000);
export const modeSchema = z.enum(["plan", "build"]).default("build");
