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

## 4. Overall Quality Scan Delay Optimization
- **Issue:** The Puppeteer evaluation started immediately after `domcontentloaded`, causing extremely dynamic applications (SPAs built with React/Vue or using lazy-loaded image components) to be captured partially rendered, skewing visual and responsive scores.
- **Solution:** A hard wait timeout (`await new Promise(r => setTimeout(r, 8000));`) was injected closely after the `goto` navigation resolves inside `src/app/api/scan/route.ts`. 
- **Guidance:** Do not reduce this wait buffer significantly (< 5000ms). Web analyzers require the UI to hydrate. If the URL processing is slow, it's typically a necessary trade-off for SPA accuracy.

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

## Workflow Reminders
- When adding new metrics or scanners in `/api/scan/route.ts`, always update the corresponding `Result` interfaces at the top of the file.
- Any UI visual changes corresponding to the API must reflect gracefully (handle `undefined` checks if data structures mutate).
