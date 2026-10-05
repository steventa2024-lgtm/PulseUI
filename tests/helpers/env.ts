import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { resetServerEnvCache } from "@/lib/config/env.server";
import { closeDb } from "@/lib/persistence/db.server";

/** Point PulseUI's data directory at a fresh temp dir for this test file. */
export function useTempDataDir(extraEnv: Record<string, string> = {}): {
  dir: string;
  cleanup: () => void;
} {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pulseui-test-"));
  const previous: Record<string, string | undefined> = {};
  const vars = {
    PULSEUI_DATA_DIR: dir,
    PULSEUI_STARTERS_DIR: path.resolve("starters"),
    ...extraEnv,
  };
  for (const [key, value] of Object.entries(vars)) {
    previous[key] = process.env[key];
    process.env[key] = value;
  }
  resetServerEnvCache();
  closeDb();
  return {
    dir,
    cleanup: () => {
      closeDb();
      for (const [key, value] of Object.entries(previous)) {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
      }
      resetServerEnvCache();
      fs.rmSync(dir, { recursive: true, force: true });
    },
  };
}
