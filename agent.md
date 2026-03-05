# AI Agent Context Log (agent.md)

This file contains context, historical decisions, and bug-fix notes specifically written for future AI Agents. When working on this project (`seo_checker`), please review this file to avoid repeating past mistakes.

## 1. Core Web Vitals (CWV) Scanning
- **Issue:** Previously, Cumulative Layout Shift (CLS), Largest Contentful Paint (LCP), and Total Blocking Time (TBT) metrics were always returning 0 or empty values. 
- **Cause:** Using `performance.getEntriesByType` synchronously inside `page.evaluate()` after the page loaded failed to capture metrics that require real-time observers during the page lifecycle.
- **Solution:** We now inject a `PerformanceObserver` using `page.evaluateOnNewDocument()` *before* navigation occurs. The observer captures `largest-contentful-paint`, `layout-shift`, and `longtask` in real-time and stores the data in `window.__cwv`.
- **Warning:** Do NOT revert to `performance.getEntriesByType` for CWV. Ensure `window.__cwv` is always read after navigation completes with a slight delay. (`src/app/api/scan/route.ts`)

## 2. Responsive Layout Scanning
- **Issue 1 (False Penalties):** The scanner used to compare the raw count of `nav` and `content` elements between Desktop and Mobile. If the difference was > 30%, it penalized the score. This incorrectly penalized standard responsive designs (e.g., hamburger menus or hidden sidebars).
- **Issue 2 (Tap Targets):** The scanner evaluated the size of interactive elements (buttons, links) even if they were visually hidden (`display: none`, `visibility: hidden`, `opacity: 0`) on mobile, leading to false tap-target warnings.
- **Issue 3 (Horizontal Scroll):** Only checking `document.documentElement.scrollWidth` failed to detect some horizontal overflows.
- **Solution & Rules Established:** 
    - Horizontal scroll checks MUST evaluate BOTH `document.documentElement` and `document.body`.
    - Tap targets MUST only be evaluated if `window.getComputedStyle(el)` confirms they are visibly rendered on screen (`display !== 'none'`, `opacity > 0`, etc.).
    - **Element Consistency Threshold:** The element count comparison was re-introduced but with a much more lenient **50% difference threshold** (`desktopTotal * 0.5`). 
- **Critical Bug Fixed:** In one interaction, the `elementConsistency` property was entirely removed from `route.ts`, which caused the frontend `ResponsiveSection.tsx` to crash (`Cannot read properties of undefined (reading 'hiddenOnMobile')`). 
    - **Takeaway:** Always ensure changes to API return types (`ResponsiveResult`) in `route.ts` are immediately mirrored in the frontend components (e.g., `src/components/sections/ResponsiveSection.tsx`). The property has since been restored with the 50% threshold logic.

## 3. Design vs Website Visual Comparison Feature
- **Implementation:** Added a feature to bypass standard SEO scanning and perform a visual regression test (`pixelmatch`).
- **Dependencies:** Uses `pixelmatch`, `pngjs`, and `sharp`. 
- **API Route:** `src/app/api/compare/route.ts`.
- **Logic:** 
    - The API uses `sharp` to determine the exact Width and Height of the uploaded design mockup.
    - Puppeteer MUST initialize the viewport to these exact dimensions (`page.setViewport({ width: designWidth, height: designHeight })`).
    - The Puppeteer screenshot must be clipped exactly to those dimensions (`clip: { x: 0, y: 0, width: designWidth, height: designHeight }`).
    - The diff image (`diffBase64`) and Similarity Score are calculated and sent back to the client (`page.tsx`) where they are rendered in a 3-column UI layout.
    - **Note:** `similarityScore` returns a rounded integer (`Math.round`) to offer cleaner UX, avoiding long decimals.
- **Warning:** A TypeScript error occurred when defining the Puppeteer browser instance (`let browser: puppeteer.Browser | null = null;`) because the namespace couldn't be resolved.  
    - **Takeaway:** Always import `Browser` directly: `import puppeteer, { Browser } from "puppeteer-core";` and use `let browser: Browser | null = null;`.

