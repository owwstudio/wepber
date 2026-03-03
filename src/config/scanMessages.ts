/**
 * Scan progress messages — built dynamically from scanner.config.json
 * so that disabled features are never shown during loading rotation.
 *
 * @see agent.md §9 — Dynamic Component Configuration
 */
import scannerConfig from "../../scanner.config.json";

/** Shared generic messages shown at the start of every scan. */
export const initialScanMessages = [
  "Launching browser engine...",
  "Navigating to target URL...",
];

/** Messages rotated during Compare mode. */
export const compareMessages = [
  ...initialScanMessages,
  "Taking a pixel-perfect screenshot...",
  "Processing the uploaded design mockup...",
  "Running visual pixelmatch algorithm...",
  "Calculating structural differences...",
  "Generating side-by-side verification report...",
];

/** Per-feature scan messages keyed by scanner config feature name. */
const featureMessagesMap: Record<string, string> = {
  seo: "Analyzing SEO meta tags...",
  headings: "Scanning heading structure...",
  images: "Auditing images for accessibility...",
  links: "Checking links & buttons...",
  visual: "Checking visual contrast defaults...",
  performance: "Measuring performance metrics...",
  coreWebVitals: "Simulating Core Web Vitals loading metrics...",
  accessibility: "Running ARIA accessibility checks...",
  responsive: "Evaluating device layout properties...",
  security: "Performing base security header sweeps...",
  techStack: "Fingerprinting server configurations...",
  structuredData: "Checking structured data schemas...",
  robots: "Parsing robots.txt constraints...",
  sitemap: "Scanning site graph properties...",
};

/**
 * Dynamically compiled scan messages — only includes features that
 * are enabled in scanner.config.json.
 */
export const activeScanMessages = [
  ...initialScanMessages,
  ...Object.entries(scannerConfig.features)
    .filter(([, isEnabled]) => isEnabled)
    .map(([key]) => featureMessagesMap[key] || `Scanning ${key}...`),
  "Generating final assessment report...",
];
