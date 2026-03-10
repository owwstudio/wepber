# MISTAKES & GENERALIZED LEARNINGS
This automated document is intended for AI Agents and Developers working on this or any related web projects. It details architectural traps, conceptual mistakes, and anti-patterns encountered over time. Please read this to prevent repeating these mistakes.

---

## 1. Headless Browser Automation (Puppeteer / Playwright)

### 1.1 Synchronous Evaluation of Lifecycle Metrics
- **Mistake:** Assuming that lifecycle metrics (e.g., Core Web Vitals) can be captured asynchronously after the page loads (`performance.getEntriesByType`).
- **Consequence:** Data loss. Metrics like Cumulative Layout Shift (CLS) or Largest Contentful Paint (LCP) require real-time observers during the rendering step.
- **Solution:** Always inject `PerformanceObserver` instances using `evaluateOnNewDocument` (or equivalent) *before* the browser navigates to the URL. Store data in a global window variable to read after hydration.

### 1.2 Unconstrained Full-Page Screenshots
- **Mistake:** Triggering a raw `.screenshot({ fullPage: true })` on modern websites relying on viewport heights (`100vh`) or lazy-loaded scroll animations.
- **Consequence:** The browser will silently stretch the viewport height to match the document scroll height. Elements set to `100vh` will break entirely. Elements hidden by Intersection Observers (like `data-aos`) will vanish when scrolling back up.
- **Solution:** 
  1. Restrict the viewport strictly by `clip` and `captureBeyondViewport: true`.
  2. Implement an aggressive CSS override that forcibly injects `!important` to disable `transition`, `animation`, and sets `opacity: 1`. 
  3. Run DOM cleansing scripts to neutralize animation libraries (e.g., GSAP tweens, AOS `refresh()`) and reset matrix transforms.

### 1.3 Asynchronous Blob Processing Without Length Guards
- **Mistake:** Blindly passing a resolved screenshot buffer directly to an image processing library (e.g., `sharp(buffer)`).
- **Consequence:** Race conditions between browser rendering and capture can sporadically yield a zero-byte buffer (`buffer.length === 0`). This crashes the image processor with uncatchable async errors that break serverless pipelines.
- **Solution:** Always enforce an explicit length guard (`if (!buffer || buffer.length === 0)`) before streaming or processing synthetic files.

---

## 2. Serverless & API Architecture