## 4. Adaptive SPA Wait (Post-Navigation Settle)
- **Issue:** The Puppeteer evaluation started immediately after `domcontentloaded`, causing extremely dynamic applications (SPAs built with React/Vue or using lazy-loaded image components) to be captured partially rendered, skewing visual and responsive scores.
- **Previous Solution:** A hard 8-second wait was applied to ALL sites. This wasted time on static sites that settle instantly.
- **Current Solution:** An adaptive wait detects SPA frameworks (React, Vue, Next.js, Angular, Svelte) via `window` globals and DOM markers. SPA sites wait `SPA_SETTLE_MS` (4s); static sites wait `STATIC_SETTLE_MS` (2s).
- **Guidance:** SPA detection runs via `page.evaluate()` checking `window.__NEXT_DATA__`, `window.React`, `window.Vue`, `window.angular`, `document.querySelector('[ng-version]')`, etc. If a new SPA framework gains popularity, add its detection fingerprint to the `isSPA` evaluation. Do NOT reduce `SPA_SETTLE_MS` below 3s — hydration needs time.

## 5. Application Description Update
- **Change:** The hero text in `src/app/page.tsx` was updated from *"a web analyzer tool to analyze any website..."* to *"An advanced web analyzer to validate SEO compliance, overall quality, and pixel-perfect design accuracy."* to reflect the new visual comparison capabilities comprehensively.

## 6. CSS Methodology and Styling Rules
- **Convention:** This project exclusively uses the **BEM (Block Element Modifier)** methodology for component styling. 
- **Rule:** Do **NOT** use inline React styles (`style={{ ... }}`) for structural or thematic styling. Hardcoded styles create maintenance debt. 
- **Action:** If a new component or UI block is created, define its classes (e.g., `.compare-card`, `.compare-card__header`). Inline styles are ONLY permitted for highly dynamic calculations (e.g., `style={{ width: progress + '%' }}`).
- **Precedence Warning:** Next.js loads `globals.css` BEFORE component-specific stylesheets like `page.css` in `layout.tsx`. Always place new BEM classes in their specific stylesheet (e.g. `page.css` for `page.tsx` elements) to prevent them from being overridden by existing scoped rules.

## 7. Dynamic State Snapshotting
- **Issue:** Previously, substituting the image on the `<input type="file">` form dynamically mutated the image rendered in the established validation results view because the UI relied directly on React's `designImage` binding.
- **Solution:** Endpoints like `/api/compare` that process user inputs map their payload back to the response object (`originalDesignImage`).
- **Rule:** Results UI elements should always default to deriving states from the JSON response (`result.originalDesignImage || designImage!`) rather than raw input hooks. This guarantees "frozen" snapshots that remain accurate even if inputs change. 

## 8. State-driven UI Animation Standards
- **Issue:** Changing button text "Scan" to "Compare" instantly caused a harsh layout jump as React aggressively swapped the DOM nodes.
- **Solution:** Stateful button swaps were wrapped inside a Framer Motion `<AnimatePresence mode="wait">` component, paired with `<motion.span>` tags. 
- **Rule:** Any conditional component mounting/unmounting that changes layout (like changing button text, or toggling a feature block) MUST be animated via `framer-motion` to maintain the premium application aesthetic. Use `mode="wait"` to prevent overlapping elements during exit and entry cycles.

## 9. Dynamic Component Configuration
- **Issue:** The `page.tsx` loading state historically rotated through a fixed array of progress strings ("Analyzing SEO...", "Checking Links...", etc.), which created a disjointed experience if those features were deactivated in `scanner.config.json`.
- **Solution:** Loading arrays are now built dynamically by reading `Object.entries(scannerConfig.features)` and mapping enabled features to a generic message payload dictionary. 
- **Rule:** Do NOT rely on static "hardcoded" arrays for feature workflows that are inherently toggleable by user configuration JSONs. Component states should map dynamically to their config source of truth.

