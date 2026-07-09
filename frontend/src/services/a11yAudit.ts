/**
 * a11yAudit — Runtime WCAG audit service
 *
 * Scans the active DOM for common accessibility violations and returns a
 * structured report.  Runs entirely on the client side with no external
 * dependencies.  All checks are best-effort — they catch a large fraction
 * of real-world violations but cannot replace a full axe-core / WAVE run.
 */

export type AuditSeverity = 'pass' | 'fail' | 'warning';

export interface AuditFinding {
  rule: string;
  severity: AuditSeverity;
  message: string;
  /** CSS selector targeting the offending element (if applicable) */
  selector?: string;
  /** Snippet of outerHTML for quick inspection */
  snippet?: string;
  /** WCAG success criterion reference */
  wcag?: string;
}

export interface AuditReport {
  timestamp: string;
  total: number;
  pass: number;
  fail: number;
  warning: number;
  findings: AuditFinding[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function trimSnippet(html: string, max = 160): string {
  if (html.length <= max) return html;
  return html.slice(0, max) + '...';
}

function selector(el: Element): string {
  if (el.id) return `#${CSS.escape(el.id)}`;
  const tag = el.tagName.toLowerCase();
  if (el.className && typeof el.className === 'string') {
    const cls = el.className.trim().split(/\s+/).slice(0, 2).map((c) => `.${CSS.escape(c)}`).join('');
    return `${tag}${cls}`;
  }
  return tag;
}

function addFinding(
  findings: AuditFinding[],
  severity: AuditSeverity,
  rule: string,
  message: string,
  wcag: string,
  el?: Element | null,
): void {
  findings.push({
    rule,
    severity,
    message,
    wcag,
    ...(el ? { selector: selector(el), snippet: trimSnippet(el.outerHTML) } : {}),
  });
}

// ---------------------------------------------------------------------------
// Individual checks
// ---------------------------------------------------------------------------

function checkAccessibleNames(findings: AuditFinding[]): void {
  // Interactive elements must have an accessible name
  const interactives = document.querySelectorAll<HTMLElement>(
    'button, a[href], input:not([type="hidden"]), select, textarea, [tabindex]:not([tabindex="-1"]), [role="button"], [role="link"], [role="tab"], [role="menuitem"]',
  );

  for (const el of interactives) {
    // Skip elements that are aria-hidden
    if (el.getAttribute('aria-hidden') === 'true') continue;

    const label = el.getAttribute('aria-label') ?? '';
    const labelledby = el.getAttribute('aria-labelledby');
    const title = el.getAttribute('title') ?? '';
    const textContent = (el.textContent ?? '').trim();

    const hasName = label.length > 0
      || (labelledby !== null && document.getElementById(labelledby) !== null)
      || title.length > 0
      || textContent.length > 0;

    if (!hasName) {
      addFinding(
        findings,
        'fail',
        'accessible-name',
        `Interactive element lacks an accessible name.`,
        'WCAG 4.1.2 (A)',
        el,
      );
    }
  }
}

function checkAltText(findings: AuditFinding[]): void {
  const images = document.querySelectorAll<HTMLImageElement>('img:not([role="presentation"])');
  for (const img of images) {
    const alt = img.getAttribute('alt');
    if (alt === null) {
      addFinding(
        findings,
        'fail',
        'alt-text-missing',
        'Image is missing the alt attribute.',
        'WCAG 1.1.1 (A)',
        img,
      );
    }
    // Empty alt is allowed for decorative images; warn on very long alt
    if (alt !== null && alt.length > 250) {
      addFinding(
        findings,
        'warning',
        'alt-text-long',
        `Alt text is ${alt.length} characters; consider keeping it concise.`,
        'WCAG 1.1.1 (A)',
        img,
      );
    }
  }
}

function checkFormLabels(findings: AuditFinding[]): void {
  const inputs = document.querySelectorAll<HTMLElement>(
    'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="reset"]), select, textarea',
  );

  for (const el of inputs) {
    // Skip aria-hidden
    if (el.getAttribute('aria-hidden') === 'true') continue;

    const id = el.getAttribute('id');
    const ariaLabel = el.getAttribute('aria-label') ?? '';
    const ariaLabelledby = el.getAttribute('aria-labelledby');
    const title = el.getAttribute('title') ?? '';

    let hasLabel = ariaLabel.length > 0
      || (ariaLabelledby !== null && document.getElementById(ariaLabelledby) !== null)
      || title.length > 0;

    // Check for a <label for="...">
    if (!hasLabel && id) {
      const labels = document.querySelectorAll(`label[for="${CSS.escape(id)}"]`);
      if (labels.length > 0) hasLabel = true;
    }

    // Check if wrapped in a <label>
    if (!hasLabel && el.closest('label') !== null) {
      hasLabel = true;
    }

    if (!hasLabel) {
      addFinding(
        findings,
        'fail',
        'form-label',
        'Form control has no associated label.',
        'WCAG 1.3.1 (A), 4.1.2 (A)',
        el,
      );
    }
  }
}

function checkHeadingHierarchy(findings: AuditFinding[]): void {
  const headings = document.querySelectorAll<HTMLElement>('h1, h2, h3, h4, h5, h6');
  let prevLevel = 0;

  for (const h of headings) {
    const level = parseInt(h.tagName[1], 10);
    // Check skip (e.g. h1 -> h3 without h2) — allow h1->h2 skip if first heading
    if (prevLevel > 0 && level > prevLevel + 1) {
      addFinding(
        findings,
        'fail',
        'heading-skip',
        `Heading level jumps from h${prevLevel} to h${level} without an h${prevLevel + 1} in between.`,
        'WCAG 1.3.1 (A), 2.4.6 (AA)',
        h,
      );
    }

    // Warn if h1 appears after the first heading
    if (prevLevel > 0 && level === 1) {
      addFinding(
        findings,
        'warning',
        'heading-multiple-h1',
        'More than one h1 found on the page.',
        'WCAG 1.3.1 (A)',
        h,
      );
    }

    prevLevel = level;
  }

  if (headings.length === 0) {
    addFinding(
      findings,
      'warning',
      'heading-missing',
      'No heading elements (h1-h6) found on the page.',
      'WCAG 1.3.1 (A), 2.4.6 (AA)',
    );
  }
}

function checkContrast(findings: AuditFinding[]): void {
  // Simplified heuristic: flag elements with inline colour styles that are
  // likely to fail contrast (low-contrast pairings).  Full luminance
  // computation requires Canvas which can be heavy; this catches the most
  // egregious cases.
  const elements = document.querySelectorAll<HTMLElement>('[style*="color"], [style*="background"]');
  const LOW_LUM = ['#fff', '#ffffff', 'white', '#000', '#000000', 'black', '#888', '#999'];

  for (const el of elements) {
    const style = el.style;
    // Flag if both fg and bg are set inline and are both light or both dark
    if (style.color && style.backgroundColor) {
      const c = style.color.toLowerCase().trim();
      const bg = style.backgroundColor.toLowerCase().trim();
      const cLow = LOW_LUM.includes(c);
      const bgLow = LOW_LUM.includes(bg);
      if ((cLow && bgLow) || (!cLow && !bgLow && c !== 'transparent' && bg !== 'transparent')) {
        // Both light or both dark — likely insufficient contrast
        addFinding(
          findings,
          'warning',
          'inline-contrast',
          `Inline styles set colour "${style.color}" on background "${style.backgroundColor}" — may fail contrast ratio.`,
          'WCAG 1.4.3 (AA)',
          el,
        );
      }
    }
  }
}

function checkFocusIndicators(findings: AuditFinding[]): void {
  // Focusable elements should not rely on `outline: none` without a visible replacement
  const focusable = document.querySelectorAll<HTMLElement>(
    'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"]), [contenteditable]',
  );

  for (const el of focusable) {
    const computed = getComputedStyle(el);
    const outlineWidth = parseFloat(computed.outlineWidth);
    const outlineStyle = computed.outlineStyle;
    const outlineColor = computed.outlineColor;

    // Detect `outline: none` or very subtle outline
    const hasNoOutline = outlineStyle === 'none' || outlineWidth === 0;
    // Detect transparent or fully matching background — heuristic
    const likelyTransparent = outlineColor === 'transparent' || outlineColor === 'rgba(0, 0, 0, 0)';

    if (hasNoOutline || likelyTransparent) {
      // Check if there's a fallback (box-shadow, border)
      const borderWidth = parseFloat(computed.borderTopWidth);
      const boxShadow = computed.boxShadow;
      const hasFallback = borderWidth > 1 || (boxShadow && boxShadow !== 'none');

      if (!hasFallback) {
        addFinding(
          findings,
          'fail',
          'focus-indicator',
          `Focusable element has no visible focus indicator (outline removed without replacement).`,
          'WCAG 2.4.7 (AA)',
          el,
        );
      }
    }
  }
}

function checkAriaLandmarks(findings: AuditFinding[]): void {
  const landmarkRoles = ['banner', 'navigation', 'main', 'complementary', 'contentinfo', 'search', 'form', 'region'];

  for (const role of landmarkRoles) {
    const count = document.querySelectorAll(`[role="${role}"]`).length;

    if (role === 'main' && count === 0) {
      // Check for <main> element as alternative
      if (document.querySelectorAll('main').length === 0) {
        addFinding(
          findings,
          'fail',
          'landmark-main',
          'Page has no landmark with role="main" and no <main> element.',
          'WCAG 1.3.1 (A)',
        );
      }
    }

    if (role === 'navigation' && count === 0) {
      if (document.querySelectorAll('nav').length === 0) {
        addFinding(
          findings,
          'warning',
          'landmark-nav',
          'Page has no landmark with role="navigation" and no <nav> element.',
          'WCAG 1.3.1 (A), 2.4.1 (A)',
        );
      }
    }

    if (role === 'banner' && count === 0) {
      addFinding(
        findings,
        'warning',
        'landmark-banner',
        'No landmark with role="banner" found.',
        'WCAG 1.3.1 (A)',
      );
    }

    if (role === 'contentinfo' && count === 0) {
      addFinding(
        findings,
        'warning',
        'landmark-contentinfo',
        'No landmark with role="contentinfo" found.',
        'WCAG 1.3.1 (A)',
      );
    }
  }

  // Regions with accessible names should have a unique name
  const regions = document.querySelectorAll<HTMLElement>('[role="region"]');
  const ariaLabelCounts = new Map<string, number>();

  for (const r of regions) {
    const label = r.getAttribute('aria-label') ?? r.getAttribute('title') ?? '';
    if (label) {
      ariaLabelCounts.set(label, (ariaLabelCounts.get(label) ?? 0) + 1);
    }
  }

  for (const [label, count] of ariaLabelCounts) {
    if (count > 1) {
      addFinding(
        findings,
        'warning',
        'landmark-duplicate-label',
        `Region "${label}" appears ${count} times — consider using unique labels for each region.`,
        'WCAG 1.3.1 (A)',
      );
    }
  }
}

function checkAriaHidden(findings: AuditFinding[]): void {
  // Elements with aria-hidden="true" should not contain focusable content
  const hiddenContainers = document.querySelectorAll<HTMLElement>('[aria-hidden="true"]');
  for (const container of hiddenContainers) {
    const focusableInside = container.querySelector<HTMLElement>(
      'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    if (focusableInside) {
      addFinding(
        findings,
        'fail',
        'aria-hidden-focusable',
        'Element with aria-hidden="true" contains focusable content.',
        'WCAG 4.1.2 (A)',
        focusableInside,
      );
    }
  }
}

function checkDuplicateIds(findings: AuditFinding[]): void {
  const idMap = new Map<string, Element[]>();
  const allElements = document.querySelectorAll<HTMLElement>('[id]');
  for (const el of allElements) {
    const id = el.getAttribute('id')!;
    if (!idMap.has(id)) {
      idMap.set(id, [el]);
    } else {
      idMap.get(id)!.push(el);
    }
  }

  for (const [id, elements] of idMap) {
    if (elements.length > 1) {
      addFinding(
        findings,
        'fail',
        'duplicate-id',
        `Duplicate id "${id}" found on ${elements.length} elements.`,
        'WCAG 4.1.1 (A)',
        elements[1],
      );
    }
  }
}

// ---------------------------------------------------------------------------
// Main audit entry point
// ---------------------------------------------------------------------------

/**
 * Run a full WCAG audit on the current DOM.
 *
 * @returns A structured report with pass/fail/warning counts and all findings.
 */
export function runA11yAudit(): AuditReport {
  const findings: AuditFinding[] = [];

  // Run all checks — order doesn't matter for correctness but groups pass/fail
  checkAccessibleNames(findings);
  checkAltText(findings);
  checkFormLabels(findings);
  checkHeadingHierarchy(findings);
  checkContrast(findings);
  checkFocusIndicators(findings);
  checkAriaLandmarks(findings);
  checkAriaHidden(findings);
  checkDuplicateIds(findings);

  const pass = findings.filter((f) => f.severity === 'pass').length;
  const fail = findings.filter((f) => f.severity === 'fail').length;
  const warning = findings.filter((f) => f.severity === 'warning').length;

  return {
    timestamp: new Date().toISOString(),
    total: findings.length,
    pass,
    fail,
    warning,
    findings,
  };
}