### 2.1 Monolithic Sequential Execution
- **Mistake:** Executing comprehensive web analysis or multi-step networking tasks strictly consecutively (e.g., waiting 5 seconds for hydration, then checking 50 links sequentially).
- **Consequence:** Exceeding serverless timeout limits (e.g., Vercel's 15s to 60s ceilings). Unresponsive UI.
- **Solution:** 
  1. Offload non-dependent long tasks to run concurrently using `Promise.allSettled`.
  2. For external network iterations (e.g., mass link-checking), always batch endpoints processing (`Promise.allSettled` in chunks of 10) to avoid failing-fast on a single rejection or hitting rate limits.

### 2.2 Returning Raw Media Buffers
- **Mistake:** Transmitting uncompressed binary or Base64 media (like high-res page screenshots) directly inside an API JSON response payload.
- **Consequence:** Hitting maximum payload limits (`FUNCTION_PAYLOAD_TOO_LARGE` errors), crippling memory allocation on edge functions, and burning egress bandwidth.
- **Solution:** All media generated server-side must pass through an aggressive resizer/compressor (`sharp` to `.webp` at 60-70% quality, max width clamped) before stringification or streaming.

### 2.3 Blocking UI on Long-Running API Endpoints
- **Mistake:** Relying on standard `POST` / `GET` REST structures for intensive processing while showing users a generic static "Loading..." spinner.
- **Consequence:** Extremely poor UX, high bounce rates, and browser timeout resets.
- **Solution:** For heavy analytical endpoints, return a `ReadableStream` with Server-Sent Events (SSE). Push data incrementally (e.g., `emit("section", result)`). Build the frontend iteratively so users see progressive rendering.

---

## 3. UI/UX & React Rendering

### 3.1 State Mutation Under Static Dashboards
- **Mistake:** Letting an analytical report UI read directly from live user inputs (like a `<input type="file" />` hook constraint) instead of from the structured snapshot returned by the API.
- **Consequence:** When the user queues up a new input while viewing an old report, the old report dynamically updates to reflect the new input midway, corrupting the visual state.
- **Solution:** Report components must derive visual state strictly from the "frozen" result object injected from the API, not from generic global scopes or input refs.

### 3.2 Component Layout Jerking During State Transition
- **Mistake:** Removing or appending elements directly out of the React DOM synchronously when state changes (e.g., instantly changing a "Loading" block into a generic "Score Dashboard").
- **Consequence:** Harsh layout shifts that degrade the premium application feel.
- **Solution:** Use layout transition tools like `framer-motion`'s `<AnimatePresence mode="wait">`. Ensure that outgoing elements fully fade or exit before incoming components are permitted to render, maintaining bounding box stability.

### 3.3 Hydration Mismatches with Browser Storage & Animations
- **Mistake 1:** Initializing `useState` hooks by reading `localStorage` directly in their callback.
- **Mistake 2:** Setting `initial={{ opacity: 0 }}` on animations that render server-side.
- **Consequence:** React 19 hydration crashes. The server attempts to render an empty array/no-animation context while the client mounts physical storage nodes and overrides inline styles.
- **Solution:** 
  - Never read `localStorage` in global scope or `useState` initializers. Let it render `null` or `[]` natively on SSR, then update the state strictly within a `useEffect`.
  - Disable heavy entrance animations on SSR loads by explicitly declaring `initial={false}` so React natively honors the default server snapshot.

---

## 4. Frontend Data Integrity

### 4.1 Missing Key Fallbacks on Multi-Source UI
- **Mistake:** Utilizing a single UI component to render data objects returned by differing API versions or routes, without enforcing explicit conditionally typed fallbacks (e.g., `Result.url`).
- **Consequence:** Rendering raw `undefined` or `Invalid Date` strings in user-facing exports or dashboards.
- **Solution:** When mapping response models to the DOM or Export engines (like jsPDF), enforce defensive `||` fallbacks. E.g., `const title = data.title || "Unknown Title"`.

### 4.2 Canvas Snapshotting text-heavy documents
- **Mistake:** Converting large web dashboards into downloadable PDF reports using `html2canvas` visual snap-shots.
- **Consequence:** Generate gargantuan file sizes (10MB+ PDF), blurred text at varying DPIs, and non-searchable document structures.
- **Solution:** Construct PDF exports by directly mapping the JSON result strings onto the document (e.g., injecting variables via `jsPDF.text()`). Prioritize data-driven text exports over graphical picture-snapshots unless visualizing distinct art assets.

---

## 5. Agent Workflow & Tooling

### 5.1 Premature Confirmation
- **Mistake:** Assuming a UI or logic modification is successfully completed because the thought process confidently planned it, skipping the actual tool execution checks.
- **Consequence:** Leaving the application functionality disjointed or explicitly reporting false progress to the user.
- **Solution:** Always wait for the explicit file-writing tool to return a raw success block. Always verify edits applied fully.

### 5.2 Neglecting Architecture Logs
- **Mistake:** Waiting for the user to remind you to update `agent.md`, `GEMINI.md`, or `CLAUDE.md`.
- **Consequence:** Loss of context for future agents and repeating the exact same architectural mistakes or overriding established rules.
- **Solution:** Every single time a new module, state modifier, or specific layout behavior is created, track and permanently log it into the Progress Log immediately.

### 5.3 Improper Tool Pipelining
- **Mistake:** Slicing tasks off prematurely when executing feature changes spanning logic algorithms and UI layouts concurrently.
- **Consequence:** Disjointed application functionality and broken validation states.
- **Solution:** Ensure all targets (e.g., API + Frontend components) are modified correctly in tandem before triggering user notifications or ending the task.

### 5.4 Interactive CLI Commands in Automation
- **Mistake:** Running commands like `create-next-app` interactively without fully bypassing all prompts (e.g., Biome/ESLint prompts).
- **Consequence:** The terminal hangs indefinitely waiting for user input, silently breaking the automated scaffolding process.
- **Solution:** Manually scaffold projects with `npm init` and raw package installations, or ensure CLI tools have all strict non-interactive flags (`-y`, `--no-eslint`) provided.

---

## 6. Architecture & Frameworks

### 6.1 Strict Methodology Audits vs Modern SSR
- **Mistake:** Enforcing strict class-name ratios (e.g., >50% BEM) to strictly detect CSS methodologies on modern frameworks (like Astro or Next.js).
- **Consequence:** Modern SSR frameworks inject massive volumes of scoped metadata utility classes (e.g., `.astro-XXXXX`), mathematically overwhelming the strict ratio and causing false-positive methodology rejections.
- **Solution:** Reduce strict class percentage thresholds (e.g., >2%) to balance the flexibility of modern JS framework bloat while still securely rejecting pure utility frameworks (Tailwind).

### 6.2 SSE Abort Signals & Headless Browser Leaks
- **Mistake:** Terminating the client-side SSE connection (e.g., clicking "Stop") without forwarding the abort signal to the backend headless browser.
- **Consequence:** Hanging headless Puppeteer/Playwright instances on the server that consume RAM and CPU indefinitely.
- **Solution:** Implement `AbortSignal` handling inside the API route (e.g., `req.signal.aborted`) and pass it directly to `puppeteer.launch()` or the evaluation loop to forcibly and cleanly close the browser on client disconnects.

### 6.3 Root Layout Hydration Mismatches
- **Mistake:** Failing to protect root elements from browser extensions or third-party scripts injecting attributes during hydration.
- **Consequence:** A fatal React hydration mismatch that crashes the dev layout into a red full-screen overlay during initial navigation.
- **Solution:** Append `suppressHydrationWarning` strictly to the `<html>` and `<body>` root tags in `src/app/layout.tsx`.

### 6.4 Inline Style Violations for Structural Layouts
- **Mistake:** Using inline `style={{...}}` in TSX components for structural flexbox layouts or paddings to quickly rush visual alignments.
- **Consequence:** Breaking the primary styling methodology (e.g., BEM) and creating unmaintainable, fragmented CSS rules.
- **Solution:** All structural and thematic styling MUST be abstracted into respective CSS classes. Inline styles are ONLY permitted for highly dynamic inline calculations (e.g., width percentages or translate coordinates).

---

*This document is meant to be generalized and expanded iteratively across projects.*