## 10. Document Verification Exports (Data-Driven Priority)
- **Issue:** Generating downloadable PDF reports using client-side canvas snapshots (`html2canvas`) preserved CSS aesthetics, but severely compromised file accessibility, size, and readability as the report payload increased.
- **Solution:** Integrated direct `jsPDF` text-mapping logic to construct multi-page string-based documents. We read the `result` validation object and print values iteratively (e.g. `pdf.text()`) rather than taking pictures of the DOM. 
- **Rule:** If tasked with generating PDF document exports, BIAS STRONGLY TOWARDS Data-Driven Text Mapping rather than Visual Snapshotting. Extract raw state objects and print them cleanly. Do not use canvas parsers unless the core feature fundamentally requires image processing (e.g., drawing tools).

## 11. Contextual Action Binding
- **Issue:** The "Download PDF" action was originally placed functionally alone at the very bottom of the results page (generic report footer), which felt disconnected from the primary analytical cards (Overall Score / Design Match Verification).
- **Rule:** Interactive export or transition buttons MUST be visually bound directly beneath the active element driving that context. For example, if a user conducts a Scan, attach the "Download Report" CTA directly below the "Overall Score" dashboard context block, rather than floating it generically at the bottom of the parent layout tree.

## 12. Hybrid Component Data Fallbacks
- **Issue:** Extracted reports generated during "Compare" mode yielded `undefined` URLs and `Invalid Date` strings because the `/api/compare` endpoint does not return `url` or `scanDate` keys like `/api/scan` does.
- **Solution:** Configured `downloadPDF` to fall back on parent-level React hook states if standard result keys are missing (e.g. `const targetUrl = result.url || url;`).
- **Rule:** If a single UI component or logic handler processes responses from *multiple* API structures, you must strictly implement logical `||` fallbacks or conditional existence checks for metadata properties to prevent `undefined` variables bleeding into physical exports or user views.

## 13. Vercel Serverless Function Limits (Payload Compression)
- **Issue:** Full-page website screenshots and large Pixelmatch arrays were generating extreme `data:image/png;base64` lengths that violated Vercel's strict 4.5MB Serverless Function response limits, crashing the API (`FUNCTION_PAYLOAD_TOO_LARGE`).
- **Solution:** Added `sharp` to both `/api/scan` and `/api/compare` to heavily compress generated buffers down to `webp({ quality: 60-70 })` format and bounded maximum resolution widths (e.g., 800px or 1200px) before `base64` stringification. 
- **Rule:** Do NOT return raw, uncompressed PNG buffers containing DOM renders or screenshots directly to the Next.js Client. Always funnel the buffer through a `sharp` downscaler/`webp` converter first, and set hard loop limits on arrays of images (e.g., `maxLimit: 3` for accessibility issue snapshots) to strictly preserve bandwidth.

## 14. Compare Viewport Scaling & Animations
- **Issue:** Using `page.screenshot({ fullPage: true })` on tall UI designs forces Puppeteer to quietly mutate the underlying viewport to the page's actual `scrollHeight` right before capture. This silently breaks any `100vh` responsive DOM layouts. Furthermore, fast-scrolling triggers Intersection Observers (like AOS, WOW.js, Elementor Invisible) which immediately hide lower elements in the DOM when the camera snaps back to the top.
- **Solution:** Forcefully inject a global `page.addStyleTag()` CSS script to disable `animation` and `transition`, while forcing `opacity: 1 !important` on known hidden plugin classes (e.g. `[data-aos]`). Use `window.scrollTo({ top: 0, behavior: "instant" })` instead of a hard origin snap, and replace `fullPage` with `{ clip, captureBeyondViewport: true }`.
- **Rule:** Never use `fullPage: true` for Compare functionalities, as it stealthily destroys ratio integrity for `100vh` elements. Instead, utilize `clip: { captureBeyondViewport: true }`. You must also kill CSS transitions globally to preempt "vanishing component" bugs triggered by lazy-load UI frameworks.

