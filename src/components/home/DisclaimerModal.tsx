"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
    X, Zap, Globe, Server, Clock, BarChart2, Info,
    Shield, Eye, Database, Search, Heading1, ImageIcon,
    Link2, Gauge, MonitorSmartphone, Layers, Map, Bot, Code2, Palette,
} from "lucide-react";
import scannerConfig from "../../../scanner.config.json";

interface Props {
    open: boolean;
    onClose: () => void;
}

type FeatureKey = keyof typeof scannerConfig.features | null;

interface DisclaimerItem {
    icon: React.ElementType;
    color: string;
    title: string;
    body: string;
    /** If null → always shown. If set → only shown when that feature is enabled. */
    feature: FeatureKey;
}

const ALL_ITEMS: DisclaimerItem[] = [
    // ── Always-on: general methodology ────────────────────────────────────────
    {
        feature: null,
        icon: Globe,
        color: "#6366f1",
        title: "What We Do — Server-Side Browser Scan",
        body: "When you enter a URL, our server launches a real headless Chromium browser (Puppeteer) and navigates to your website — exactly like a real visitor. We extract metadata, measure performance, check layout, and capture screenshots. Everything happens on our server, not your device.",
    },
    {
        feature: null,
        icon: Server,
        color: "#10b981",
        title: "Server Location Affects Results",
        body: "Our scan server is hosted in a cloud data center. Latency between our server and the target website directly affects load times and performance scores. A site optimized for Southeast Asia may score differently when scanned from a US-based server.",
    },
    {
        feature: null,
        icon: Clock,
        color: "#8b5cf6",
        title: "Scan Timing & Dynamic Sites",
        body: "We apply adaptive wait times: Single-Page Apps (Next.js, React, Vue, Angular) get 4 seconds to hydrate; static sites get 2 seconds. Heavy CMS sites (WordPress, Elementor) may still have animations or lazy-loaded elements that haven't fully rendered during our capture window.",
    },
    {
        feature: null,
        icon: BarChart2,
        color: "#f59e0b",
        title: "Scores Are Relative Benchmarks",
        body: "Our scoring system uses weighted categories. Weights and thresholds reflect common web best practices, not any official standard. Use scores to track improvements over time or compare two versions of the same site — not as an absolute grade against other tools.",
    },
    {
        feature: null,
        icon: Eye,
        color: "#06b6d4",
        title: "What We Can & Cannot See",
        body: "We can analyze publicly accessible HTML, rendered DOM, images, links, headers, structured data, and visual layout. We cannot access pages behind login walls, content from private APIs, A/B test variants, or personalized content. If your site serves different content to bots, results may differ from real user experience.",
    },

    // ── Feature-gated: only shown when that feature is active ─────────────────
    {
        feature: "seo",
        icon: Search,
        color: "#6366f1",
        title: "SEO Metadata Checks",
        body: "We check title tags, meta descriptions, canonical URLs, Open Graph tags, and robots directives. We only see what's present in the HTML at load time — dynamic meta tags injected after hydration (e.g. via client-side routing) may not be captured accurately unless the framework supports SSR.",
    },
    {
        feature: "headings",
        icon: Heading1,
        color: "#a855f7",
        title: "Heading Structure Analysis",
        body: "Heading hierarchy (H1–H6) is evaluated from the initial rendered DOM. Headings injected dynamically after page load may not be included. We flag missing H1s and hierarchy skips as best-practice violations.",
    },
    {
        feature: "images",
        icon: ImageIcon,
        color: "#f97316",
        title: "Image Analysis",
        body: "We check images for missing alt text, broken sources, and oversized dimensions. Images that load lazily and haven't entered the viewport during our scan window may be missed. We scroll the page once to trigger lazy-load, but very late-loading images may still be excluded.",
    },
    {
        feature: "links",
        icon: Link2,
        color: "#ef4444",
        title: "Link Checking",
        body: "We check links by sending HEAD requests (with a GET fallback if HEAD fails). Some servers block HEAD requests from bots or return CDN edge errors that don't reflect actual page availability. External link checks are network-dependent and may vary between scans.",
    },
    {
        feature: "performance",
        icon: Gauge,
        color: "#22c55e",
        title: "Performance Metrics",
        body: "Load time, page size, and DOM element count are measured from our server's perspective. Raw numbers will differ from your own browser's DevTools because they reflect the network between our server and the target, not your local connection.",
    },
    {
        feature: "coreWebVitals",
        icon: Zap,
        color: "#eab308",
        title: "Core Web Vitals — Lab Data, Not Field Data",
        body: "CWV (LCP, CLS, TBT) are measured from a single real browser load on our server. Google PageSpeed Insights uses CrUX field data — averages across millions of real users over 28 days. Expect ±15–30% variance between scans due to server load, CDN cache state, and network conditions.",
    },
    {
        feature: "accessibility",
        icon: Info,
        color: "#64748b",
        title: "Accessibility Checks",
        body: "We detect common issues: images without alt text, buttons without accessible labels, links without descriptive text, and form inputs without labels. We do NOT run a full WCAG audit — this is a heuristic scan, not a substitute for manual accessibility testing or a full auditing tool like axe-core.",
    },
    {
        feature: "responsive",
        icon: MonitorSmartphone,
        color: "#06b6d4",
        title: "Responsive & Tap Targets",
        body: "Responsive checks use fixed viewports: mobile (375px) and desktop (1280px). Tap target threshold is 25×25px. CSS breakpoints at other widths are not tested. Elements hidden by CSS on a given viewport are excluded from tap-target checks.",
    },
    {
        feature: "security",
        icon: Shield,
        color: "#a855f7",
        title: "Security Header Checks",
        body: "We analyze publicly visible HTTP response headers (CSP, HSTS, X-Frame-Options, etc.). We do NOT perform penetration testing, injection testing, or any unauthorized access attempts. Results reflect header hygiene best practices — not a comprehensive security audit.",
    },
    {
        feature: "visual",
        icon: Palette,
        color: "#ec4899",
        title: "Visual Consistency",
        body: "We analyze font usage and color contrast ratios from the rendered page. Contrast values are computed at scan time — dynamic theme switching (dark/light mode) is only captured in whichever mode was active during the scan (default browser mode).",
    },
    {
        feature: "overlaps",
        icon: Layers,
        color: "#f97316",
        title: "Overlap & Layout Integrity",
        body: "Element collision detection scans the initial-load viewport only. Off-screen elements are excluded. We flag collisions covering more than 5% of the smaller element's area. Fixed/sticky elements (navbars, chat widgets) are excluded to avoid false positives.",
    },
    {
        feature: "techStack",
        icon: Code2,
        color: "#10b981",
        title: "Tech Stack Detection",
        body: "We detect frameworks and libraries by analyzing scripts, meta tags, response headers, and DOM markers. Detection is heuristic-based — minor versions may not be detected, and obfuscated or custom-built stacks may not be identified.",
    },
    {
        feature: "sitemap",
        icon: Map,
        color: "#6366f1",
        title: "Sitemap & Robots.txt",
        body: "We fetch /sitemap.xml and /robots.txt directly. If these are behind authentication or blocked for our server's IP range, they will appear as missing even if they exist for real users. Dynamically generated sitemaps (e.g. WordPress XML sitemap plugins) are detected as long as they return valid XML.",
    },
    {
        feature: "structuredData",
        icon: Bot,
        color: "#8b5cf6",
        title: "Structured Data Detection",
        body: "We parse JSON-LD, Microdata, and RDFa from the initial HTML. Structured data injected via client-side JavaScript (after hydration) may not be captured unless SSR is used. Results are informational — we do not validate schema correctness against schema.org.",
    },

    // ── Always-on: privacy & data ─────────────────────────────────────────────
    {
        feature: null,
        icon: Database,
        color: "#22c55e",
        title: "Privacy — We Store Nothing",
        body: "We do not store, log, or share any scanned URLs, scan results, screenshots, or uploaded design files on our servers. Scan history is saved only in your browser's localStorage and never leaves your device. Uploaded design mockups (for Compare mode) are processed in-memory and discarded immediately after the comparison is complete.",
    },
];

