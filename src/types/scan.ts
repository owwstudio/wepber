/* eslint-disable @typescript-eslint/no-explicit-any */

export const SECTION_KEYS = [
  "seo",
  "headings",
  "images",
  "links",
  "visual",
  "performance",
  "accessibility",
  "responsive",
  "security",
  "coreWebVitals",
  "structuredData",
  "robots",
  "sitemap",
] as const;

export type SectionKey = (typeof SECTION_KEYS)[number];

/**
 * Centralised result type returned by /api/scan and /api/compare.
 * Kept intentionally loose (Record<string, any>) so individual section
 * components can narrow their own `data` props without coupling to a
 * single global schema.
 */
export type ScanResult = Record<string, any>;