## 15. Modular Architecture & Component Decomposition
- **Refactor:** `src/app/page.tsx` was decomposed from a 753-line monolith into a ~170-line thin orchestrator that delegates all logic and rendering to dedicated modules.
- **Architecture:**
  - **Types** (`src/types/scan.ts`): Shared `SECTION_KEYS` constant and `SectionKey` type used across hooks, configs, and components.
  - **Config** (`src/config/`): `scanMessages.ts` for loading message arrays built from `scanner.config.json`; `sectionRegistry.ts` for data-driven section metadata (icon, title, label, component, scoring).
  - **Hooks** (`src/hooks/`): `useScan.ts` (scan execution, loading, progress, AbortController), `useDesignImage.ts` (file upload handling), `useSections.ts` (open/close state, scroll-into-view).
  - **Utilities** (`src/utils/downloadPDF.ts`): PDF generation extracted as a standalone async function.
  - **Components** (`src/components/home/`): `SearchForm`, `LoadingState`, `ErrorState`, `ScanScoreCard`, `CompareResult`, `ScoresGrid`, `SectionsGrid`, with barrel export via `index.ts`.
- **Rules:**
  - Page-level files (`page.tsx`) MUST remain thin orchestrators under 200 lines. Extract business logic to custom hooks, configuration to config files, and UI to focused components.
  - To add a new scan section: edit ONLY `src/config/sectionRegistry.ts` and `src/types/scan.ts` (add key). Do NOT hardcode JSX blocks in `page.tsx`.
  - To add a new loading message: edit ONLY `src/config/scanMessages.ts` `featureMessagesMap`. Do NOT hardcode message arrays in component files.
  - Custom hooks must be self-contained — all state, refs, and callbacks related to a single concern live in one hook.
  - Component directories with 3+ exports MUST have a barrel export (`index.ts`) for clean imports.
  - Component props should use explicit TypeScript interfaces, not bare `any`. The `any` eslint-disable is allowed only at result-level pass-through boundaries.
  - The `sectionRegistry` pattern (data-driven component rendering) should be the default approach for any feature that renders a dynamic list of similar UI blocks.

## 16. Scan Pipeline Performance Optimizations
- **Context:** The scan API (`src/app/api/scan/route.ts`) was taking 30-50s due to sequential operations. Five high-priority optimizations were applied to reduce total scan time by ~40-60%.
- **Named Constants:** All magic numbers (timeouts, batch sizes, delays) are now extracted to named constants at the top of `route.ts` (e.g., `NAV_TIMEOUT_MS`, `SPA_SETTLE_MS`, `LINK_CHECK_BATCH_SIZE`). When tuning performance, modify ONLY these constants — never inline magic numbers.
- **Optimizations Applied:**

  1. **Adaptive SPA Wait** (see Section 4): Replaced fixed 8s delay with framework-aware 4s/2s wait. Saves 4-6s on static sites.

  2. **Single-Pass Lazy-Load Scroll:** Replaced incremental scroll (50ms intervals × N steps) with a single `scrollTo(0, scrollHeight)` → wait `LAZY_SCROLL_SETTLE_MS` (800ms) → `scrollTo(0, 0)`. This triggers all IntersectionObserver entries in one jump. Saves ~2-3s on long pages.

  3. **Batched Link Checking (Promise.allSettled):** Links are now checked in batches of `LINK_CHECK_BATCH_SIZE` (10) using `Promise.allSettled()` instead of a single `Promise.all()` of 30. Benefits: (a) one hung request doesn't block the entire batch, (b) avoids hammering target servers with 30 simultaneous requests, (c) results are always captured even if individual requests fail.

  4. **Reduced Screenshot Delay:** Accessibility per-element screenshot delay reduced from 150ms to `SCREENSHOT_SETTLE_MS` (50ms). Total saving: ~1.2s for 12 screenshots.

  5. **Parallel CWV Measurement:** The Core Web Vitals dedicated page is now launched immediately after the main page navigation settles (before SEO/heading/image checks begin). It runs concurrently with ALL other scan sections. The `cwvPromise` is awaited just before score aggregation. This hides the entire CWV navigation + measurement time (~7-8s) behind the main scan work. The dedicated page is still necessary because PerformanceObserver data gets contaminated by our evaluate()/scroll/highlight operations on the main page.

