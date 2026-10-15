/**
 * Fast, dependency-free component code review.
 *
 * These are heuristic warnings, NOT proof that the generated UI works.
 * The full application workflow will later be validated in a real browser.
 */
export type QualityDiagnostic = {
  id: "placeholder-link" | "inert-button" | "form-submit" | "unsafe-link" | "placeholder-copy";
  severity: "warning" | "error";
  message: string;
  occurrences: number;
};

function occurrences(source: string, pattern: RegExp): number {
  return [...source.matchAll(pattern)].length;
}

/** Does not execute generated code, load remote resources or claim runtime verification. */
export function auditComponentSource(source: string): QualityDiagnostic[] {
  if (!source.trim()) return [];
  const findings: QualityDiagnostic[] = [];

  const deadLinks = occurrences(source, /\bhref\s*=\s*["'](?:#|)["']/gi);
  if (deadLinks > 0) {
    findings.push({
      id: "placeholder-link",
      severity: "warning",
      message: "Placeholder links have no destination. Wire them to a real target or use an honest disabled state.",
      occurrences: deadLinks,
    });
  }

  const unsafeLinks = occurrences(source, /\bhref\s*=\s*["']javascript:/gi);
  if (unsafeLinks > 0) {
    findings.push({
      id: "unsafe-link",
      severity: "error",
      message: "JavaScript URL detected. Remove unsafe navigation URLs.",
      occurrences: unsafeLinks,
    });
  }

  // Heuristic: intentional no-op demo controls should explain why they are disabled.
  const buttonTags = source.match(/<button\b[^>]*>/gi) ?? [];
  const insideForm = /<form\b/i.test(source);
  const inertButtons = buttonTags.filter((tag) => {
    if (/\bonClick\s*=|\bonPointerDown\s*=|\bonMouseDown\s*=/i.test(tag)) return false;
    if (/\btype\s*=\s*["']submit["']/i.test(tag) && insideForm) return false;
    if (/\bdisabled\b/i.test(tag)) return false;
    return true;
  }).length;
  if (inertButtons > 0) {
    findings.push({
      id: "inert-button",
      severity: "warning",
      message: "Potentially inert buttons lack an action, submit behavior or explicit disabled state.",
      occurrences: inertButtons,
    });
  }

  const forms = source.match(/<form\b[^>]*>/gi) ?? [];
  const unhandledForms = forms.filter((tag) => !/\bonSubmit\s*=/i.test(tag)).length;
  if (unhandledForms > 0) {
    findings.push({
      id: "form-submit",
      severity: "warning",
      message: "Forms lack an onSubmit handler. Verify validation and actual submission behavior.",
      occurrences: unhandledForms,
    });
  }

  const unfinishedCopy = occurrences(source, /\b(?:lorem ipsum|coming soon|todo: implement)\b/gi);
  if (unfinishedCopy > 0) {
    findings.push({
      id: "placeholder-copy",
      severity: "warning",
      message: "Unfinished placeholder copy detected; confirm the feature is clearly labeled.",
      occurrences: unfinishedCopy,
    });
  }

  return findings;
}
