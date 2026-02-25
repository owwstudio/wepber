import { NextRequest, NextResponse } from "next/server";
import chromium from "@sparticuz/chromium-min";
import puppeteer from "puppeteer-core";

// ===== RATE LIMITER (in-memory, per IP) =====
const RATE_LIMIT_MAX = 5;   // max requests
const RATE_LIMIT_WINDOW = 60_000; // per 60 seconds
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): { allowed: boolean; retryAfter: number } {
    const now = Date.now();
    const entry = rateLimitMap.get(ip);
    if (!entry || now > entry.resetAt) {
        rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
        return { allowed: true, retryAfter: 0 };
    }
    if (entry.count >= RATE_LIMIT_MAX) {
        return { allowed: false, retryAfter: Math.ceil((entry.resetAt - now) / 1000) };
    }
    entry.count++;
    return { allowed: true, retryAfter: 0 };
}

// ===== SSRF PROTECTION =====
// Block private, loopback, link-local and metadata service IP ranges
const BLOCKED_HOSTNAMES = /^(localhost|.*\.local|.*\.internal|.*\.corp)$/i;
const PRIVATE_IP_RE = /^(127\.|10\.|172\.(1[6-9]|2[0-9]|3[01])\.|192\.168\.|169\.254\.|::1|fc[0-9a-f]{2}:|fd[0-9a-f]{2}:)/;

function isSafeUrl(parsed: URL): { safe: boolean; reason: string } {
    const { protocol, hostname } = parsed;

    // Protocol whitelist
    if (protocol !== "http:" && protocol !== "https:") {
        return { safe: false, reason: `Protocol "${protocol}" is not allowed` };
    }

    // Block numeric private IPs
    if (PRIVATE_IP_RE.test(hostname)) {
        return { safe: false, reason: "Scanning private/internal IP addresses is not allowed" };
    }

    // Block dangerous hostnames
    if (BLOCKED_HOSTNAMES.test(hostname)) {
        return { safe: false, reason: "Scanning internal hostnames is not allowed" };
    }

    // Block bare IP literals that look like private ranges (extra guard)
    const ipv4Parts = hostname.split(".").map(Number);
    if (ipv4Parts.length === 4 && ipv4Parts.every(n => !isNaN(n))) {
        const [a, b] = ipv4Parts;
        if (a === 10 || a === 127 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 169 && b === 254)) {
            return { safe: false, reason: "Scanning private/internal IP addresses is not allowed" };
        }
    }

    return { safe: true, reason: "" };
}

export const maxDuration = 60;

interface ScanResult {
    url: string;
    scanDate: string;
    overallScore: number;
    screenshot: string | null;
    seo: SEOResult;
    headings: HeadingResult;
    images: ImageResult;
    links: LinkResult;
    visual: VisualResult;
    performance: PerformanceResult;
    accessibility: AccessibilityResult;
    responsive: ResponsiveResult;
    security: SecurityResult;
    techStack: TechStackResult;
    sitemap: { urls: { loc: string; lastmod?: string; changefreq?: string; priority?: string }[]; source: string | null; error?: string };
}

interface SEOResult {
    score: number;
    title: { value: string | null; length: number; status: string };
    metaDescription: { value: string | null; length: number; status: string };
    canonical: string | null;
    ogTags: Record<string, string>;
    robots: string | null;
    language: string | null;
    favicon: string | null;
    viewport: string | null;
    issues: string[];
}

interface HeadingResult {
    score: number;
    structure: { tag: string; text: string; level: number }[];
    h1Count: number;
    issues: string[];
}

interface ImageResult {
    score: number;
    total: number;
    withAlt: number;
    withoutAlt: number;
    broken: number;
    lazyLoaded: number;
    details: { src: string; alt: string | null; hasAlt: boolean; status: string; width: number; height: number; loading: string }[];
    issues: string[];
    screenshots: { label: string; image: string }[];
}

interface LinkResult {
    score: number;
    total: number;
    internal: number;
    external: number;
    deadLinks: { url: string; status: number }[];
    buttonsWithoutLabels: number;
    issues: string[];
    screenshots: { label: string; image: string }[];
    details: {
        internal: { href: string; text: string }[];
        external: { href: string; text: string }[];
        buttonsNoLabel: { tag: string; html: string }[];
    };
}

interface VisualResult {
    score: number;
    contrast: {
        score: number;
        rating: string;
        totalChecked: number;
        passAA: number;
        failAA: number;
        passAAA: number;
        failAAA: number;
        failures: { element: string; text: string; fg: string; bg: string; ratio: number; required: number }[];
    };
    fonts: string[];
    fontSizes: string[];
    colors: string[];
    backgroundColors: string[];
    issues: string[];
}

interface PerformanceResult {
    score: number;
    loadTime: number;
    totalResources: number;
    totalPageSize: string;
    totalPageSizeBytes: number;
    domElements: number;
    resourceBreakdown: { type: string; count: number; size: string; sizeBytes: number }[];
    metrics: {
        pageWeight: { score: number; rating: string; details: string[] };
        resourceCount: { score: number; rating: string; details: string[] };
        domComplexity: { score: number; rating: string; details: string[] };
        imageOptimization: { score: number; rating: string; details: string[] };
        caching: { score: number; rating: string; details: string[] };
    };
    recommendations: { priority: string; category: string; message: string }[];
    issues: string[];
}

interface AccessibilityResult {
    score: number;
    imagesWithoutAlt: number;
    linksWithoutText: number;
    buttonsWithoutLabels: number;
    inputsWithoutLabels: number;
    ariaUsage: number;
    issues: string[];
    screenshots: { label: string; image: string }[];
    details: {
        imagesNoAlt: { src: string; width: number; height: number }[];
        linksNoText: { href: string; html: string }[];
        buttonsNoLabel: { tag: string; html: string }[];
        inputsNoLabel: { tag: string; type: string; name: string; id: string }[];
    };
}

interface ResponsiveResult {
    score: number;
    isResponsive: boolean;
    hasViewportMeta: boolean;
    horizontalScrollMobile: boolean;
    mobileScreenshot: string | null;
    elementConsistency: {
        desktopVisible: number;
        mobileVisible: number;
        hiddenOnMobile: number;
    };
    tapTargets: {
        issues: number;
        total: number;
        elements: { html: string; width: number; height: number; x: number; y: number }[];
    };
    issues: string[];
}

interface SecurityResult {
    score: number;
    isHttps: boolean;
    headers: {
        hsts: { present: boolean; value: string | null };
        csp: { present: boolean; value: string | null };
        xFrameOptions: { present: boolean; value: string | null };
        xContentTypeOptions: { present: boolean; value: string | null };
        referrerPolicy: { present: boolean; value: string | null };
        permissionsPolicy: { present: boolean; value: string | null };
    };
    mixedContent: { count: number; items: string[] };
    dangerousInlineScripts: number;
    cookieIssues: { name: string; missingSecure: boolean; missingHttpOnly: boolean }[];
    issues: string[];
    recommendations: { priority: string; check: string; message: string }[];
}

interface TechItem {
    name: string;
    category: string;
    version?: string;
    confidence: "high" | "medium" | "low";
    icon?: string;
}

interface TechStackResult {
    detected: TechItem[];
    serverInfo: { server: string | null; poweredBy: string | null };
    totalDetected: number;
}