- **Rules:**
  - Never remove the dedicated CWV page — main page PerformanceObserver data is contaminated by scan operations.
  - Always use `Promise.allSettled()` for external network calls (link checking, sitemap fetching) — never `Promise.all()` which fails-fast on any rejection.
  - Constants are the single source of truth for timing — never hardcode timeouts in the scan body.

## 17. Accuracy Improvements (Medium Priority — Implemented)
Four accuracy improvements were applied to reduce false positives/negatives and improve scoring fidelity:

1. **Link Checking GET Fallback:** When a HEAD request returns 400+/0, the scanner now retries with GET (`LINK_CHECK_GET_TIMEOUT_MS` = 4s). This eliminates false dead-link reports from servers that reject HEAD requests (e.g., Cloudflare WAFs, some CDNs that return 403/405 for HEAD but 200 for GET). The GET retry is per-link and only fires when HEAD fails.

2. **Weighted Accessibility Scoring:** The flat `100 - categories * 20` formula was replaced with element-count-proportional scoring. Each category has a weight (`A11Y_WEIGHT_*`) and a cap (`A11Y_CAP_*`):
   - Images without alt: up to 30pt penalty, scales 1→20 elements
   - Links without text: up to 25pt penalty, scales 1→15 elements
   - Buttons without label: up to 25pt penalty, scales 1→10 elements
   - Inputs without label: up to 20pt penalty, scales 1→10 elements
   - This means 1 image without alt = 1.5pt penalty, while 20+ = full 30pt. Previously, ANY count in a category was always 20pt.

3. **CWV Throttled Mode:** Added optional `cwvThrottle` flag in `scanner.config.json`. When `true`, applies 4× CPU slowdown and simulated Fast 3G (1.6 Mbps / 750 Kbps / 150ms RTT) via Chrome DevTools Protocol on the CWV dedicated page. Default is `false` (unthrottled) for speed. Enable for Lighthouse-comparable mobile scoring.

4. **Structured Data: Microdata + RDFa Detection:** The structured data section now detects three formats:
   - **JSON-LD** (`<script type="application/ld+json">`) — existing
   - **Microdata** (`[itemscope]` + `[itemtype]` + `[itemprop]`) — NEW
   - **RDFa** (`[typeof]` + `[property]`) — NEW
   - Each schema entry now includes a `source` field ("JSON-LD", "Microdata", "RDFa") shown in the UI badge. The `StructuredDataResult.schemas` interface was extended with `source: string`. The empty-state message was updated from "No JSON-LD found" to include all three formats.

- **Rules:**
  - Always retry failed link checks with GET before marking dead — never mark a link dead based on HEAD alone.
  - Accessibility weights/caps are named constants — tune `A11Y_WEIGHT_*` and `A11Y_CAP_*` to adjust severity.
  - When adding new structured data formats, add a `source` identifier and update both `route.ts` and `StructuredDataSection.tsx`.

## 18. Scan History & Score Deltas
- **Implementation:** Scan results are saved to `localStorage` (max 20 entries, FIFO eviction). Each entry stores URL, timestamp, overall + per-section scores, and the *previous* scan's scores for the same URL.
- **Architecture:**
  - `src/hooks/useScanHistory.ts` — `addEntry()`, `getScoreDeltas()`, `clearHistory()` methods.
  - `src/components/home/RecentScans.tsx` — Shows last 5 scanned URLs below the search form with scores, relative timestamps, and delta badges. Click to re-scan.
  - `src/components/home/ScanScoreCard.tsx` — `overallDelta` prop shows ↑↓ badge vs previous scan.
  - `src/components/ui/MiniScore.tsx` — `delta` prop shows per-section ↑↓ badges.
  - `src/components/home/ScoresGrid.tsx` — `sectionDeltas` prop passed through from history hook.
