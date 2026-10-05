/**
 * Structured server logging. One JSON line per event so logs can be grepped
 * or shipped as-is. Anything that looks like a credential is redacted before
 * it is written.
 */

type Level = "debug" | "info" | "warn" | "error";

const SECRET_KEY = /(key|token|secret|password|authorization|cookie)/i;
const SECRET_VALUE =
  /\b(sk-[A-Za-z0-9_-]{8,}|AIza[0-9A-Za-z_-]{20,}|gh[pousr]_[A-Za-z0-9]{20,})\b/g;

export function redact(value: unknown, depth = 0): unknown {
  if (depth > 4) return "[depth]";
  if (typeof value === "string") return value.replace(SECRET_VALUE, "[redacted]");
  if (Array.isArray(value)) return value.slice(0, 50).map((item) => redact(item, depth + 1));
  if (value instanceof Error) return { name: value.name, message: redact(value.message) };
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value)) {
      out[key] = SECRET_KEY.test(key) ? "[redacted]" : redact(item, depth + 1);
    }
    return out;
  }
  return value;
}

function write(level: Level, scope: string, message: string, fields?: Record<string, unknown>) {
  if (level === "debug" && !process.env["PULSEUI_DEBUG"]) return;
  if (process.env["VITEST"] && level !== "error") return;
  const line = JSON.stringify({
    t: new Date().toISOString(),
    level,
    scope,
    msg: message,
    ...(fields ? (redact(fields) as Record<string, unknown>) : {}),
  });
  if (level === "error" || level === "warn") process.stderr.write(`${line}\n`);
  else process.stdout.write(`${line}\n`);
}

export function logger(scope: string) {
  return {
    debug: (message: string, fields?: Record<string, unknown>) =>
      write("debug", scope, message, fields),
    info: (message: string, fields?: Record<string, unknown>) =>
      write("info", scope, message, fields),
    warn: (message: string, fields?: Record<string, unknown>) =>
      write("warn", scope, message, fields),
    error: (message: string, fields?: Record<string, unknown>) =>
      write("error", scope, message, fields),
  };
}
