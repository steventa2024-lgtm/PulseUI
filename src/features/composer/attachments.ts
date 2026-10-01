import { useCallback, useState } from "react";

import { ATTACHMENT_LIMITS, type Attachment } from "@/lib/domain/types";

export type DraftAttachment = Attachment & { id: string; previewUrl?: string };

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("Could not read file"));
    reader.readAsDataURL(file);
  });
}

export async function fileToAttachment(file: File): Promise<DraftAttachment> {
  const name = file.name || `pasted-${Date.now()}.png`;
  const lower = name.toLowerCase();
  const id = `${name}-${file.size}-${Math.random().toString(36).slice(2, 8)}`;
  if ((ATTACHMENT_LIMITS.imageTypes as readonly string[]).includes(file.type)) {
    if (file.size > ATTACHMENT_LIMITS.maxImageBytes) {
      throw new Error(
        `${name} is larger than ${ATTACHMENT_LIMITS.maxImageBytes / 1024 / 1024} MB.`,
      );
    }
    const dataUrl = await readAsDataUrl(file);
    return {
      id,
      name,
      mimeType: file.type,
      size: file.size,
      kind: "image",
      data: dataUrl.slice(dataUrl.indexOf(",") + 1),
      previewUrl: dataUrl,
    };
  }
  if (ATTACHMENT_LIMITS.textExtensions.some((extension) => lower.endsWith(extension))) {
    if (file.size > ATTACHMENT_LIMITS.maxTextBytes) {
      throw new Error(`${name} is larger than ${ATTACHMENT_LIMITS.maxTextBytes / 1024} KB.`);
    }
    return {
      id,
      name,
      mimeType: file.type || "text/plain",
      size: file.size,
      kind: "text",
      data: await file.text(),
    };
  }
  throw new Error(
    `${name}: unsupported file type. Attach images (PNG, JPG, WebP, GIF) or text/source files.`,
  );
}

export function useAttachments() {
  const [items, setItems] = useState<DraftAttachment[]>([]);
  const [errors, setErrors] = useState<string[]>([]);

  const add = useCallback(async (files: FileList | File[]) => {
    const list = Array.from(files);
    const problems: string[] = [];
    const accepted: DraftAttachment[] = [];
    for (const file of list) {
      try {
        accepted.push(await fileToAttachment(file));
      } catch (error) {
        problems.push(error instanceof Error ? error.message : String(error));
      }
    }
    setItems((current) => {
      const room = ATTACHMENT_LIMITS.maxCount - current.length;
      if (accepted.length > room)
        problems.push(`Only ${ATTACHMENT_LIMITS.maxCount} attachments are allowed per message.`);
      return [...current, ...accepted.slice(0, Math.max(0, room))];
    });
    setErrors(problems);
  }, []);

  const remove = useCallback(
    (id: string) => setItems((current) => current.filter((item) => item.id !== id)),
    [],
  );
  const clear = useCallback(() => {
    setItems([]);
    setErrors([]);
  }, []);

  return { items, errors, add, remove, clear, dismissErrors: () => setErrors([]) };
}

export function toPayload(items: DraftAttachment[]): Attachment[] {
  return items.map(({ name, mimeType, size, kind, data }) => ({
    name,
    mimeType,
    size,
    kind,
    data: data ?? "",
  }));
}