- **Rules:**
  - History is saved ONLY after the scan is fully complete (`!streaming`) and the result has `overallScore`.
  - Compare mode results (diffImage) are NOT saved to history.
  - `previousOverallScore` and `previousSectionScores` are captured from the existing entry before it's replaced — this preserves exactly one level of delta history.
  - History is cleared manually via the trash icon in the RecentScans component.

## 19. Progressive Result Streaming (SSE)
- **Problem:** The scan API (`/api/scan`) took 15-50s to complete. Users saw nothing until the entire scan finished.
- **Solution:** The scan API now returns a `ReadableStream` with Server-Sent Events (SSE). Each scan section emits its result immediately upon completion, and the client renders sections progressively.
- **Server-side (`src/app/api/scan/route.ts`):**
  - Validation (rate limit, SSRF, body parse) runs BEFORE the stream starts — errors return standard `NextResponse.json()`.
  - Scan logic is wrapped in `new ReadableStream({ async start(controller) { ... } })`.
  - `emit(type, payload)` helper enqueues SSE events: `status`, `section`, `screenshot`, `complete`, `error`.
  - 13 `emit("section", ...)` calls inserted after each scan section completes.
  - Response uses `Content-Type: text/event-stream` with `no-cache` headers.
- **Client-side (`src/hooks/useScan.ts`):**
  - Scan mode uses `fetch().body.getReader()` to read the stream incrementally.
  - A `TextDecoder` + buffer splits on `\n\n` to parse SSE events.
  - `result` state is progressively built via `setResult(prev => ({ ...prev, [key]: data }))`.
  - New states: `streaming` (boolean), `streamStatus` (string from status events).
  - Compare mode (`designImage` present) still uses traditional JSON fetch.
- **UI behavior during streaming:**
  - `LoadingState` is hidden once the first section arrives (`showLoading = loading && !result`).
  - `ScanScoreCard` shows score ring at 0 with "Scanning..." badge during streaming.
  - PDF download button is hidden during streaming.
  - Section cards and mini-score badges appear one by one as they stream in.
  - Footer is hidden during streaming.
- **Rules:**
  - NEVER switch Compare mode to streaming — it uses a different endpoint.
  - The `emit()` function is wrapped in try-catch — if the stream is closed early (client abort), the server continues silently.
  - Error events close the stream; the client shows the error message.

## 20. Enhanced PDF Report (Text-Based)
- **Enhancement:** The PDF report now includes per-section detail metrics beyond just the score number.
- **Section details include:**
  - **SEO:** Title value/length, description value/length, canonical URL, issue count
  - **Headings:** H1 count, total headings
  - **Images:** Total/with-alt/without-alt/broken counts
  - **Links:** Total/internal/external counts, broken links list
  - **Performance:** Load time, page size, DOM elements, top recommendation
  - **Core Web Vitals:** LCP/CLS/TBT values with ratings
  - **Accessibility:** Per-category issue counts (images, links, buttons, inputs)
  - **Security:** HTTPS status, missing headers list
  - **Responsive:** Responsive status, viewport meta, tap target issues
  - **Structured Data:** Schema types found with sources
  - **Tech Stack:** Technology names and versions (up to 12)
- **Layout improvements:** Color-coded score values (green/yellow/red), divider lines between sections, overall issue summary, branded footer.
- **Architecture:** `sectionDetails` map in `downloadPDF.ts` — each key maps to a writer function that extracts and formats section-specific data. Generic fallback shows issue count for sections without a dedicated writer.
- **Rule:** PDF export MUST remain text-based (jsPDF text-mapping). Do NOT use html2canvas or visual snapshotting. See §10.