export async function POST(request: NextRequest) {
    let browser;
    try {
        // ===== RATE LIMITING =====
        const ip =
            request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
            request.headers.get("x-real-ip") ||
            "unknown";
        const { allowed, retryAfter } = checkRateLimit(ip);
        if (!allowed) {
            return NextResponse.json(
                { error: `Rate limit exceeded. Try again in ${retryAfter}s.` },
                { status: 429, headers: { "Retry-After": String(retryAfter) } }
            );
        }

        // ===== REQUEST BODY VALIDATION =====
        let body: Record<string, unknown>;
        try {
            body = await request.json();
        } catch {
            return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
        }

        const { url } = body;
        if (!url || typeof url !== "string") {
            return NextResponse.json({ error: "URL is required" }, { status: 400 });
        }
        if (url.length > 2048) {
            return NextResponse.json({ error: "URL too long (max 2048 characters)" }, { status: 400 });
        }

        // ===== URL VALIDATION + SSRF PROTECTION =====
        let targetUrl: string;
        try {
            const normalized = url.trim().startsWith("http") ? url.trim() : `https://${url.trim()}`;
            const parsed = new URL(normalized);

            const safety = isSafeUrl(parsed);
            if (!safety.safe) {
                return NextResponse.json({ error: safety.reason }, { status: 400 });
            }

            targetUrl = parsed.href;
        } catch {
            return NextResponse.json({ error: "Invalid URL format" }, { status: 400 });
        }

        // ===== PUPPETEER LAUNCH (hardened) =====
        // On Vercel: use @sparticuz/chromium-min + remote pack to bypass 50MB limit
        // On local: use system Chrome installation
        const isVercel = !!process.env.VERCEL;
        const executablePath = isVercel
            ? await chromium.executablePath(
                "https://github.com/Sparticuz/chromium/releases/download/v133.0.0/chromium-v133.0.0-pack.tar"
            )
            : process.platform === "win32"
                ? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
                : process.platform === "linux"
                    ? "/usr/bin/google-chrome"
                    : "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

        const localArgs = [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-dev-shm-usage",
            "--disable-extensions",
            "--disable-plugins",
            "--no-first-run",
            "--disable-default-apps",
            "--disable-background-networking",
        ];

        browser = await puppeteer.launch({
            args: isVercel
                ? [
                    ...chromium.args,
                    "--disable-extensions",
                    "--disable-plugins",
                    "--no-first-run",
                    "--disable-default-apps",
                ]
                : localArgs,
            defaultViewport: null,
            executablePath,
            headless: true,
        });

        const page = await browser.newPage();
        await page.setViewport({ width: 1440, height: 900 });

        // Global page timeout — all evaluate/click/etc calls default to 25s
        page.setDefaultTimeout(25000);
        page.setDefaultNavigationTimeout(25000);

        // Performance tracking
        const startTime = Date.now();

        // Collect resource data
        const resources: { type: string; size: number; url: string }[] = [];
        page.on("response", async (response) => {
            try {
                const resUrl = response.url();
                const headers = response.headers();
                const contentType = headers["content-type"] || "";
                const contentLength = parseInt(headers["content-length"] || "0", 10);
                let type = "other";
                if (contentType.includes("javascript")) type = "js";
                else if (contentType.includes("css")) type = "css";
                else if (contentType.includes("image")) type = "image";
                else if (contentType.includes("font")) type = "font";
                else if (contentType.includes("html")) type = "html";
                resources.push({ type, size: contentLength, url: resUrl });
            } catch { /* ignore */ }
        });

        // Navigate with graceful fallback:
        // 1st try: networkidle2 (waits for network to be quiet — ideal but may hang on SPAs)
        // 2nd try: domcontentloaded (faster, works on most pages)
        try {
            await page.goto(targetUrl, { waitUntil: "networkidle2", timeout: 20000 });
        } catch (navErr) {
            const msg = navErr instanceof Error ? navErr.message : String(navErr);
            if (msg.includes("timeout") || msg.includes("TimeoutError")) {
                console.warn(`[scan] networkidle2 timed out for ${targetUrl}, retrying with domcontentloaded`);
                // Page may already be partially loaded — try to continue from current state
                try {
                    await page.waitForSelector("body", { timeout: 5000 });
                } catch {
                    // If still no body, do a fresh goto with a lenient strategy
                    await page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: 20000 });
                }
            } else {
                throw navErr; // DNS error, connection refused, etc — surface to user
            }
        }
        const loadTime = Date.now() - startTime;

        // ===== FULL PAGE SCREENSHOT =====
        const fullScreenshotBuffer = await page.screenshot({ fullPage: true, type: "webp", quality: 60 });
        const fullScreenshot = `data:image/webp;base64,${Buffer.from(fullScreenshotBuffer).toString("base64")}`;

        // Helper: highlight elements and take screenshot, then remove highlights
        async function captureHighlighted(
            selector: string,
            filterFn: string,
            color: string,
            label: string
        ): Promise<string | null> {
            const count = await page.evaluate(
                (sel: string, fn: string, clr: string) => {
                    const els = Array.from(document.querySelectorAll(sel));
                    const filtered = els.filter(new Function('el', `return ${fn}`) as (el: Element) => boolean);
                    if (filtered.length === 0) return 0;
                    filtered.forEach((el) => {
                        const htmlEl = el as HTMLElement;
                        htmlEl.setAttribute('data-seo-highlight', 'true');
                        htmlEl.style.outline = `3px solid ${clr}`;
                        htmlEl.style.outlineOffset = '2px';
                        htmlEl.style.boxShadow = `0 0 8px ${clr}80`;
                        // Add label
                        const badge = document.createElement('div');
                        badge.setAttribute('data-seo-badge', 'true');
                        badge.style.cssText = `position:absolute;top:-18px;left:0;background:${clr};color:#fff;font-size:10px;padding:1px 6px;border-radius:3px;z-index:999999;font-family:sans-serif;pointer-events:none;white-space:nowrap;`;
                        badge.textContent = '⚠';
                        const parent = htmlEl.parentElement;
                        if (parent) {
                            const pos = getComputedStyle(parent).position;
                            if (pos === 'static') parent.style.position = 'relative';
                        }
                        htmlEl.style.position = htmlEl.style.position || 'relative';
                        htmlEl.appendChild(badge);
                    });
                    // Scroll first element into view
                    filtered[0].scrollIntoView({ block: 'center' });
                    return filtered.length;
                },
                selector, filterFn, color
            );

            if (count === 0) return null;

            await new Promise(r => setTimeout(r, 300));
            const screenshotBuf = await page.screenshot({ fullPage: false, type: "webp", quality: 70 });
            const b64 = `data:image/webp;base64,${Buffer.from(screenshotBuf).toString("base64")}`;

            // Remove highlights
            await page.evaluate(() => {
                document.querySelectorAll('[data-seo-highlight]').forEach((el) => {
                    const htmlEl = el as HTMLElement;
                    htmlEl.style.outline = '';
                    htmlEl.style.outlineOffset = '';
                    htmlEl.style.boxShadow = '';
                    htmlEl.removeAttribute('data-seo-highlight');
                });
                document.querySelectorAll('[data-seo-badge]').forEach((el) => el.remove());
            });

            return b64;
        }

        // ===== SEO META ANALYSIS =====
        const seo = await page.evaluate(() => {
            const getMetaContent = (name: string) => {
                const el = document.querySelector(`meta[name="${name}"], meta[property="${name}"]`);
                return el ? el.getAttribute("content") : null;
            };

            const title = document.title;
            const metaDescription = getMetaContent("description");
            const canonical = document.querySelector("link[rel='canonical']")?.getAttribute("href") || null;
            const robots = getMetaContent("robots");
            const language = document.documentElement.lang || null;
            const favicon = document.querySelector("link[rel='icon'], link[rel='shortcut icon']")?.getAttribute("href") || null;
            const viewport = getMetaContent("viewport");

            const ogTags: Record<string, string> = {};
            document.querySelectorAll('meta[property^="og:"]').forEach((el) => {
                const prop = el.getAttribute("property");
                const content = el.getAttribute("content");
                if (prop && content) ogTags[prop] = content;
            });

            return { title, metaDescription, canonical, robots, language, favicon, viewport, ogTags };
        });

        const seoIssues: string[] = [];
        const titleLen = seo.title?.length || 0;
        let titleStatus = "good";
        if (!seo.title) { titleStatus = "missing"; seoIssues.push("Missing page title"); }
        else if (titleLen < 30) { titleStatus = "too_short"; seoIssues.push("Title too short (< 30 chars)"); }
        else if (titleLen > 60) { titleStatus = "too_long"; seoIssues.push("Title too long (> 60 chars)"); }

        const descLen = seo.metaDescription?.length || 0;
        let descStatus = "good";
        if (!seo.metaDescription) { descStatus = "missing"; seoIssues.push("Missing meta description"); }
        else if (descLen < 120) { descStatus = "too_short"; seoIssues.push("Meta description too short (< 120 chars)"); }
        else if (descLen > 160) { descStatus = "too_long"; seoIssues.push("Meta description too long (> 160 chars)"); }

        if (!seo.canonical) seoIssues.push("Missing canonical URL");
        if (!seo.viewport) seoIssues.push("Missing viewport meta tag");
        if (!seo.language) seoIssues.push("Missing language attribute");
        if (Object.keys(seo.ogTags).length === 0) seoIssues.push("No Open Graph tags found");

        const seoScore = Math.max(0, 100 - seoIssues.length * 12);

        const seoResult: SEOResult = {
            score: seoScore,
            title: { value: seo.title, length: titleLen, status: titleStatus },
            metaDescription: { value: seo.metaDescription, length: descLen, status: descStatus },
            canonical: seo.canonical,
            ogTags: seo.ogTags,
            robots: seo.robots,
            language: seo.language,
            favicon: seo.favicon,
            viewport: seo.viewport,
            issues: seoIssues,
        };

        // ===== HEADING STRUCTURE =====
        const headingData = await page.evaluate(() => {
            const headings: { tag: string; text: string; level: number }[] = [];
            document.querySelectorAll("h1, h2, h3, h4, h5, h6").forEach((h) => {
                headings.push({
                    tag: h.tagName.toLowerCase(),
                    text: (h.textContent || "").trim().substring(0, 100),
                    level: parseInt(h.tagName[1]),
                });
            });
            return headings;
        });

        const headingIssues: string[] = [];
        const h1Count = headingData.filter((h) => h.tag === "h1").length;
        if (h1Count === 0) headingIssues.push("No H1 tag found");
        if (h1Count > 1) headingIssues.push(`Multiple H1 tags found (${h1Count})`);
        if (headingData.length === 0) headingIssues.push("No heading tags found");

        // Check hierarchy
        for (let i = 1; i < headingData.length; i++) {
            if (headingData[i].level > headingData[i - 1].level + 1) {
                headingIssues.push(`Heading hierarchy skip: ${headingData[i - 1].tag} → ${headingData[i].tag}`);
                break;
            }
        }

        const headingScore = Math.max(0, 100 - headingIssues.length * 20);

        const headingResult: HeadingResult = {
            score: headingScore,
            structure: headingData,
            h1Count,
            issues: headingIssues,
        };

        // ===== IMAGE AUDIT =====
        const imageData = await page.evaluate(() => {
            const imgs = Array.from(document.querySelectorAll("img"));
            return imgs.map((img) => ({
                src: img.src || img.getAttribute("data-src") || "",
                alt: img.alt || null,
                hasAlt: img.hasAttribute("alt"),
                naturalWidth: img.naturalWidth,
                naturalHeight: img.naturalHeight,
                width: img.width,
                height: img.height,
                loading: img.loading,
            }));
        });

        const imageIssues: string[] = [];
        const withoutAlt = imageData.filter((i) => !i.hasAlt).length;
        const broken = imageData.filter((i) => i.naturalWidth === 0 && i.src).length;
        const lazyLoaded = imageData.filter((i) => i.loading === "lazy").length;

        if (withoutAlt > 0) imageIssues.push(`${withoutAlt} image(s) missing alt attribute`);
        if (broken > 0) imageIssues.push(`${broken} broken image(s) detected`);

        const imageScore = imageData.length === 0 ? 100 : Math.max(0, 100 - Math.round(((withoutAlt + broken) / imageData.length) * 100));

        // Capture image issue screenshots
        const imageScreenshots: { label: string; image: string }[] = [];
        if (withoutAlt > 0) {
            const shot = await captureHighlighted(
                'img', '!el.hasAttribute("alt")', '#f97316', 'Missing Alt'
            );
            if (shot) imageScreenshots.push({ label: `${withoutAlt} image(s) tanpa alt text`, image: shot });
        }
        if (broken > 0) {
            const shot = await captureHighlighted(
                'img', 'el.naturalWidth === 0 && el.src', '#ef4444', 'Broken'
            );
            if (shot) imageScreenshots.push({ label: `${broken} gambar broken`, image: shot });
        }

        const imageResult: ImageResult = {
            score: imageScore,
            total: imageData.length,
            withAlt: imageData.length - withoutAlt,
            withoutAlt,
            broken,
            lazyLoaded,
            details: imageData.map((i) => ({
                src: i.src.substring(0, 200),
                alt: i.alt,
                hasAlt: i.hasAlt,
                status: i.naturalWidth === 0 ? "broken" : "ok",
                width: i.width,
                height: i.height,
                loading: i.loading || "eager",
            })),
            issues: imageIssues,
            screenshots: imageScreenshots,
        };

        // ===== LINK & BUTTON CHECK =====
        const linkData = await page.evaluate((baseUrl: string) => {
            const links = Array.from(document.querySelectorAll("a"));
            const origin = new URL(baseUrl).origin;
            const internalLinks: { href: string; text: string }[] = [];
            const externalLinks: { href: string; text: string }[] = [];

            links.forEach((link) => {
                const href = link.href;
                if (!href || href.startsWith("javascript:") || href.startsWith("#")) return;
                const text = (link.textContent || "").trim().substring(0, 80);
                try {
                    const linkUrl = new URL(href);
                    const item = { href: href.substring(0, 200), text };
                    if (linkUrl.origin === origin) internalLinks.push(item);
                    else externalLinks.push(item);
                } catch {
                    internalLinks.push({ href: href.substring(0, 200), text });
                }
            });

            const buttons = Array.from(document.querySelectorAll("button, [role='button'], input[type='button'], input[type='submit']"));
            const btnsNoLabel = buttons.filter((btn) => {
                const text = (btn.textContent || "").trim();
                const ariaLabel = btn.getAttribute("aria-label");
                const title = btn.getAttribute("title");
                return !text && !ariaLabel && !title;
            });

            return {
                total: links.length,
                internalLinks,
                externalLinks,
                buttonsWithoutLabels: btnsNoLabel.length,
                buttonsNoLabelDetails: btnsNoLabel.map((b) => ({
                    tag: b.tagName.toLowerCase(),
                    html: b.outerHTML.substring(0, 150),
                })),
            };
        }, targetUrl);

        const linksToCheck = [...linkData.internalLinks, ...linkData.externalLinks].map(l => l.href).slice(0, 15);
        const deadLinks: { url: string; status: number }[] = [];

        for (const link of linksToCheck) {
            try {
                const response = await page.evaluate(async (url: string) => {
                    try {
                        const res = await fetch(url, { method: "HEAD", mode: "no-cors" });
                        return res.status;
                    } catch {
                        return 0;
                    }
                }, link);
                if (response >= 400 || response === 0) {
                    deadLinks.push({ url: link.substring(0, 200), status: response });
                }
            } catch {
                deadLinks.push({ url: link.substring(0, 200), status: 0 });
            }
        }

        const linkIssues: string[] = [];
        if (deadLinks.length > 0) linkIssues.push(`${deadLinks.length} dead link(s) found`);
        if (linkData.buttonsWithoutLabels > 0) linkIssues.push(`${linkData.buttonsWithoutLabels} button(s) without accessible label`);

        const linkScore = Math.max(0, 100 - deadLinks.length * 15 - linkData.buttonsWithoutLabels * 10);

        // Capture button issue screenshots
        const linkScreenshots: { label: string; image: string }[] = [];
        if (linkData.buttonsWithoutLabels > 0) {
            const shot = await captureHighlighted(
                'button, [role="button"], input[type="button"], input[type="submit"]',
                '!(el.textContent || "").trim() && !el.getAttribute("aria-label") && !el.getAttribute("title")',
                '#eab308', 'No Label'
            );
            if (shot) linkScreenshots.push({ label: `${linkData.buttonsWithoutLabels} button tanpa label`, image: shot });
        }

        const linkResult: LinkResult = {
            score: linkScore,
            total: linkData.total,
            internal: linkData.internalLinks.length,
            external: linkData.externalLinks.length,
            deadLinks,
            buttonsWithoutLabels: linkData.buttonsWithoutLabels,
            issues: linkIssues,
            screenshots: linkScreenshots,
            details: {
                internal: linkData.internalLinks,
                external: linkData.externalLinks,
                buttonsNoLabel: linkData.buttonsNoLabelDetails,
            },
        };

        // ===== VISUAL CONSISTENCY (International Standards) =====
        const visualData = await page.evaluate(() => {
            const elements = document.querySelectorAll("body, body *");
            const fonts = new Set<string>();
            const fontSizes = new Set<string>();
            const fontSizesPx: number[] = [];
            const colors = new Set<string>();
            const backgroundColors = new Set<string>();
            const spacingValues: number[] = [];
            const lineHeights: { lh: number; fs: number }[] = [];

            // Contrast check data
            const contrastPairs: { element: string; text: string; fg: string; bg: string; fgRgb: number[]; bgRgb: number[]; fontSize: number; isBold: boolean }[] = [];

            const sampleSize = Math.min(elements.length, 300);
            const step = Math.max(1, Math.floor(elements.length / sampleSize));

            for (let i = 0; i < elements.length; i += step) {
                const el = elements[i] as HTMLElement;
                const style = getComputedStyle(el);
                if (style.fontFamily) fonts.add(style.fontFamily.split(",")[0].trim().replace(/['"]/g, ""));
                if (style.fontSize) {
                    fontSizes.add(style.fontSize);
                    fontSizesPx.push(parseFloat(style.fontSize));
                }
                if (style.color && style.color !== "rgba(0, 0, 0, 0)") colors.add(style.color);
                if (style.backgroundColor && style.backgroundColor !== "rgba(0, 0, 0, 0)") backgroundColors.add(style.backgroundColor);

                // Spacing values (margin, padding all sides)
                ["marginTop", "marginBottom", "marginLeft", "marginRight", "paddingTop", "paddingBottom", "paddingLeft", "paddingRight"].forEach((prop) => {
                    const val = parseFloat(style.getPropertyValue(prop.replace(/[A-Z]/g, m => `-${m.toLowerCase()}`)));
                    if (val > 0) spacingValues.push(val);
                });

                // Line height
                const lh = parseFloat(style.lineHeight);
                const fs = parseFloat(style.fontSize);
                if (!isNaN(lh) && fs > 0) {
                    lineHeights.push({ lh: lh / fs, fs });
                }

                // Contrast: parse rgb colors
                function parseRgb(c: string): number[] | null {
                    const m = c.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
                    return m ? [parseInt(m[1]), parseInt(m[2]), parseInt(m[3])] : null;
                }

                const text = (el.textContent || "").trim().substring(0, 40);
                if (text.length > 0) {
                    const fgRgb = parseRgb(style.color);
                    // Walk up to find actual bg
                    let bgRgb: number[] | null = null;
                    let walker: HTMLElement | null = el;
                    while (walker) {
                        const ws = getComputedStyle(walker);
                        const bg = parseRgb(ws.backgroundColor);
                        if (bg && !(bg[0] === 0 && bg[1] === 0 && bg[2] === 0 && ws.backgroundColor.includes("0)"))) {
                            bgRgb = bg;
                            break;
                        }
                        walker = walker.parentElement;
                    }
                    if (!bgRgb) bgRgb = [255, 255, 255]; // assume white bg

                    if (fgRgb && bgRgb) {
                        contrastPairs.push({
                            element: el.tagName.toLowerCase(),
                            text,
                            fg: style.color,
                            bg: `rgb(${bgRgb.join(",")})`,
                            fgRgb,
                            bgRgb,
                            fontSize: fs,
                            isBold: parseInt(style.fontWeight) >= 700 || style.fontWeight === "bold",
                        });
                    }
                }
            }

            return {
                fonts: Array.from(fonts),
                fontSizes: Array.from(fontSizes).sort(),
                fontSizesPx,
                colors: Array.from(colors),
                backgroundColors: Array.from(backgroundColors),
                spacingValues,
                lineHeights,
                contrastPairs,
            };
        });

        // === Helper: WCAG Relative Luminance ===
        function sRGBtoLinear(c: number): number {
            const s = c / 255;
            return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
        }
        function luminance(r: number, g: number, b: number): number {
            return 0.2126 * sRGBtoLinear(r) + 0.7152 * sRGBtoLinear(g) + 0.0722 * sRGBtoLinear(b);
        }
        function contrastRatio(fg: number[], bg: number[]): number {
            const l1 = luminance(fg[0], fg[1], fg[2]);
            const l2 = luminance(bg[0], bg[1], bg[2]);
            const lighter = Math.max(l1, l2);
            const darker = Math.min(l1, l2);
            return (lighter + 0.05) / (darker + 0.05);
        }

        // WCAG CONTRAST SCORING
        let passAA = 0, failAA = 0, passAAA = 0, failAAA = 0;
        const contrastFailures: { element: string; text: string; fg: string; bg: string; ratio: number; required: number }[] = [];

        for (const pair of visualData.contrastPairs) {
            const ratio = contrastRatio(pair.fgRgb, pair.bgRgb);
            const isLargeText = pair.fontSize >= 18 || (pair.isBold && pair.fontSize >= 14);
            const requiredAA = isLargeText ? 3 : 4.5;
            const requiredAAA = isLargeText ? 4.5 : 7;

            if (ratio >= requiredAA) { passAA++; } else {
                failAA++;
                if (contrastFailures.length < 20) {
                    contrastFailures.push({
                        element: pair.element,
                        text: pair.text,
                        fg: pair.fg,
                        bg: pair.bg,
                        ratio: Math.round(ratio * 100) / 100,
                        required: requiredAA,
                    });
                }
            }
            if (ratio >= requiredAAA) { passAAA++; } else { failAAA++; }
        }

        const totalContrast = passAA + failAA;
        const contrastPassRate = totalContrast > 0 ? passAA / totalContrast : 1;
        const visualScore = Math.round(contrastPassRate * 100);
        const contrastRatingVal = visualScore >= 95 ? "AAA" : visualScore >= 80 ? "AA" : visualScore >= 60 ? "A" : "Fail";

        const visualIssues: string[] = [];
        if (visualScore < 80) visualIssues.push(`WCAG contrast issues — ${failAA} element(s) fail AA requirements (4.5:1)`);
        if (failAAA > 0) visualIssues.push(`${failAAA} element(s) fail stricter AAA requirements (7:1)`);

        const visualResult: VisualResult = {
            score: visualScore,
            contrast: {
                score: visualScore,
                rating: contrastRatingVal,
                totalChecked: totalContrast,
                passAA,
                failAA,
                passAAA,
                failAAA,
                failures: contrastFailures,
            },
            fonts: visualData.fonts,
            fontSizes: visualData.fontSizes,
            colors: visualData.colors.slice(0, 20),
            backgroundColors: visualData.backgroundColors.slice(0, 20),
            issues: visualIssues,
        };

        // ===== PERFORMANCE (Comprehensive) =====
        const formatSize = (bytes: number) => {
            if (bytes < 1024) return `${bytes}B`;
            if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
            return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
        };

        const resourceBreakdown: { type: string; count: number; size: number }[] = [];
        const typeMap = new Map<string, { count: number; size: number }>();

        resources.forEach((r) => {
            const current = typeMap.get(r.type) || { count: 0, size: 0 };
            current.count++;
            current.size += r.size;
            typeMap.set(r.type, current);
        });

        typeMap.forEach((val, key) => {
            resourceBreakdown.push({ type: key, count: val.count, size: val.size });
        });

        const totalSize = resources.reduce((a, b) => a + b.size, 0);
        const totalRequests = resources.length;

        // DOM complexity
        const domElements = await page.evaluate(() => document.querySelectorAll('*').length);

        // Image analysis from resources
        const imageResources = resources.filter(r => r.type === 'image' || r.type === 'img');
        const totalImageSize = imageResources.reduce((a, b) => a + b.size, 0);
        const largeImages = imageResources.filter(r => r.size > 200 * 1024);

        // JS/CSS analysis
        const jsResources = resources.filter(r => r.type === 'script');
        const cssResources = resources.filter(r => r.type === 'stylesheet');
        const totalJsSize = jsResources.reduce((a, b) => a + b.size, 0);
        const totalCssSize = cssResources.reduce((a, b) => a + b.size, 0);

        // --- 1. PAGE WEIGHT (25%) ---
        let pageWeightScore = 100;
        const pageWeightDetails: string[] = [];
        if (totalSize > 5 * 1024 * 1024) { pageWeightScore -= 40; pageWeightDetails.push(`⚠ Total page size ${formatSize(totalSize)} exceeds 5MB — target < 3MB`); }
        else if (totalSize > 3 * 1024 * 1024) { pageWeightScore -= 20; pageWeightDetails.push(`Total page size ${formatSize(totalSize)} — target < 3MB for optimal loading`); }
        else if (totalSize > 1.5 * 1024 * 1024) { pageWeightScore -= 10; pageWeightDetails.push(`Page size ${formatSize(totalSize)} — good, but could be optimized`); }
        else { pageWeightDetails.push(`✓ Page size ${formatSize(totalSize)} (excellent)`); }

        if (totalJsSize > 1024 * 1024) { pageWeightScore -= 15; pageWeightDetails.push(`⚠ JavaScript total ${formatSize(totalJsSize)} — consider code splitting (target < 500KB)`); }
        else if (totalJsSize > 500 * 1024) { pageWeightScore -= 5; pageWeightDetails.push(`JavaScript ${formatSize(totalJsSize)} — consider lazy loading modules`); }
        else { pageWeightDetails.push(`✓ JavaScript ${formatSize(totalJsSize)} (within budget)`); }

        if (totalCssSize > 300 * 1024) { pageWeightScore -= 10; pageWeightDetails.push(`CSS total ${formatSize(totalCssSize)} — consider removing unused CSS`); }
        else { pageWeightDetails.push(`✓ CSS ${formatSize(totalCssSize)} (within budget)`); }

        const pageWeightRating = pageWeightScore >= 90 ? "AAA" : pageWeightScore >= 70 ? "AA" : pageWeightScore >= 50 ? "A" : "Fail";

        // --- 2. RESOURCE COUNT (20%) ---
        let resourceCountScore = 100;
        const resourceCountDetails: string[] = [];
        if (totalRequests > 150) { resourceCountScore -= 35; resourceCountDetails.push(`⚠ ${totalRequests} HTTP requests — significantly impacts load time (target < 50)`); }
        else if (totalRequests > 80) { resourceCountScore -= 20; resourceCountDetails.push(`${totalRequests} HTTP requests — consider bundling (target < 50)`); }
        else if (totalRequests > 50) { resourceCountScore -= 10; resourceCountDetails.push(`${totalRequests} requests — slightly above optimal`); }
        else { resourceCountDetails.push(`✓ ${totalRequests} requests (optimal)`); }

        if (jsResources.length > 20) { resourceCountScore -= 10; resourceCountDetails.push(`${jsResources.length} JS files — bundle to reduce requests`); }
        if (cssResources.length > 10) { resourceCountScore -= 5; resourceCountDetails.push(`${cssResources.length} CSS files — consolidate stylesheets`); }

        const resourceCountRating = resourceCountScore >= 90 ? "AAA" : resourceCountScore >= 70 ? "AA" : resourceCountScore >= 50 ? "A" : "Fail";

        // --- 3. DOM COMPLEXITY (15%) ---
        let domScore = 100;
        const domDetails: string[] = [];
        if (domElements > 3000) { domScore -= 40; domDetails.push(`⚠ ${domElements} DOM elements — excessive (target < 1500, causes layout thrashing)`); }
        else if (domElements > 1500) { domScore -= 20; domDetails.push(`${domElements} DOM elements — above recommended (target < 1500)`); }
        else if (domElements > 800) { domScore -= 5; domDetails.push(`${domElements} DOM elements — moderate`); }
        else { domDetails.push(`✓ ${domElements} DOM elements (lean DOM)`); }

        const domRating = domScore >= 90 ? "AAA" : domScore >= 70 ? "AA" : domScore >= 50 ? "A" : "Fail";

        // --- 4. IMAGE OPTIMIZATION (25%) ---
        let imageOptScore = 100;
        const imageOptDetails: string[] = [];
        if (imageResources.length === 0) {
            imageOptDetails.push("✓ No images detected");
        } else {
            if (totalImageSize > 2 * 1024 * 1024) { imageOptScore -= 30; imageOptDetails.push(`⚠ Total image weight ${formatSize(totalImageSize)} — compress images (target < 1MB)`); }
            else if (totalImageSize > 1024 * 1024) { imageOptScore -= 15; imageOptDetails.push(`Image weight ${formatSize(totalImageSize)} — consider next-gen formats (WebP/AVIF)`); }
            else { imageOptDetails.push(`✓ Image weight ${formatSize(totalImageSize)} (good)`); }

            if (largeImages.length > 0) { imageOptScore -= largeImages.length * 5; imageOptDetails.push(`${largeImages.length} image(s) > 200KB — resize and compress`); }
            else { imageOptDetails.push("✓ No oversized images detected"); }

            const imageRatio = totalImageSize / Math.max(totalSize, 1);
            if (imageRatio > 0.7) { imageOptScore -= 10; imageOptDetails.push(`Images are ${Math.round(imageRatio * 100)}% of page weight — optimize aggressively`); }
        }

        const imageOptRating = imageOptScore >= 90 ? "AAA" : imageOptScore >= 70 ? "AA" : imageOptScore >= 50 ? "A" : "Fail";

        // --- 5. LOAD SPEED (15%) ---
        let loadSpeedScore = 100;
        const loadSpeedDetails: string[] = [];
        if (loadTime > 8000) { loadSpeedScore -= 40; loadSpeedDetails.push(`⚠ Load time ${(loadTime / 1000).toFixed(1)}s — critical (target < 3s)`); }
        else if (loadTime > 5000) { loadSpeedScore -= 25; loadSpeedDetails.push(`Load time ${(loadTime / 1000).toFixed(1)}s — slow (target < 3s)`); }
        else if (loadTime > 3000) { loadSpeedScore -= 10; loadSpeedDetails.push(`Load time ${(loadTime / 1000).toFixed(1)}s — needs improvement (target < 3s)`); }
        else { loadSpeedDetails.push(`✓ Load time ${(loadTime / 1000).toFixed(1)}s (fast)`); }

        const loadSpeedRating = loadSpeedScore >= 90 ? "AAA" : loadSpeedScore >= 70 ? "AA" : loadSpeedScore >= 50 ? "A" : "Fail";

        // --- WEIGHTED PERFORMANCE SCORE ---
        pageWeightScore = Math.max(0, pageWeightScore);
        resourceCountScore = Math.max(0, resourceCountScore);
        domScore = Math.max(0, domScore);
        imageOptScore = Math.max(0, imageOptScore);
        loadSpeedScore = Math.max(0, loadSpeedScore);

        const perfScore = Math.round(
            pageWeightScore * 0.25 +
            resourceCountScore * 0.20 +
            domScore * 0.15 +
            imageOptScore * 0.25 +
            loadSpeedScore * 0.15
        );

        // ACTIONABLE RECOMMENDATIONS
        const recommendations: { priority: string; category: string; message: string }[] = [];
        if (totalSize > 3 * 1024 * 1024) recommendations.push({ priority: "High", category: "Page Weight", message: `Reduce total page size from ${formatSize(totalSize)} to under 3MB. Audit large resources.` });
        if (totalJsSize > 500 * 1024) recommendations.push({ priority: "High", category: "JavaScript", message: `${formatSize(totalJsSize)} of JS loaded. Use code splitting, tree shaking, and lazy imports.` });
        if (largeImages.length > 0) recommendations.push({ priority: "High", category: "Images", message: `${largeImages.length} image(s) over 200KB. Use WebP/AVIF, resize to display dimensions, and add loading="lazy".` });
        if (totalRequests > 80) recommendations.push({ priority: "Medium", category: "Requests", message: `${totalRequests} HTTP requests. Bundle JS/CSS, use image sprites, and inline critical resources.` });
        if (domElements > 1500) recommendations.push({ priority: "Medium", category: "DOM", message: `${domElements} DOM elements. Virtualize long lists, remove hidden elements, simplify layout.` });
        if (loadTime > 3000) recommendations.push({ priority: "Medium", category: "Speed", message: `${(loadTime / 1000).toFixed(1)}s load time. Defer non-critical JS, preload key resources, use CDN.` });
        if (cssResources.length > 5) recommendations.push({ priority: "Low", category: "CSS", message: `${cssResources.length} CSS files. Consolidate and remove unused styles with PurgeCSS.` });

        const perfIssues: string[] = [];
        if (perfScore < 70) perfIssues.push("Overall performance needs significant improvement");
        if (loadTime > 5000) perfIssues.push(`Slow page load (${(loadTime / 1000).toFixed(1)}s) — exceeds 5s threshold`);
        if (totalSize > 5 * 1024 * 1024) perfIssues.push(`Excessive page size (${formatSize(totalSize)})`);
        if (totalRequests > 100) perfIssues.push(`Too many HTTP requests (${totalRequests})`);

        const performanceResult: PerformanceResult = {
            score: perfScore,
            loadTime,
            totalResources: totalRequests,
            totalPageSize: formatSize(totalSize),
            totalPageSizeBytes: totalSize,
            domElements,
            resourceBreakdown: resourceBreakdown.map((r) => ({
                type: r.type,
                count: r.count,
                size: formatSize(r.size),
                sizeBytes: r.size,
            })),
            metrics: {
                pageWeight: { score: pageWeightScore, rating: pageWeightRating, details: pageWeightDetails },
                resourceCount: { score: resourceCountScore, rating: resourceCountRating, details: resourceCountDetails },
                domComplexity: { score: domScore, rating: domRating, details: domDetails },
                imageOptimization: { score: imageOptScore, rating: imageOptRating, details: imageOptDetails },
                caching: { score: loadSpeedScore, rating: loadSpeedRating, details: loadSpeedDetails },
            },
            recommendations,
            issues: perfIssues,
        };

        // ===== ACCESSIBILITY =====
        const a11yData = await page.evaluate(() => {
            const imgs = Array.from(document.querySelectorAll("img"));
            const imgsNoAltList = imgs.filter((i) => !i.hasAttribute("alt"));

            const links = Array.from(document.querySelectorAll("a"));
            const linksNoTextList = links.filter((l) => !(l.textContent || "").trim() && !l.getAttribute("aria-label"));

            const buttons = Array.from(document.querySelectorAll("button, [role='button']"));
            const btnsNoLabelList = buttons.filter((b) => !(b.textContent || "").trim() && !b.getAttribute("aria-label"));

            const inputs = Array.from(document.querySelectorAll("input, select, textarea"));
            const inputsNoLabelList = inputs.filter((i) => {
                const id = i.getAttribute("id");
                const hasLabel = id ? document.querySelector(`label[for="${id}"]`) : null;
                const ariaLabel = i.getAttribute("aria-label");
                const ariaLabelledBy = i.getAttribute("aria-labelledby");
                return !hasLabel && !ariaLabel && !ariaLabelledBy;
            });

            const ariaElements = document.querySelectorAll("[aria-label], [aria-labelledby], [aria-describedby], [role]");

            return {
                imgsNoAlt: imgsNoAltList.length,
                linksNoText: linksNoTextList.length,
                btnsNoLabel: btnsNoLabelList.length,
                inputsNoLabel: inputsNoLabelList.length,
                ariaUsage: ariaElements.length,
                details: {
                    imagesNoAlt: imgsNoAltList.map((i) => ({
                        src: (i.src || i.getAttribute("data-src") || "").substring(0, 200),
                        width: i.width,
                        height: i.height,
                    })),
                    linksNoText: linksNoTextList.map((l) => ({
                        href: (l.href || "").substring(0, 200),
                        html: l.outerHTML.substring(0, 150),
                    })),
                    buttonsNoLabel: btnsNoLabelList.map((b) => ({
                        tag: b.tagName.toLowerCase(),
                        html: b.outerHTML.substring(0, 150),
                    })),
                    inputsNoLabel: inputsNoLabelList.map((inp) => ({
                        tag: inp.tagName.toLowerCase(),
                        type: inp.getAttribute("type") || "text",
                        name: inp.getAttribute("name") || "",
                        id: inp.getAttribute("id") || "",
                    })),
                },
            };
        });

        // Capture per-element screenshots for each a11y category
        const MAX_ELEMENT_SCREENSHOTS = 15;

        async function captureElementScreenshots(
            selector: string,
            filterFn: string,
            color: string,
            limit: number
        ): Promise<(string | null)[]> {
            const handles = await page.$$(selector);
            const screenshots: (string | null)[] = [];

            // Filter elements in-page and get indices
            const indices: number[] = await page.evaluate(
                (sel: string, fn: string) => {
                    const els = Array.from(document.querySelectorAll(sel));
                    const result: number[] = [];
                    els.forEach((el, idx) => {
                        if ((new Function('el', `return ${fn}`) as (el: Element) => boolean)(el)) {
                            result.push(idx);
                        }
                    });
                    return result;
                },
                selector, filterFn
            );

            for (let i = 0; i < Math.min(indices.length, limit); i++) {
                const handle = handles[indices[i]];
                if (!handle) { screenshots.push(null); continue; }
                try {
                    // Scroll element into view and add highlight
                    await page.evaluate(
                        (el: Element, clr: string) => {
                            el.scrollIntoView({ block: 'center', behavior: 'instant' });
                            const htmlEl = el as HTMLElement;
                            htmlEl.style.outline = `3px solid ${clr}`;
                            htmlEl.style.outlineOffset = '2px';
                            htmlEl.style.boxShadow = `0 0 12px ${clr}80`;
                        },
                        handle, color
                    );
                    await new Promise(r => setTimeout(r, 150));

                    // Take viewport screenshot (captures element in context)
                    const buf = await page.screenshot({ type: 'webp', quality: 65, fullPage: false });
                    screenshots.push(`data:image/webp;base64,${Buffer.from(buf).toString('base64')}`);

                    // Remove highlight
                    await page.evaluate((el: Element) => {
                        const htmlEl = el as HTMLElement;
                        htmlEl.style.outline = '';
                        htmlEl.style.outlineOffset = '';
                        htmlEl.style.boxShadow = '';
                    }, handle);
                } catch {
                    screenshots.push(null);
                }
            }

            // Fill remaining with null
            for (let i = screenshots.length; i < indices.length; i++) {
                screenshots.push(null);
            }

            // Dispose handles
            for (const h of handles) { await h.dispose(); }

            return screenshots;
        }

        // Capture per-element screenshots for each category
        const imgScreenshots = a11yData.imgsNoAlt > 0
            ? await captureElementScreenshots('img', '!el.hasAttribute("alt")', '#f97316', MAX_ELEMENT_SCREENSHOTS)
            : [];
        const linkScreenshots2 = a11yData.linksNoText > 0
            ? await captureElementScreenshots('a', '!(el.textContent || "").trim() && !el.getAttribute("aria-label")', '#a855f7', MAX_ELEMENT_SCREENSHOTS)
            : [];
        const btnScreenshots = a11yData.btnsNoLabel > 0
            ? await captureElementScreenshots('button, [role="button"]', '!(el.textContent || "").trim() && !el.getAttribute("aria-label")', '#eab308', MAX_ELEMENT_SCREENSHOTS)
            : [];
        const inputScreenshots = a11yData.inputsNoLabel > 0
            ? await captureElementScreenshots(
                'input, select, textarea',
                '(() => { const id = el.getAttribute("id"); const hasLabel = id ? document.querySelector(`label[for="${id}"]`) : null; return !hasLabel && !el.getAttribute("aria-label") && !el.getAttribute("aria-labelledby"); })()',
                '#ec4899', MAX_ELEMENT_SCREENSHOTS
            )
            : [];

        // Attach screenshots to detail items
        a11yData.details.imagesNoAlt = a11yData.details.imagesNoAlt.map((item: any, i: number) => ({
            ...item,
            screenshot: imgScreenshots[i] || null,
        }));
        a11yData.details.linksNoText = a11yData.details.linksNoText.map((item: any, i: number) => ({
            ...item,
            screenshot: linkScreenshots2[i] || null,
        }));
        a11yData.details.buttonsNoLabel = a11yData.details.buttonsNoLabel.map((item: any, i: number) => ({
            ...item,
            screenshot: btnScreenshots[i] || null,
        }));
        a11yData.details.inputsNoLabel = a11yData.details.inputsNoLabel.map((item: any, i: number) => ({
            ...item,
            screenshot: inputScreenshots[i] || null,
        }));

        const a11yIssues: string[] = [];
        if (a11yData.imgsNoAlt > 0) a11yIssues.push(`${a11yData.imgsNoAlt} image(s) without alt text`);
        if (a11yData.linksNoText > 0) a11yIssues.push(`${a11yData.linksNoText} link(s) without descriptive text`);
        if (a11yData.btnsNoLabel > 0) a11yIssues.push(`${a11yData.btnsNoLabel} button(s) without labels`);
        if (a11yData.inputsNoLabel > 0) a11yIssues.push(`${a11yData.inputsNoLabel} form input(s) without labels`);

        const a11yScore = Math.max(0, 100 - a11yIssues.length * 20);

        // Capture per-category accessibility screenshots
        const a11yScreenshots: { label: string; image: string }[] = [];
        const a11yCategoryScreenshots: Record<string, string | null> = {};

        if (a11yData.imgsNoAlt > 0) {
            const shot = await captureHighlighted(
                'img', '!el.hasAttribute("alt")', '#f97316', 'No Alt'
            );
            a11yCategoryScreenshots.imagesNoAlt = shot;
            if (shot) a11yScreenshots.push({ label: `${a11yData.imgsNoAlt} image(s) tanpa alt text`, image: shot });
        }
        if (a11yData.linksNoText > 0) {
            const shot = await captureHighlighted(
                'a',
                '!(el.textContent || "").trim() && !el.getAttribute("aria-label")',
                '#a855f7', 'No Text'
            );
            a11yCategoryScreenshots.linksNoText = shot;
            if (shot) a11yScreenshots.push({ label: `${a11yData.linksNoText} link tanpa teks`, image: shot });
        }
        if (a11yData.btnsNoLabel > 0) {
            const shot = await captureHighlighted(
                'button, [role="button"]',
                '!(el.textContent || "").trim() && !el.getAttribute("aria-label")',
                '#eab308', 'No Label'
            );
            a11yCategoryScreenshots.buttonsNoLabel = shot;
            if (shot) a11yScreenshots.push({ label: `${a11yData.btnsNoLabel} button tanpa label`, image: shot });
        }
        if (a11yData.inputsNoLabel > 0) {
            const shot = await captureHighlighted(
                'input, select, textarea',
                '(() => { const id = el.getAttribute("id"); const hasLabel = id ? document.querySelector(`label[for="${id}"]`) : null; return !hasLabel && !el.getAttribute("aria-label") && !el.getAttribute("aria-labelledby"); })()',
                '#ec4899', 'No Label'
            );
            a11yCategoryScreenshots.inputsNoLabel = shot;
            if (shot) a11yScreenshots.push({ label: `${a11yData.inputsNoLabel} input tanpa label`, image: shot });
        }

        const accessibilityResult: AccessibilityResult = {
            score: a11yScore,
            imagesWithoutAlt: a11yData.imgsNoAlt,
            linksWithoutText: a11yData.linksNoText,
            buttonsWithoutLabels: a11yData.btnsNoLabel,
            inputsWithoutLabels: a11yData.inputsNoLabel,
            ariaUsage: a11yData.ariaUsage,
            issues: a11yIssues,
            screenshots: a11yScreenshots,
            details: {
                ...a11yData.details,
                categoryScreenshots: a11yCategoryScreenshots,
            } as any,
        };

        // ===== RESPONSIVE TEST =====
        let responsiveScore = 100;
        const responsiveIssues: string[] = [];
        let mobileScreenshot: string | null = null;

        // 1. Get desktop visibility counts before switching
        const desktopElements = await page.evaluate(() => {
            const getVisible = (selector: string) => {
                return Array.from(document.querySelectorAll(selector)).filter(el => {
                    const rect = el.getBoundingClientRect();
                    return rect.width > 0 && rect.height > 0 && window.getComputedStyle(el).display !== 'none';
                }).length;
            };
            return {
                nav: getVisible('nav, header a, header button, .menu a'),
                content: getVisible('h1, h2, h3, p, img, article')
            };
        });

        // Switch to mobile viewport (iPhone 12/13 size)
        await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });

        // Wait a bit for layout to adjust or animations to finish
        await new Promise(r => setTimeout(r, 1000));

        // Take mobile screenshot
        try {
            const buf = await page.screenshot({ type: "jpeg", quality: 60 });
            mobileScreenshot = `data:image/jpeg;base64,${Buffer.from(buf).toString("base64")}`;
        } catch { /* ignore */ }

        // Check viewport meta
        const hasViewportMeta = !!seoResult.viewport && seoResult.viewport.includes("width=device-width");
        if (!hasViewportMeta) {
            responsiveScore -= 30;
            responsiveIssues.push("Missing or incorrect viewport meta tag.");
        }

        // Emulate mobile layout and calculate layout metrics
        const mobileMetrics = await page.evaluate(() => {
            const hasHorizontalScroll = document.documentElement.scrollWidth > window.innerWidth;

            // Tap targets checking (simplified: check if small tap targets exist)
            const tapTargets = Array.from(document.querySelectorAll('a, button, input, select'));
            const tapElements: { html: string; width: number; height: number; x: number; y: number }[] = [];

            tapTargets.forEach(el => {
                const rect = el.getBoundingClientRect();
                if (rect.width > 0 && rect.height > 0) {
                    if (rect.width < 44 || rect.height < 44) {
                        if (tapElements.length < 20) {
                            tapElements.push({
                                html: el.outerHTML.substring(0, 150) + (el.outerHTML.length > 150 ? "..." : ""),
                                width: Math.round(rect.width),
                                height: Math.round(rect.height),
                                x: Math.round(rect.x),
                                y: Math.round(rect.y)
                            });
                        }
                    }
                }
            });

            const getVisible = (selector: string) => {
                return Array.from(document.querySelectorAll(selector)).filter(el => {
                    const rect = el.getBoundingClientRect();
                    return rect.width > 0 && rect.height > 0 && window.getComputedStyle(el).display !== 'none';
                }).length;
            };

            const mobileElements = {
                nav: getVisible('nav, header a, header button, .menu a'),
                content: getVisible('h1, h2, h3, p, img, article')
            };

            return {
                hasHorizontalScroll,
                tapIssues: tapElements.length,
                tapTotal: tapTargets.length,
                tapElements,
                mobileElements
            };
        });

        if (mobileMetrics.hasHorizontalScroll) {
            responsiveScore -= 30;
            responsiveIssues.push("Page has horizontal scroll on mobile devices (layout overflow).");
        }

        if (mobileMetrics.tapIssues > 0) {
            // penalize slightly based on proportion, up to 20 pts max
            const tapPenalty = Math.min(20, Math.round((mobileMetrics.tapIssues / Math.max(1, mobileMetrics.tapTotal)) * 40));
            responsiveScore -= tapPenalty;
            if (tapPenalty > 5) {
                responsiveIssues.push(`${mobileMetrics.tapIssues} interactive elements are too small (target size < 44px).`);
            }
        }

        const desktopTotal = desktopElements.nav + desktopElements.content;
        const mobileTotal = mobileMetrics.mobileElements.nav + mobileMetrics.mobileElements.content;
        const hiddenOnMobile = Math.max(0, desktopTotal - mobileTotal);

        if (hiddenOnMobile > desktopTotal * 0.3) {
            responsiveScore -= 20;
            responsiveIssues.push(`High element inconsistency: ${hiddenOnMobile} elements from desktop are hidden on mobile.`);
        }

        const responsiveResult: ResponsiveResult = {
            score: Math.max(0, responsiveScore),
            isResponsive: !mobileMetrics.hasHorizontalScroll && hasViewportMeta,
            hasViewportMeta,
            horizontalScrollMobile: mobileMetrics.hasHorizontalScroll,
            mobileScreenshot,
            elementConsistency: {
                desktopVisible: desktopTotal,
                mobileVisible: mobileTotal,
                hiddenOnMobile
            },
            tapTargets: {
                issues: mobileMetrics.tapIssues,
                total: mobileMetrics.tapTotal,
                elements: mobileMetrics.tapElements
            },
            issues: responsiveIssues
        };

        // ===== SECURITY STANDARDS =====
        // 1. Fetch HTTP headers via server-side fetch (not page.evaluate — headers are server-sent)
        const securityHeaders: SecurityResult["headers"] = {
            hsts: { present: false, value: null },
            csp: { present: false, value: null },
            xFrameOptions: { present: false, value: null },
            xContentTypeOptions: { present: false, value: null },
            referrerPolicy: { present: false, value: null },
            permissionsPolicy: { present: false, value: null },
        };

        try {
            const headRes = await fetch(targetUrl, { method: "GET", signal: AbortSignal.timeout(8000) }).catch(() => null);
            if (headRes) {
                const h = headRes.headers;
                securityHeaders.hsts = { present: h.has("strict-transport-security"), value: h.get("strict-transport-security") };
                securityHeaders.csp = { present: h.has("content-security-policy"), value: h.get("content-security-policy")?.substring(0, 300) ?? null };
                securityHeaders.xFrameOptions = { present: h.has("x-frame-options"), value: h.get("x-frame-options") };
                securityHeaders.xContentTypeOptions = { present: h.has("x-content-type-options"), value: h.get("x-content-type-options") };
                securityHeaders.referrerPolicy = { present: h.has("referrer-policy"), value: h.get("referrer-policy") };
                securityHeaders.permissionsPolicy = { present: h.has("permissions-policy"), value: h.get("permissions-policy")?.substring(0, 200) ?? null };
            }
        } catch { /* ignore fetch errors */ }

        // 2. Check HTTPS
        const isHttps = targetUrl.startsWith("https://");

        // 3. Mixed content + inline script analysis (in page)
        const securityPageData = await page.evaluate(() => {
            // Mixed content: http:// resources on an https:// page
            const mixedItems: string[] = [];
            document.querySelectorAll("img[src], script[src], link[href], iframe[src], video[src], audio[src]").forEach((el) => {
                const src = el.getAttribute("src") || el.getAttribute("href") || "";
                if (src.startsWith("http://")) mixedItems.push(src.substring(0, 150));
            });

            // Dangerous inline scripts (event handlers on elements)
            const dangerousAttrs = ["onclick", "onload", "onerror", "onmouseover", "onfocus", "onchange", "onsubmit"];
            let inlineScriptCount = 0;
            document.querySelectorAll("*").forEach((el) => {
                for (const attr of dangerousAttrs) {
                    if (el.hasAttribute(attr)) { inlineScriptCount++; break; }
                }
            });
            // Also count <script> tags without src
            document.querySelectorAll("script:not([src])").forEach(() => inlineScriptCount++);

            return { mixedItems: mixedItems.slice(0, 20), inlineScriptCount };
        });

        // 4. Cookie checks (via document.cookie — only non-HttpOnly cookies are visible here)
        const visibleCookies = await page.evaluate(() =>
            document.cookie
                .split(";")
                .map(c => c.trim())
                .filter(Boolean)
                .map(c => c.split("=")[0].trim())
        );
        // Visible cookies (readable via JS) are inherently missing HttpOnly
        const cookieIssues: SecurityResult["cookieIssues"] = visibleCookies.map(name => ({
            name,
            missingSecure: !isHttps,
            missingHttpOnly: true, // readable from JS = no HttpOnly
        }));

        // 5. Score calculation
        let securityScore = 100;
        const securityIssues: string[] = [];
        const securityRecs: SecurityResult["recommendations"] = [];

        if (!isHttps) {
            securityScore -= 30;
            securityIssues.push("Site is not served over HTTPS");
            securityRecs.push({ priority: "Critical", check: "HTTPS", message: "Move all traffic to HTTPS. Obtain an SSL/TLS certificate (e.g. Let's Encrypt)." });
        }
        if (!securityHeaders.hsts.present) {
            securityScore -= 15;
            securityIssues.push("Missing Strict-Transport-Security (HSTS) header");
            securityRecs.push({ priority: "High", check: "HSTS", message: "Add: Strict-Transport-Security: max-age=31536000; includeSubDomains; preload" });
        }
        if (!securityHeaders.csp.present) {
            securityScore -= 15;
            securityIssues.push("Missing Content-Security-Policy (CSP) header");
            securityRecs.push({ priority: "High", check: "CSP", message: "Define a Content-Security-Policy to prevent XSS and injection attacks." });
        }
        if (!securityHeaders.xFrameOptions.present) {
            securityScore -= 10;
            securityIssues.push("Missing X-Frame-Options header (clickjacking risk)");
            securityRecs.push({ priority: "Medium", check: "X-Frame-Options", message: "Add: X-Frame-Options: DENY or SAMEORIGIN to prevent clickjacking." });
        }
        if (!securityHeaders.xContentTypeOptions.present) {
            securityScore -= 5;
            securityIssues.push("Missing X-Content-Type-Options header");
            securityRecs.push({ priority: "Medium", check: "X-Content-Type-Options", message: "Add: X-Content-Type-Options: nosniff to prevent MIME sniffing." });
        }
        if (!securityHeaders.referrerPolicy.present) {
            securityScore -= 5;
            securityIssues.push("Missing Referrer-Policy header");
            securityRecs.push({ priority: "Low", check: "Referrer-Policy", message: "Add: Referrer-Policy: strict-origin-when-cross-origin" });
        }
        if (isHttps && securityPageData.mixedItems.length > 0) {
            securityScore -= Math.min(20, securityPageData.mixedItems.length * 5);
            securityIssues.push(`${securityPageData.mixedItems.length} mixed content resource(s) loaded over HTTP`);
            securityRecs.push({ priority: "High", check: "Mixed Content", message: `Update ${securityPageData.mixedItems.length} HTTP resource(s) to HTTPS to prevent browser warnings and security risks.` });
        }
        if (cookieIssues.length > 0) {
            securityScore -= Math.min(10, cookieIssues.length * 3);
            securityIssues.push(`${cookieIssues.length} cookie(s) accessible via JavaScript (missing HttpOnly flag)`);
            securityRecs.push({ priority: "Medium", check: "Cookies", message: `Set HttpOnly and Secure flags on session/auth cookies.` });
        }

        const securityResult: SecurityResult = {
            score: Math.max(0, securityScore),
            isHttps,
            headers: securityHeaders,
            mixedContent: { count: securityPageData.mixedItems.length, items: securityPageData.mixedItems },
            dangerousInlineScripts: securityPageData.inlineScriptCount,
            cookieIssues,
            issues: securityIssues,
            recommendations: securityRecs,
        };

        // ===== TECH STACK DETECTION =====
        // Server-side: grab headers from previous security fetch (already done)
        // We need to re-fetch for tech-specific headers, but let's reuse security headers already captured + page evaluation
        let techServerInfo: { server: string | null; poweredBy: string | null } = { server: null, poweredBy: null };
        try {
            const techRes = await fetch(targetUrl, { method: "HEAD", signal: AbortSignal.timeout(5000) }).catch(() => null);
            if (techRes) {
                techServerInfo = {
                    server: techRes.headers.get("server"),
                    poweredBy: techRes.headers.get("x-powered-by"),
                };
            }
        } catch { /* ignore */ }

        // In-browser tech detection
        const techPageData = await page.evaluate(() => {
            const detected: { name: string; category: string; version?: string; confidence: string }[] = [];

            const win = window as any;
            const doc = document;

            function add(name: string, category: string, confidence: string, version?: string) {
                if (!detected.find(d => d.name === name)) {
                    detected.push({ name, category, version, confidence });
                }
            }

            // ---- JS Frameworks ----
            if (win.React || win.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
                add("React", "JS Framework", "high", win.React?.version);
            }
            if (win.__NEXT_DATA__ || doc.getElementById("__NEXT_DATA__")) {
                add("Next.js", "JS Framework", "high");
            }
            if (win.Vue || win.__VUE__) {
                add("Vue.js", "JS Framework", "high", win.Vue?.version);
            }
            if (win.__NUXT__ || win.$nuxt) {
                add("Nuxt.js", "JS Framework", "high");
            }
            if (win.angular || doc.querySelector("[ng-version]") || doc.querySelector("[ng-app]")) {
                const ngVersion = doc.querySelector("[ng-version]")?.getAttribute("ng-version") || undefined;
                add("Angular", "JS Framework", "high", ngVersion);
            }
            if (win.Svelte || doc.querySelector("[data-svelte-h]") || doc.querySelector(".svelte-")) {
                add("Svelte", "JS Framework", "medium");
            }
            if (win.jQuery || win.$?.fn?.jquery) {
                add("jQuery", "JS Library", "high", win.$.fn?.jquery || win.jQuery?.fn?.jquery);
            }

            // ---- CSS Frameworks ----
            const stylesheets = Array.from(doc.querySelectorAll("link[rel='stylesheet']")).map(l => l.getAttribute("href") || "");
            const allClasses = doc.body ? doc.body.innerHTML.substring(0, 50000) : "";

            if (stylesheets.some(s => s.includes("bootstrap")) || allClasses.includes("class=\"container") && doc.querySelector(".row.col")) {
                add("Bootstrap", "CSS Framework", "medium");
            }
            if (stylesheets.some(s => s.includes("tailwind")) ||
                doc.querySelector('[class*="flex-"], [class*="text-"], [class*="bg-"], [class*="px-"], [class*="py-"]')?.getAttribute("class")?.match(/\b(flex|text|bg|px|py|mt|mb|mr|ml|pt|pb|grid|gap|w-|h-|rounded|border|shadow)-/)) {
                add("Tailwind CSS", "CSS Framework", "medium");
            }
            if (stylesheets.some(s => s.includes("bulma"))) {
                add("Bulma", "CSS Framework", "high");
            }
            if (stylesheets.some(s => s.includes("materialize")) || doc.querySelector(".material-icons, .btn.waves-effect")) {
                add("Materialize", "CSS Framework", "medium");
            }
            if (stylesheets.some(s => s.includes("foundation"))) {
                add("Foundation", "CSS Framework", "high");
            }
            if (stylesheets.some(s => s.includes("font-awesome") || s.includes("fontawesome")) ||
                doc.querySelector(".fa, .fas, .far, .fab, .fal")) {
                add("Font Awesome", "Icon Library", "high");
            }

            // ---- CMS / Platforms ----
            const bodyHtml = doc.documentElement.outerHTML.substring(0, 30000);
            if (bodyHtml.includes("/wp-content/") || bodyHtml.includes("/wp-includes/") || doc.querySelector("link[rel='https://api.w.org/']")) {
                const wpVersion = doc.querySelector('meta[name="generator"]')?.getAttribute("content")?.match(/WordPress ([\d.]+)/)?.[1];
                add("WordPress", "CMS", "high", wpVersion);
            }
            if (win.Shopify || bodyHtml.includes("cdn.shopify.com")) {
                add("Shopify", "E-commerce", "high");
            }
            if (doc.querySelector('meta[content*="Wix.com"]') || bodyHtml.includes("static.wix.com") || bodyHtml.includes("wix-thunderbolt")) {
                add("Wix", "Website Builder", "high");
            }
            if (bodyHtml.includes("squarespace.com") || bodyHtml.includes("squarespace-cdn")) {
                add("Squarespace", "Website Builder", "high");
            }
            if (bodyHtml.includes("webflow.com") || doc.querySelector('[data-wf-site], [data-wf-page]')) {
                add("Webflow", "Website Builder", "high");
            }
            if (bodyHtml.includes("ghost.org") || doc.querySelector("meta[name='generator'][content*='Ghost']")) {
                const ghostVersion = doc.querySelector("meta[name='generator']")?.getAttribute("content")?.match(/Ghost ([\d.]+)/)?.[1];
                add("Ghost", "CMS", "high", ghostVersion);
            }
            if (doc.querySelector('meta[name="generator"][content*="Joomla"]') || bodyHtml.includes("/media/jui/")) {
                add("Joomla", "CMS", "high");
            }
            if (doc.querySelector('meta[name="generator"][content*="Drupal"]') || bodyHtml.includes("/sites/default/files/")) {
                add("Drupal", "CMS", "medium");
            }

            // ---- Analytics ----
            const scripts = Array.from(doc.querySelectorAll("script[src]")).map(s => s.getAttribute("src") || "");
            const inlineScripts = Array.from(doc.querySelectorAll("script:not([src])")).map(s => s.textContent || "").join(" ");

            if (win.gtag || scripts.some(s => s.includes("googletagmanager.com/gtag") || s.includes("google-analytics.com"))) {
                add("Google Analytics", "Analytics", "high");
            }
            if (win.google_tag_manager || scripts.some(s => s.includes("googletagmanager.com/gtm"))) {
                add("Google Tag Manager", "Analytics", "high");
            }
            if (win._fbq || win.fbq || scripts.some(s => s.includes("connect.facebook.net"))) {
                add("Meta Pixel", "Analytics", "high");
            }
            if (scripts.some(s => s.includes("hotjar.com") || s.includes("static.hotjar.com"))) {
                add("Hotjar", "Analytics", "high");
            }
            if (win.mixpanel || scripts.some(s => s.includes("cdn.mxpnl.com"))) {
                add("Mixpanel", "Analytics", "high");
            }
            if (win.amplitude || scripts.some(s => s.includes("cdn.amplitude.com"))) {
                add("Amplitude", "Analytics", "high");
            }
            if (scripts.some(s => s.includes("clarity.ms"))) {
                add("Microsoft Clarity", "Analytics", "high");
            }
            if (win.dataLayer || inlineScripts.includes("dataLayer")) {
                add("Google Tag Manager (dataLayer)", "Analytics", "medium");
            }

            // ---- UI Libraries ----
            if (win.Framer || scripts.some(s => s.includes("framer.com") || s.includes("framerusercontent.com"))) {
                add("Framer", "UI Library / Builder", "high");
            }
            if (win.motion || scripts.some(s => s.includes("framer-motion"))) {
                add("Framer Motion", "Animation Library", "medium");
            }
            if (win.gsap || scripts.some(s => s.includes("greensock") || s.includes("gsap"))) {
                add("GSAP", "Animation Library", "high");
            }
            if (win.Swiper || doc.querySelector(".swiper, .swiper-container")) {
                add("Swiper", "UI Library", "high");
            }
            if (win.Chart || win.Chart?.js || scripts.some(s => s.includes("chart.js"))) {
                add("Chart.js", "Data Visualization", "high");
            }
            if (win.d3 || scripts.some(s => s.includes("d3js.org") || s.includes("/d3."))) {
                add("D3.js", "Data Visualization", "high");
            }
            if (win.THREE || scripts.some(s => s.includes("three.js") || s.includes("threejs"))) {
                add("Three.js", "3D / WebGL", "high");
            }
            if (win.Stripe || scripts.some(s => s.includes("js.stripe.com"))) {
                add("Stripe", "Payment", "high");
            }
            if (scripts.some(s => s.includes("maps.googleapis.com"))) {
                add("Google Maps", "Maps", "high");
            }
            if (scripts.some(s => s.includes("recaptcha.net") || s.includes("recaptcha/api.js"))) {
                add("Google reCAPTCHA", "Security", "high");
            }
            if (scripts.some(s => s.includes("intercom.io") || s.includes("widget.intercom.io"))) {
                add("Intercom", "Customer Support", "high");
            }
            if (win.Sentry || scripts.some(s => s.includes("browser.sentry-cdn.com"))) {
                add("Sentry", "Error Tracking", "high");
            }
            if (win.axios || scripts.some(s => s.includes("axios.min"))) {
                add("Axios", "HTTP Client", "medium");
            }
            if (win._ && win._.VERSION) {
                add("Lodash", "JS Utility", "high", win._.VERSION);
            }
            if (win.moment || win.moment?.version) {
                add("Moment.js", "JS Utility", "high", win.moment?.version);
            }
            if (win.Typekit || stylesheets.some(s => s.includes("typekit"))) {
                add("Adobe Typekit / Fonts", "Fonts", "high");
            }
            if (stylesheets.some(s => s.includes("fonts.googleapis.com")) || scripts.some(s => s.includes("fonts.googleapis.com"))) {
                add("Google Fonts", "Fonts", "high");
            }
            if (scripts.some(s => s.includes("cdnjs.cloudflare.com"))) {
                add("Cloudflare CDN", "CDN", "medium");
            }
            if (scripts.some(s => s.includes("unpkg.com"))) {
                add("unpkg CDN", "CDN", "medium");
            }
            if (scripts.some(s => s.includes("jsdelivr.net"))) {
                add("jsDelivr CDN", "CDN", "medium");
            }

            return detected;
        });

        // Assign emoji/icon identifier per category for UI rendering
        const categoryIcon: Record<string, string> = {
            "JS Framework": "⚛️",
            "JS Library": "📦",
            "CSS Framework": "🎨",
            "Icon Library": "🔣",
            "CMS": "📝",
            "E-commerce": "🛒",
            "Website Builder": "🏗️",
            "Analytics": "📊",
            "Animation Library": "✨",
            "UI Library": "🖼️",
            "UI Library / Builder": "🖼️",
            "Data Visualization": "📈",
            "3D / WebGL": "🎮",
            "Payment": "💳",
            "Maps": "🗺️",
            "Security": "🛡️",
            "Customer Support": "💬",
            "Error Tracking": "🐛",
            "HTTP Client": "🌐",
            "JS Utility": "🔧",
            "Fonts": "🔤",
            "CDN": "☁️",
        };

        // ===== LANGUAGE DETECTION =====
        // Detect from in-page script analysis (TypeScript source maps, module types)
        const langPageData = await page.evaluate(() => {
            const langs: { name: string; confidence: string; hint: string }[] = [];
            const scripts = Array.from(document.querySelectorAll("script"));
            const stylesheets = Array.from(document.querySelectorAll("link[rel='stylesheet']")).map(l => l.getAttribute("href") || "");
            const bodyHtml = document.documentElement.outerHTML.substring(0, 20000);

            // JavaScript — always present in browser context
            langs.push({ name: "JavaScript", confidence: "high", hint: "Browser runtime" });

            // TypeScript — source maps often reference .ts files, or Next.js / Angular are TS-first
            const hasTsSourceMap = scripts.some(s => {
                const src = s.getAttribute("src") || "";
                const content = s.textContent || "";
                return src.includes(".ts") || content.includes("sourceMappingURL") && content.includes(".ts");
            });
            const hasModuleType = scripts.some(s => s.getAttribute("type") === "module");
            if (hasTsSourceMap || bodyHtml.includes("__TSX__") || bodyHtml.includes("ts-loader")) {
                langs.push({ name: "TypeScript", confidence: "high", hint: "Source map / loader detected" });
            } else if (hasModuleType) {
                langs.push({ name: "TypeScript", confidence: "medium", hint: "ESModule scripts (likely TS)" });
            }

            // SCSS/Sass - check for source map refs in stylesheets or style comments
            const hasSass = stylesheets.some(s => s.includes(".scss") || s.includes("sass")) ||
                bodyHtml.includes("sourceMappingURL") && bodyHtml.includes(".scss");
            if (hasSass) langs.push({ name: "Sass / SCSS", confidence: "medium", hint: "stylesheet source" });

            // PHP — WordPress already tells us, but also check common PHP patterns
            const hasPhp = bodyHtml.includes(".php") || bodyHtml.includes("phpmailer") || bodyHtml.includes("PHPSESSID");
            if (hasPhp) langs.push({ name: "PHP", confidence: "medium", hint: "PHP patterns in markup" });

            // HTML (always)
            const htmlVersion = document.doctype?.publicId?.includes("4.0") ? "HTML 4" :
                document.doctype?.publicId?.includes("XHTML") ? "XHTML" : "HTML5";
            langs.push({ name: htmlVersion, confidence: "high", hint: "Document doctype" });

            // CSS (always)
            langs.push({ name: "CSS", confidence: "high", hint: "Stylesheet present" });

            return langs;
        });

        // Backend language from HTTP headers + framework inference
        const langItems: { name: string; category: string; confidence: "high" | "medium" | "low"; version?: string; icon: string }[] = [];
        const addLang = (name: string, confidence: "high" | "medium" | "low", version?: string) => {
            if (!langItems.find(l => l.name === name)) {
                langItems.push({ name, category: "Language", confidence, version, icon: "🗣️" });
            }
        };

        // Server header clues
        const sv = techServerInfo.server?.toLowerCase() || "";
        const pb = techServerInfo.poweredBy?.toLowerCase() || "";

        if (pb.includes("php")) {
            const ver = techServerInfo.poweredBy?.match(/PHP\/([\d.]+)/i)?.[1];
            addLang("PHP", "high", ver);
        }
        if (pb.includes("express") || pb.includes("node")) addLang("Node.js", "high");
        if (pb.includes("python") || pb.includes("django") || pb.includes("flask") || pb.includes("fastapi")) addLang("Python", "high");
        if (pb.includes("ruby") || pb.includes("passenger") || sv.includes("webrick") || sv.includes("puma")) addLang("Ruby", "high");
        if (sv.includes("tomcat") || sv.includes("jboss") || sv.includes("wildfly") || pb.includes("jsp")) addLang("Java", "high");
        if (sv.includes("caddy") || pb.includes("go ")) addLang("Go", "high");
        if (sv.includes("gunicorn") || sv.includes("uvicorn") || sv.includes("wsgi")) addLang("Python", "high");
        if (sv.includes("iis") || pb.includes("asp.net")) addLang("C# / ASP.NET", "high");

        // Infer from detected frameworks
        const detectedNames = techPageData.map(t => t.name);
        if (detectedNames.some(n => ["Next.js", "Nuxt.js", "Svelte", "React", "Vue.js", "Angular"].includes(n))) {
            addLang("Node.js", "medium");
        }
        if (detectedNames.includes("Next.js") || detectedNames.includes("Angular")) {
            addLang("TypeScript", "medium");
        }
        if (detectedNames.some(n => ["WordPress", "Joomla", "Drupal"].includes(n))) {
            addLang("PHP", "high");
        }
        if (detectedNames.includes("Ghost")) addLang("Node.js", "high");

        // Add in-page detected languages
        for (const lang of langPageData) {
            addLang(lang.name, lang.confidence as "high" | "medium" | "low");
        }

        const techStackResult: TechStackResult = {
            detected: [
                ...langItems,
                ...techPageData.map(t => ({
                    ...t,
                    confidence: t.confidence as "high" | "medium" | "low",
                    icon: categoryIcon[t.category] || "🔩",
                })),
            ],
            serverInfo: techServerInfo,
            totalDetected: techPageData.length + langItems.length,
        };

        // ===== SITEMAP =====
        let sitemapResult: { urls: { loc: string; lastmod?: string; changefreq?: string; priority?: string }[]; source: string | null; error?: string } = { urls: [], source: null };
        try {
            const origin = new URL(targetUrl).origin;
            let sitemapXml = '';
            let sitemapSource = '';

            // Try /sitemap.xml first
            const smRes1 = await fetch(`${origin}/sitemap.xml`, { signal: AbortSignal.timeout(5000) }).catch(() => null);
            if (smRes1 && smRes1.ok) {
                sitemapXml = await smRes1.text();
                sitemapSource = `${origin}/sitemap.xml`;
            }

            // Try /sitemap_index.xml
            if (!sitemapXml) {
                const smRes2 = await fetch(`${origin}/sitemap_index.xml`, { signal: AbortSignal.timeout(5000) }).catch(() => null);
                if (smRes2 && smRes2.ok) {
                    sitemapXml = await smRes2.text();
                    sitemapSource = `${origin}/sitemap_index.xml`;
                }
            }

            // Try robots.txt for sitemap location
            if (!sitemapXml) {
                const robotsRes = await fetch(`${origin}/robots.txt`, { signal: AbortSignal.timeout(5000) }).catch(() => null);
                if (robotsRes && robotsRes.ok) {
                    const robotsTxt = await robotsRes.text();
                    const smMatch = robotsTxt.match(/Sitemap:\s*(.+)/i);
                    if (smMatch) {
                        const smUrl = smMatch[1].trim();
                        const smRes3 = await fetch(smUrl, { signal: AbortSignal.timeout(5000) }).catch(() => null);
                        if (smRes3 && smRes3.ok) {
                            sitemapXml = await smRes3.text();
                            sitemapSource = smUrl;
                        }
                    }
                }
            }

            // Parse sitemap XML
            if (sitemapXml) {
                // Check if sitemap index (contains <sitemap> tags)
                const isSitemapIndex = sitemapXml.includes('<sitemap>');
                if (isSitemapIndex) {
                    // Extract sitemap URLs from index and fetch first one
                    const locMatches = [...sitemapXml.matchAll(/<loc>\s*(.*?)\s*<\/loc>/gi)];
                    const subUrls = locMatches.map(m => m[1]).slice(0, 3); // fetch max 3 sub-sitemaps
                    for (const subUrl of subUrls) {
                        try {
                            const subRes = await fetch(subUrl, { signal: AbortSignal.timeout(5000) });
                            if (subRes.ok) {
                                const subXml = await subRes.text();
                                const urlMatches = [...subXml.matchAll(/<url>([\s\S]*?)<\/url>/gi)];
                                for (const um of urlMatches) {
                                    const block = um[1];
                                    const loc = block.match(/<loc>\s*(.*?)\s*<\/loc>/i)?.[1];
                                    const lastmod = block.match(/<lastmod>\s*(.*?)\s*<\/lastmod>/i)?.[1];
                                    const changefreq = block.match(/<changefreq>\s*(.*?)\s*<\/changefreq>/i)?.[1];
                                    const priority = block.match(/<priority>\s*(.*?)\s*<\/priority>/i)?.[1];
                                    if (loc) sitemapResult.urls.push({ loc, lastmod, changefreq, priority });
                                }
                            }
                        } catch { /* skip sub-sitemap */ }
                    }
                } else {
                    // Regular sitemap
                    const urlMatches = [...sitemapXml.matchAll(/<url>([\s\S]*?)<\/url>/gi)];
                    for (const um of urlMatches) {
                        const block = um[1];
                        const loc = block.match(/<loc>\s*(.*?)\s*<\/loc>/i)?.[1];
                        const lastmod = block.match(/<lastmod>\s*(.*?)\s*<\/lastmod>/i)?.[1];
                        const changefreq = block.match(/<changefreq>\s*(.*?)\s*<\/changefreq>/i)?.[1];
                        const priority = block.match(/<priority>\s*(.*?)\s*<\/priority>/i)?.[1];
                        if (loc) sitemapResult.urls.push({ loc, lastmod, changefreq, priority });
                    }
                }
                sitemapResult.source = sitemapSource;
            }
        } catch (e) {
            sitemapResult.error = e instanceof Error ? e.message : 'Failed to fetch sitemap';
        }

        // ===== OVERALL SCORE =====
        const overallScore = Math.round(
            seoScore * 0.18 +
            headingScore * 0.08 +
            imageScore * 0.08 +
            linkScore * 0.12 +
            visualScore * 0.08 +
            perfScore * 0.13 +
            a11yScore * 0.08 +
            responsiveScore * 0.08 +
            securityScore * 0.17
        );

        const result: ScanResult = {
            url: targetUrl,
            scanDate: new Date().toISOString(),
            overallScore,
            screenshot: fullScreenshot,
            seo: seoResult,
            headings: headingResult,
            images: imageResult,
            links: linkResult,
            visual: visualResult,
            performance: performanceResult,
            accessibility: accessibilityResult,
            responsive: responsiveResult,
            security: securityResult,
            techStack: techStackResult,
            sitemap: sitemapResult,
        };

        await browser.close();
        return NextResponse.json(result);
    } catch (error) {
        if (browser) await browser.close().catch(() => { });
        // Log full error server-side only — never expose internals to client
        console.error("[scan] Error:", error instanceof Error ? error.message : error);
        return NextResponse.json(
            { error: "Scan failed. Please check the URL and try again." },
            { status: 500 }
        );
    }
}
