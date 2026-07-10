# ChatPanel.tsx Accessibility Audit

## Overview

Audit of `/Users/sanjaywaradkar/ROADWATCH/frontend/src/components/chat/ChatPanel.tsx` (1723 lines) against WCAG 2.1 AA standards.

**Severity levels:**
- **CRITICAL** — Blocks core functionality for assistive-tech users
- **MAJOR** — Causes significant confusion or navigation barriers
- **MINOR** — Degrades experience but has workarounds

---

## 1. Missing aria-labels on Interactive Elements

### 1.1 Sync Now button (line 1301)
- **Severity: MAJOR**
- **Issue:** The "Sync Now" button inside the offline banner has no `aria-label`. Screen readers read only the inner text "Sync Now", which is acceptable for the text itself, but the button is small (9px font) and has the same `cursor-pointer` pattern as other buttons. The problem is it lacks any `aria-describedby` or context for the sync operation scope.
- **Fix:** Add `aria-label="Trigger manual sync of queued reports"` to describe the action explicitly.

### 1.2 Evidence accordion expand buttons (line 1391)
- **Severity: MINOR**
- **Issue:** Each evidence section header is a button with `aria-expanded` and `aria-controls`, but no `aria-label` distinguishing it from other evidence buttons. Screen readers announce just the title text, which works but could be improved.
- **Fix:** Add `aria-label="Toggle evidence section: {ev.title}"`.

### 1.3 Suggested action buttons inside chat messages (lines 1466-1477)
- **Severity: MAJOR**
- **Issue:** These buttons (e.g., "File Official Complaint", "Locate on Map") have no `aria-label`. They render icons (Plus, Navigation, FileSpreadsheet) alongside text, but the icon SVGs are not marked `aria-hidden`. Screen readers may read the icon alt text or nothing.
- **Fix:** Add `aria-label` matching the button label text, and `aria-hidden="true"` on the `lucide-react` icon elements.

### 1.4 Suggested prompt buttons (desktop, lines 1493-1499)
- **Severity: MAJOR**
- **Issue:** These buttons in the bottom action area display prompt text (e.g., "Why is S.V. Road damaged again?") but have no `aria-label`. The text content is present so screen readers will read it, but the buttons are very small (9.5px font) and serve as quick-action shortcuts with no visual context about what clicking them does.
- **Fix:** No explicit `aria-label` needed since the text content is descriptive, but add `aria-describedby` or `title` equivalents.

### 1.5 Mobile suggested prompt buttons (lines 1671-1680)
- **Severity: MAJOR**
- **Issue:** Same pattern as 1.4, duplicated for mobile. Identical issue.
- **Fix:** Same as 1.4.

### 1.6 Language selection buttons in Voice Mode (lines 1556-1567)
- **Severity: CRITICAL**
- **Issue:** Three buttons labeled "EN", "HI", "MR" have no `aria-label` or `aria-pressed` state. Screen readers announce "EN button", "HI button", "MR button" with no indication that these are language selectors, which one is currently active, or what they do. The `speechLanguage` state tracks the active selection but there is no `aria-current="true"` or `aria-pressed` on the active button.
- **Fix:** Add `aria-label="Switch to English"`, `aria-label="Switch to Hindi"`, `aria-label="Switch to Marathi"` and `aria-pressed={speechLanguage === lang.code}`.

### 1.7 Localized query suggestion buttons in Voice Mode (lines 1639-1650)
- **Severity: MINOR**
- **Issue:** These 2x2 grid buttons show sample queries in the selected language. They have text content that screen readers will pick up, but no `aria-label`.
- **Fix:** Add `aria-label` that includes the query text for screen reader clarity.

### 1.8 Mobile send button (lines 1702-1710)
- **Severity: MAJOR**
- **Issue:** The desktop send button (line 1524) has `aria-label="Send message"`, but the mobile send button at line 1702 is structurally identical but missing `aria-label`.
- **Fix:** Add `aria-label="Send message"` to the mobile submit button.

---

## 2. Missing role attributes

### 2.1 WaveformVisualizer SVG (lines 141-154)
- **Severity: MAJOR**
- **Issue:** The animated waveform SVG is purely decorative/ambient. It has no `role="presentation"` or `aria-hidden="true"`. Screen readers may try to interpret the SVG paths and announce meaningless path data. The SVG uses `<filter>` and `<defs>` which are also exposed.
- **Fix:** Add `aria-hidden="true"` and `role="presentation"` to the SVG element and its container `<div>`.

### 2.2 Decorative ping animation span (line 1065)
- **Severity: MINOR**
- **Issue:** The `<span>` with `animate-ping` on the floating toggle button creates a visual pulse effect. It has `className="absolute inset-0 rounded-full bg-cyan-400/30 animate-ping opacity-75 scale-105"` but no `aria-hidden="true"`.
- **Fix:** Add `aria-hidden="true"`.