## 22. Medium-Priority UX Improvements (Implemented)

### 22a. Language Fix — Indonesian → English
Replaced 15 Indonesian text remnants across 4 component files and `route.ts`:
- `ImagesSection.tsx`: `"(tidak ada)"` → `"(none)"`, "Menampilkan" → "Showing", "Tidak ada gambar" → "No images"
- `LinksSection.tsx`, `AccessibilitySection.tsx`: "Menampilkan" / "Tidak ada item" → English equivalents
- `ScreenshotGallery.tsx`: "Klik untuk memperbesar" → "Click to enlarge"
- `route.ts` (7 screenshot labels): "tanpa alt text", "gambar broken", "button tanpa label", etc. → English

### 22b. Enhanced Error States
- **`src/types/scan.ts`** — Added `ScanError` interface: `{ type: "network" | "timeout" | "invalid-url" | "unreachable" | "server" | "unknown"; message: string }`
- **`src/hooks/useScan.ts`** — `error` state changed from `string | null` to `ScanError | null`; errors classified by AbortError name, TypeError instance, HTTP status, and message keywords
- **`src/components/home/ErrorState.tsx`** — Accepts `ScanError`; renders per-type icon (WifiOff/Clock/Link2/Globe/ServerCrash/XCircle), title, and `suggestion` text
- **`src/styles/page.css`** — Added `.error-card__suggestion` class
- **Rule:** Error classification runs in both SSE HTTP error path (`!res.ok`) and the catch block. Never show raw error messages without classification.

### 22c. WelcomeState Component (Empty State)
- **`src/components/home/WelcomeState.tsx`** — Shown when `!loading && !result && !error`. Contains feature pills (SEO Meta, Performance, Security, Images, Core Web Vitals, Accessibility), subtitle, and example URL quick-scan buttons (stripe.com, github.com, vercel.com).
- Barrel-exported via `src/components/home/index.ts`.
- **Hydration fix:** Both `motion.div` elements use `initial={false}` (not `initial={{ opacity: 0 }}`). framer-motion v12 + React 19 SSR serializes inline `style` attributes during SSR from `initial` props — using `initial={false}` skips the mount animation and prevents the server/client style mismatch.
- **Rule:** Any new component that renders on initial page load (before a scan) and uses framer-motion MUST use `initial={false}` to avoid React 19 hydration errors.

### 22d. CopyButton Component
- **`src/components/ui/CopyButton.tsx`** — Reusable clipboard button. Uses `navigator.clipboard.writeText`, swaps Copy→Check icon for 2s, calls `e.stopPropagation()` to prevent parent click handlers.
- **`src/styles/components.css`** — `.copy-btn`, `.copy-btn--copied` classes with smooth color transition.
- Integrated into 6 section components: `ImagesSection` (src URL), `LinksSection` (href + HTML), `AccessibilitySection` (code blocks), `SitemapSection` (path), `StructuredDataSection` (raw JSON-LD), `SecuritySection` (header values).
- **Rule:** Always call `e.stopPropagation()` in CopyButton's click handler — many parent containers have their own click handlers (e.g., collapsible sections).

### 22e. SectionSkeleton Loader
- **`src/components/ui/SectionSkeleton.tsx`** — Renders N skeleton cards (shimmer icon + title + 3 lines) using existing `.skeleton` class from `globals.css`. Shown during `showLoading` state alongside `LoadingState`.
- **`src/styles/components.css`** — `.section-skeleton__*` BEM classes.
- **Rule:** `SectionSkeleton` is shown only when `showLoading` is true (= `loading && !result`). Once the first SSE section arrives (`result` exists), `showLoading` becomes false and skeletons disappear, replaced by real section cards.