export default function DisclaimerModal({ open, onClose }: Props) {
    const features = scannerConfig.features as Record<string, boolean>;

    // Filter: always-on (feature===null) + enabled features only
    const visibleItems = ALL_ITEMS.filter(
        (item) => item.feature === null || features[item.feature] === true
    );

    return (
        <AnimatePresence>
            {open && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        className="disclaimer-backdrop"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        onClick={onClose}
                    />

                    {/* Centered Panel */}
                    <motion.div
                        className="disclaimer-panel"
                        initial={{ opacity: 0, scale: 0.95, y: 16 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.96, y: 8 }}
                        transition={{ duration: 0.3, ease: [0.25, 1, 0.5, 1] }}
                    >
                        {/* Sticky Header */}
                        <div className="disclaimer-panel__header">
                            <div>
                                <h2 className="disclaimer-panel__title">How This Scanner Works</h2>
                                <p className="disclaimer-panel__subtitle">
                                    Showing {visibleItems.length} sections — based on your active features
                                </p>
                            </div>
                            <button className="disclaimer-panel__close" onClick={onClose} aria-label="Close">
                                <X size={18} />
                            </button>
                        </div>

                        {/* Scrollable Body */}
                        <div className="disclaimer-panel__body">
                            {visibleItems.map((item, i) => (
                                <motion.div
                                    key={i}
                                    className="disclaimer-item"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.035, duration: 0.28 }}
                                >
                                    <div
                                        className="disclaimer-item__icon-wrap"
                                        style={{ background: `${item.color}18`, border: `1px solid ${item.color}30` }}
                                    >
                                        <item.icon size={15} style={{ color: item.color }} />
                                    </div>
                                    <div className="disclaimer-item__text">
                                        <div className="disclaimer-item__title">{item.title}</div>
                                        <div className="disclaimer-item__body">{item.body}</div>
                                    </div>
                                </motion.div>
                            ))}

                            {/* Bottom note */}
                            <div className="disclaimer-panel__note">
                                💡 Use scan results as a <strong>relative benchmark</strong> to track improvements
                                over time — not as absolute values to compare against other tools like Lighthouse or
                                PageSpeed Insights.
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