### 2.3 Decorative animated typing indicator dots (lines 1361-1364)
- **Severity: MAJOR**
- **Issue:** Three bouncing `<span>` elements form a typing indicator when the assistant response is empty. These are purely decorative but not hidden from screen readers. Screen readers may announce "dot dot dot bouncing" or similar. Furthermore, there is no `role="status"` or `aria-label="Assistant is typing"` wrapping the container.
- **Fix:** Add `aria-hidden="true"` to each dot span. Wrap in a container with `role="status"` and `aria-label="Assistant is typing a response"`.

### 2.4 Animated pulse dot on evidence headers (line 1394)
- **Severity: MINOR**
- **Issue:** The pulsing dot before evidence section titles (`<span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />`) is decorative.
- **Fix:** Add `aria-hidden="true"`.

### 2.5 Chevron icon in evidence headers (line 1401)
- **Severity: MINOR**
- **Issue:** The `<ChevronDown />` icon in the evidence accordion button indicates expand/collapse state but is not hidden from screen readers.
- **Fix:** Add `aria-hidden="true"`.

### 2.6 "❯" decorative character in evidence list items (line 1422)
- **Severity: MINOR**
- **Issue:** The `❯` character before each evidence item is purely decorative but read aloud by screen readers.
- **Fix:** Add `aria-hidden="true"` to the `<span>` containing it.

### 2.7 Icon SVGs in suggested action buttons (lines 1471-1473)
- **Severity: MAJOR**
- **Issue:** Plus, Navigation, FileSpreadsheet, and ArrowRight icon components in action buttons are not marked `aria-hidden="true"`. Screen readers attempt to describe these icons.
- **Fix:** Add `aria-hidden="true"` to all decorative icon `<svg>` elements. For lucide-react components this means either wrapping them or using the component's passthrough props.

### 2.8 Decorative sparkles icon in header (line 1164)
- **Severity: MINOR**
- **Issue:** The `<Sparkles>` icon next to "ROADWATCH AI" heading is decorative.
- **Fix:** Add `aria-hidden="true"`.

### 2.9 Online/offline status dot (line 1171)
- **Severity: MINOR**
- **Issue:** The green/red status dot is purely visual. No `aria-hidden`.
- **Fix:** Add `aria-hidden="true"` and ensure the status is conveyed via text alternative (already partially done by the subtitle text on line 1178-1180).

---

## 3. Keyboard Navigation Problems

### 3.1 No focus trap for Voice Mode overlay (lines 1539-1654)
- **Severity: CRITICAL**
- **Issue:** When `isVoiceMode` is true, a full-screen overlay is rendered. The focus trap on line 167 is explicitly disabled for voice mode (`useFocusTrap(sheetRef, isOpen && mounted && !isVoiceMode, ...)`). There is no separate focus trap for the voice mode overlay. Users can Tab out of the voice mode overlay to background page elements, which violates WCAG 2.1.2 No Keyboard Trap (but actually, the issue is the *lack* of a trap means focus can escape).
- **Fix:** Implement a separate focus trap for the voice mode dialog container.

### 3.2 Evidence sections not keyboard accessible via collapse toggle (line 1386)
- **Severity: MINOR**
- **Issue:** The evidence accordion buttons ARE keyboard accessible (native `<button>` elements). However, the expanded content area (lines 1405-1429) uses `AnimatePresence` with `initial={false}` and motion divs that set `overflow: hidden`. Screen-reader and keyboard focus should ideally move to the first focusable item when expanded.
- **Fix:** Move focus to the expanded content region when it opens or close it.

### 3.3 Page scrolls behind mobile panel (line 1141)
- **Severity: MAJOR**
- **Issue:** The mobile chat panel uses `inset-x-0 top-0 h-screen` but does not prevent background page scrolling. Users on mobile can accidentally scroll content behind the panel. The focus trap prevents tab navigation out, but scroll-based exploration of background content is still possible for sighted keyboard users.
- **Fix:** Apply `overflow: hidden` to `<body>` when the chat is open on mobile.

### 3.4 OnboardingTour focus management (line 1718-1720)
- **Severity: MAJOR**
- **Issue:** When `showTour` is true, `<OnboardingTour>` is rendered with no focus trap. The tour modal may or may not handle its own focus - but the parent should not assume it does.
- **Fix:** The OnboardingTour component should implement its own focus trap. At minimum, ensure the close button is immediately focusable.

---

## 4. Focus Management Issues

### 4.1 Focus trap first-element focus (useFocusTrap.ts line 33)
- **Severity: MAJOR**
- **Issue:** The focus trap always focuses the first focusable element inside the container, which may be the close button — this could cause accidental panel closure on keyboard entry. The trap should focus the most logical initial element (the chat input, not the close button).
- **Fix:** In ChatPanel, the focus trap should prefer focusing the input field if available, rather than the first arbitrary focusable element. Consider passing a `defaultFocusRef` to the hook.