### 22f. Entrance Animations
- **`MiniScore.tsx`** — `animationDelay?: number` prop; stagger via `initial={{ opacity: 0, y: 16, scale: 0.95 }}` / `animate={{ opacity: 1, y: 0, scale: 1 }}` with `transition.delay`.
- **`ScoresGrid.tsx`** — Passes `animationDelay={index * 0.05}` to each MiniScore.
- **`CollapsibleSection.tsx`** — `animationDelay?: number` prop added to transition.
- **`SectionsGrid.tsx`** — Passes `animationDelay={index * 0.04}` to each CollapsibleSection.
- **`ScoreRing.tsx`** — `AnimatedCounter` component using `useMotionValue` + `useTransform` + `animate` from framer-motion: counts 0→score over 1.5s easeOut, synchronized with the ring stroke animation.
- **Rule:** Stagger delays are intentionally small (40–50ms per item). Larger delays feel sluggish on pages with many sections.

### 22g. Mobile Responsive Overhaul
Two breakpoints added across all CSS files:
- **Tablet `≤ 1024px`:** results-grid 1-col, compare-card 2-col grid, reduced padding/font sizes
- **Mobile `≤ 640px`:** search form stacks vertically, scores-grid 2-col, compare-grid 1-col, section headers compact, list detail rows stack, CWV grid 1-col, SEO items stack, security header rows stack, welcome-state compact, table font shrink, glass-card radius 12px
- Files modified: `globals.css`, `page.css`, `components.css`, `lists.css`, `sections.css`
- **Rule:** All breakpoints use `max-width` (mobile-first override approach). Never use `min-width` breakpoints — the existing codebase uses max-width exclusively.

### 22h. Hydration Fix — useScanHistory localStorage
- **Problem:** `useState(loadHistory)` called `loadHistory` during hydration, returning localStorage data on the client while the server rendered with `[]`. React 19 detected the `RecentScans` vs `WelcomeState` DOM mismatch.
- **Fix (`src/hooks/useScanHistory.ts`):** Changed to `useState<ScanHistoryEntry[]>([])` + `useEffect(() => setHistory(loadHistory()), [])`. Both server and client start with `[]`; localStorage is loaded after mount.
- **Rule:** Never read `localStorage`/`sessionStorage` in `useState` initializers or component render bodies. Always use `useEffect` for browser-only storage access to ensure SSR/client parity.

## 21. Future Improvement Backlog
The following improvements were identified but deferred for future implementation:

### Lower Priority (Features)
- **Lighthouse integration:** Optionally run Lighthouse via Puppeteer for industry-standard performance scoring alongside custom metrics.
- **Sitemap URL batch scanning:** Allow scanning multiple URLs from a sitemap in sequence with aggregated scoring.

### Code Quality
- **Extract scan sections into modules:** The 2700+ line `route.ts` could be split into per-section modules (`scanSeo.ts`, `scanLinks.ts`, etc.) with a thin orchestrator.
- **Result type safety:** Replace `any` type assertions in section components with proper typed interfaces derived from API response shapes.
- **Unit tests for scoring functions:** Extract score calculation logic into pure functions and add test coverage.

## Workflow Reminders
- When adding new metrics or scanners in `/api/scan/route.ts`, always update the corresponding `Result` interfaces at the top of the file AND add an `emit("section", ...)` call after the section completes.
- Any UI visual changes corresponding to the API must reflect gracefully (handle `undefined` checks if data structures mutate).
- When adding a new section: (1) create section component in `src/components/sections/`, (2) add key to `SECTION_KEYS` in `src/types/scan.ts`, (3) add entry to `sectionRegistry` in `src/config/sectionRegistry.ts`, (4) add `emit("section", ...)` in route.ts. No changes needed in `page.tsx`.
- When tuning scan performance, modify ONLY the named constants at the top of `route.ts`. Run a full scan after changes to verify no regressions.
- When modifying PDF export, add section detail writer to `sectionDetails` map in `downloadPDF.ts`. Keep text-based — do NOT use canvas or visual snapshotting.
- Scan history is stored in localStorage under key `coaxa_scan_history`. Max 20 entries.