### 4.2 Focus not restored when Voice Mode closes
- **Severity: MAJOR**
- **Issue:** When closing voice mode (line 1571: `onClick={() => setIsVoiceMode(false)}`), focus is not programmatically returned to the "Launch Voice Mode" button (line 1243-1250).
- **Fix:** Save a ref to the voice mode trigger button and restore focus to it when voice mode closes.

### 4.3 Focus not restored when chat panel closes
- **Severity: MAJOR**
- **Issue:** The useFocusTrap hook restores focus to the previously focused element when the trap deactivates (line 69-70 of the hook). However, if the user closes the panel via the X button (line 1260), the hook's `isActive` becomes false, which triggers restoration. This is properly handled in the hook, but note that the `onEscape` callback calls `setIsOpen(false)` on the parent, which correctly triggers restoration. This works correctly in the current code.

### 4.4 No visible focus indicators on custom styled buttons
- **Severity: CRITICAL**
- **Issue:** Many buttons use `focus:outline-none` (lines 1060, 1583) which removes the default browser focus ring without providing a custom focus style. Tab-key users cannot see which element is focused.
- **Fix:** Replace `focus:outline-none` with `focus-visible:outline-2 focus-visible:outline-cyan-400 focus-visible:outline-offset-2`, or provide custom `focus-visible` styles on all interactive elements.

---

## 5. Screen Reader Issues

### 5.1 Evidence section heading not semantic (line 1376)
- **Severity: MAJOR**
- **Issue:** "Verification Evidence Logs" is rendered as a `<span>` element. It should be a heading (`<h3>` or `<h4>`) to establish proper document hierarchy for screen reader navigation. The overall heading "ROADWATCH AI" is an `<h3>` (line 1168), and messages follow at a flat level.
- **Fix:** Change `<span>` to `<h4>` with appropriate sizing classes.

### 5.2 WaveformVisualizer has no accessible name (lines 141-154)
- **Severity: MAJOR**
- **Issue:** The SVG waveform that visualizes listening/speaking/loading state has no accessible name. A screen reader user cannot determine what state is being conveyed by the visual animation.
- **Fix:** Add `role="img"` and `aria-label` describing the current state (e.g., "Listening waveform visualization" or "Speaking waveform visualization").

### 5.3 Voice mode status text not in a live region (lines 1617-1630)
- **Severity: MAJOR**
- **Issue:** The "Listening..." / "Voice Playback active" / "AI is compiling reply..." / "Scanner Standby" label (lines 1618-1625) and the current transcription text (lines 1627-1629) update dynamically but are not inside an `aria-live` region. Screen reader users will not hear state changes.
- **Fix:** Wrap the status text in `aria-live="polite"` region.

### 5.4 Loading / streaming state not announced (line 893)
- **Severity: MAJOR**
- **Issue:** When `isLoading` is set to true (line 893), there is no `aria-busy` attribute set on the messages container. Screen readers cannot determine that the assistant is generating a response.
- **Fix:** Set `aria-busy={isLoading}` on the messages container (line 1340).

### 5.5 Messages container lacks aria-busy for streaming state (line 1334)
- **Severity: MINOR**
- **Issue:** The `role="log"` container does not use `aria-busy` when the AI is streaming a response. Users of assistive technology cannot distinguish between a complete message and one that is still being typed out by the streaming effect.
- **Fix:** Set `aria-busy={isLoading}` on the messages container.

### 5.6 Offline/online status dot has no text alternative (line 1171)
- **Severity: MAJOR**
- **Issue:** The pulsing green dot (online) or red dot (offline) is purely visual. While the subtitle text (line 1178) provides some context, the dot itself is not hidden (`aria-hidden="true"`) and conveys state information visually only.
- **Fix:** Add `aria-hidden="true"` and ensure `role="status"` or visually hidden text conveys the connection state. The existing subtitle already says "Accredited Records Engine" or "Offline Queue Active", which partially addresses this.

### 5.7 Screen reader announcement timing (lines 228-232)
- **Severity: MAJOR**
- **Issue:** The `announcement` state cleared after 5 seconds via `setTimeout`. If a user is still reading/listening to a long response, the announcement may disappear before they finish. The `aria-live="polite"` region on line 1051 means screen readers announce changes, but clearing the text risks cutting off the announcement if the user's screen reader hasn't finished reading it yet.
- **Fix:** Instead of clearing the announcement text, use a unique key or timestamp-based update to trigger re-announcement without clearing.

---

## 6. Color Contrast Problems

### 6.1 `text-muted-foreground` on dark backgrounds (lines 1178, 1193, 1205, 1227, 1254, 1261, 1526)
- **Severity: MAJOR**
- **Issue:** If `text-muted-foreground` resolves to a light gray (e.g., `#64748b` / slate-500), on the `bg-slate-950` (nearly black, `#020617`) background the contrast ratio is approximately 4.0:1. This passes WCAG AA for normal text (4.5:1 minimum) for small text under 14px bold or 18px normal). For the 9px-11px text used in many of these locations, the effective contrast requirement is 4.5:1, and 4.0:1 fails.
- **Fix:** Ensure `text-muted-foreground` resolves to a lighter color (e.g., `#94a3b8` / slate-400) or use explicit `text-slate-400` for small UI text on dark backgrounds.

### 6.2 `text-[#55555f]` on `#050507` background in Voice Mode (lines 1562, 1611, 1635)
- **Severity: CRITICAL**
- **Issue:** The voice mode dialog uses `bg-[#050507]/98` (approximately `#050507`, near-black). Text in `text-[#55555f]` (medium gray) has a contrast ratio of approximately **3.3:1**, which fails WCAG AA for ALL text sizes (minimum 4.5:1 for normal text, 3:1 for large text). At `text-[7px]` and `text-[8.5px]` font sizes, this is well below the minimum.
- **Fix:** Change to `text-[#888]` or `text-slate-500` (`#64748b`) for a minimum 4.5:1 ratio on near-black.

### 6.3 `text-slate-350` on dark backgrounds (lines 1020, 1041, 1420, 1627, 1648)
- **Severity: MAJOR**
- **Issue:** If `slate-350` is approximately `#94a3b8` (slate-400) or lighter, it may pass. If it resolves to a darker value (e.g., `#64748b` / slate-500), at 9-11px font sizes on dark backgrounds it fails WCAG AA.
- **Fix:** Verify that `slate-350` is sufficiently light or use `text-slate-300` for small text on dark backgrounds.

### 6.4 `text-amber-400` on dark backgrounds (lines 1204, 1299 subtitle)
- **Severity: MAJOR**
- **Issue:** Amber-400 (`#fbbf24`) on near-black passes contrast requirements, but on `bg-amber-500/10` (very subtle amber tint), the contrast may drop. The "DEMO MODE" badge on line 1174 uses `text-amber-400 bg-amber-500/10 border-amber-500/30 px-1.5 py-0.5 rounded-full` - the text is 8px, very small.
- **Fix:** For very small text (under 12px), use `text-amber-300` on dark backgrounds to ensure adequate contrast.

### 6.5 Status icons in offline banner (lines 1286-1298)
- **Severity: MAJOR**
- **Issue:** WifiOff icon in `text-red-400` on `bg-red-500/10`, RefreshCw in `text-cyan-400` on `bg-cyan-500/10`, CloudUpload in `text-amber-400` on `bg-amber-500/10`. The icon contrast against the tinted background may be insufficient.
- **Fix:** Ensure icon colors have minimum 3:1 contrast against their tinted backgrounds.

### 6.6 Low-contrast placeholder text (lines 1516, 1698)
- **Severity: MINOR**
- **Issue:** Input placeholder "Ask about repairs, budgets, audits..." uses `placeholder-muted-foreground`. If `muted-foreground` is `#475569` (slate-600) on `bg-slate-900` (`#0f172a`), contrast is ~4.2:1 which passes WCAG AA for placeholder text (which has relaxed requirements). This is acceptable but could be improved.

### 6.7 Disabled state opacity (lines 1526, 1706)
- **Severity: MINOR**
- **Issue:** Disabled buttons use `opacity-40`, which further reduces the contrast of already-small text. While disabled states are exempt from strict contrast requirements, making them too faint hinders usability.
- **Fix:** Use `opacity-60` instead of `opacity-40`.

---

## Summary

| Category | Critical | Major | Minor | Total |
|----------|----------|-------|-------|-------|
| Missing aria-labels | 1 (1.6) | 6 | 2 | 9 |
| Missing role attributes | 0 | 3 | 6 | 9 |
| Keyboard navigation | 1 (3.1) | 2 | 1 | 4 |
| Focus management | 1 (4.4) | 3 | 0 | 4 |
| Screen reader issues | 0 | 5 | 1 | 6 |
| Color contrast | 1 (6.2) | 4 | 2 | 7 |
| **Total** | **4** | **23** | **12** | **39** |

**Four Critical issues to fix first:**
1. Language selector buttons in Voice Mode lack `aria-label` and `aria-pressed` (1.6)
2. Voice Mode overlay lacks focus trap (3.1)
3. Custom buttons remove focus outlines without providing replacements (4.4)
4. Low-contrast `#55555f` text on `#050507` background in Voice Mode (6.2)