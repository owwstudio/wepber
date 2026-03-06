import { NextResponse } from "next/server";
import chromium from "@sparticuz/chromium-min";
import puppeteer, { Browser } from "puppeteer-core";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";
import sharp from "sharp";
import fs from "fs";
import path from "path";

export const maxDuration = 60;
export const dynamic = "force-dynamic";
// Run in the Vercel region closest to the requesting user (proxy for target website region)
export const preferredRegion = "auto";

// ===== COMPARE CONSTANTS =====
// Tunable via scanner.config.json: compareThreshold, compareSettleMs
const DEFAULT_THRESHOLD = 0.15;
const DEFAULT_SETTLE_MS = 2500;
const NAV_TIMEOUT_MS = 45_000;
const NETWORK_IDLE_TIMEOUT_MS = 8_000;

// ===== SSE HELPERS =====
function makeEmitter(controller: ReadableStreamDefaultController<Uint8Array>) {
    const enc = new TextEncoder();
    return function emit(type: string, payload: Record<string, unknown>) {
        try {
            controller.enqueue(enc.encode(`data: ${JSON.stringify({ type, ...payload })}\n\n`));
        } catch { /* stream may be closed */ }
    };
}

// ===== LOAD SCANNER CONFIG =====
function loadConfig(): { compareThreshold: number; compareSettleMs: number } {
    try {
        const cfgPath = path.join(process.cwd(), "scanner.config.json");
        if (fs.existsSync(cfgPath)) {
            const cfg = JSON.parse(fs.readFileSync(cfgPath, "utf-8"));
            return {
                compareThreshold: cfg.compareThreshold ?? DEFAULT_THRESHOLD,
                compareSettleMs: cfg.compareSettleMs ?? DEFAULT_SETTLE_MS,
            };
        }
    } catch { /* ignore */ }
    return { compareThreshold: DEFAULT_THRESHOLD, compareSettleMs: DEFAULT_SETTLE_MS };
}

export async function POST(request: Request) {
    // Parse + validate body before starting stream (mirrors scan API §19)
    let url: string, designImage: string;
    try {
        const body = await request.json();
        url = body.url;
        designImage = body.designImage;
    } catch {
        return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    }

    if (!url || !designImage) {
        return NextResponse.json({ error: "Missing url or designImage." }, { status: 400 });
    }

    let targetUrl = url.trim();
    if (!/^https?:\/\//i.test(targetUrl)) {
        targetUrl = "https://" + targetUrl;
    }

    // Validate URL format
    try { new URL(targetUrl); } catch {
        return NextResponse.json({ error: "Invalid URL format." }, { status: 400 });
    }

    const { compareThreshold, compareSettleMs } = loadConfig();

    // ===== SSE STREAMING RESPONSE =====
    const stream = new ReadableStream<Uint8Array>({
        async start(controller) {
            const emit = makeEmitter(controller);
            let browser: Browser | null = null;

            try {
                // ── 1. Process design image ──────────────────────────────────
                emit("status", { message: "Processing design image..." });

                const base64Data = designImage.replace(/^data:image\/\w+;base64,/, "");
                const designBuffer = Buffer.from(base64Data, "base64");

                if (!designBuffer || designBuffer.length === 0) {
                    emit("error", { message: "Design image is empty or invalid.", code: "invalid_image" });
                    controller.close();
                    return;
                }

                const designMeta = await sharp(designBuffer).metadata();
                const designWidth = designMeta.width || 1440;
                const designHeight = designMeta.height || 900;

                const processedDesignBuffer = await sharp(designBuffer)
                    .ensureAlpha()
                    .raw()
                    .toBuffer();

                // ── 2. Launch browser ────────────────────────────────────────
                emit("status", { message: "Launching browser..." });

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

                browser = await puppeteer.launch({
                    args: isVercel
                        ? [...chromium.args, "--hide-scrollbars", "--disable-web-security"]
                        : [
                            "--no-sandbox",
                            "--disable-setuid-sandbox",
                            "--disable-dev-shm-usage",
                            "--hide-scrollbars",
                        ],
                    defaultViewport: { width: designWidth, height: 1080 },
                    executablePath,
                    headless: true,
                });

                // ── 3. Navigate to page ──────────────────────────────────────
                emit("status", { message: "Navigating to website..." });

                const page = await browser.newPage();
                await page.setViewport({ width: designWidth, height: 1080 });

                // LAYER 1 — Pre-navigation hooks (runs before ANY page scripts)
                // Overrides IntersectionObserver so all elements always appear intersecting,
                // preventing AOS/WOW/ScrollReveal from hiding elements on scroll-back.
                await page.evaluateOnNewDocument(() => {
                    // Mark page so libraries can detect compare mode
                    (window as any).__coaxaCompare = true;

                    // Override IntersectionObserver: always report entries as fully intersecting.
                    // This prevents AOS/WOW from marking elements as hidden when
                    // they go out of viewport during the scroll-back pass.
                    const OrigIO = window.IntersectionObserver;
                    (window as any).IntersectionObserver = function (
                        callback: IntersectionObserverCallback,
                        options?: IntersectionObserverInit
                    ) {
                        const io = new OrigIO((entries, observer) => {
                            callback(
                                entries.map(e => {
                                    try {
                                        Object.defineProperty(e, 'isIntersecting', { get: () => true, configurable: true });
                                        Object.defineProperty(e, 'intersectionRatio', { get: () => 1, configurable: true });
                                    } catch { /* may already be defined */ }
                                    return e;
                                }),
                                observer
                            );
                        }, options);
                        return io;
                    };
                    (window as any).IntersectionObserver.prototype = OrigIO.prototype;

                    // Inject early CSS on DOMContentLoaded (before animation libraries init)
                    document.addEventListener('DOMContentLoaded', () => {
                        const s = document.createElement('style');
                        s.id = '__coaxa_no_anim';
                        s.textContent = `
                            *, *::before, *::after {
                                animation-duration: 0.001ms !important;
                                animation-delay: 0ms !important;
                                animation-iteration-count: 1 !important;
                                transition-duration: 0.001ms !important;
                                transition-delay: 0ms !important;
                            }
                            /* AOS */ [data-aos] { opacity: 1 !important; transform: none !important; visibility: visible !important; }
                            /* WOW.js */ .wow, [data-wow-delay] { opacity: 1 !important; transform: none !important; visibility: visible !important; }
                            /* ScrollReveal */ [data-sr] { opacity: 1 !important; transform: none !important; }
                            /* SAL */ [data-sal] { opacity: 1 !important; transform: none !important; }
                            /* Elementor */ .elementor-invisible { opacity: 1 !important; visibility: visible !important; transform: none !important; }
                            /* Animate.css triggered */ .animated, .animate__animated { opacity: 1 !important; }
                            /* custom fade-in patterns */ .fade-in, .fade-up, .slide-up, .reveal, .js-reveal, .js-scroll { opacity: 1 !important; transform: none !important; }
                        `;
                        (document.head || document.documentElement).appendChild(s);
                    }, { once: true });
                });

                // Two-phase navigation: domcontentloaded first, then network idle
                // (mirrors scan API §16 — avoids hard timeout on WordPress/heavy sites)
                try {
                    await page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: NAV_TIMEOUT_MS });
                    try {
                        await page.waitForNavigation({ waitUntil: "networkidle2", timeout: NETWORK_IDLE_TIMEOUT_MS });
                    } catch { /* ignore — network idle is best-effort */ }
                } catch {
                    emit("error", { message: "The website took too long to load or could not be reached.", code: "navigation_timeout" });
                    await browser.close().catch(() => { });
                    controller.close();
                    return;
                }

                // LAYER 2 — Post-navigation expanded CSS override (§14 + §25)
                // Covers patterns missed by pre-nav CSS: clip-path, scale(0), translate3d
                await page.addStyleTag({
                    content: `
                        /* Kill all animations and transitions */
                        *, *::before, *::after {
                            animation-duration: 0.001ms !important;
                            animation-delay: 0ms !important;
                            animation-iteration-count: 1 !important;
                            transition-duration: 0.001ms !important;
                            transition-delay: 0ms !important;
                        }
                        /* AOS - all variants */
                        [data-aos], [data-aos-once] {
                            opacity: 1 !important;
                            transform: none !important;
                            visibility: visible !important;
                        }
                        /* WOW.js */
                        .wow, .fadeIn, .fadeInUp, .fadeInDown, .fadeInLeft, .fadeInRight,
                        .slideInUp, .slideInDown, .slideInLeft, .slideInRight,
                        .zoomIn, .zoomOut, .bounceIn, .rotateIn {
                            opacity: 1 !important;
                            transform: none !important;
                            visibility: visible !important;
                            animation-name: none !important;
                        }
                        /* Elementor */
                        .elementor-invisible, .elementor-motion-effects-element {
                            opacity: 1 !important;
                            visibility: visible !important;
                            transform: none !important;
                        }
                        /* Animate.css */
                        .animate__animated { opacity: 1 !important; }
                        /* GSAP initial hidden states */
                        .gsap-fade, [data-gsap] { opacity: 1 !important; transform: none !important; }
                        /* ScrollReveal, SAL, custom */
                        [data-sr], [data-sal], .js-scroll, .reveal,
                        .fade-in, .fade-up, .slide-up, .slide-in {
                            opacity: 1 !important;
                            transform: none !important;
                            clip-path: none !important;
                            visibility: visible !important;
                        }
                    `
                });

                // ── 4. Single-pass scroll ────────────────────────────────────
                emit("status", { message: "Loading lazy images..." });

                // Single-pass scroll: trigger all lazy-load images, then return to top.
                await page.evaluate(async (settleMs: number) => {
                    window.scrollTo(0, document.body.scrollHeight);
                    await new Promise<void>(r => setTimeout(r, settleMs));
                    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
                }, compareSettleMs);

                // LAYER 3 — Post-scroll JS force-reveal pass (§25)
                // After scrolling back to top, IntersectionObservers MAY have re-hidden
                // elements (AOS mirror:true, WOW reset). Walk the entire DOM and force
                // every element with a hiding inline style to be visible.
                await page.evaluate(() => {
                    // Kill GSAP tweens if library is present
                    try {
                        const gsap = (window as any).gsap;
                        if (gsap) { gsap.killTweensOf('*'); gsap.set('*', { clearProps: 'all' }); }
                    } catch { /* ignore */ }

                    // Neuter AOS refresh so it can't re-hide after we've forced-revealed
                    try {
                        const AOS = (window as any).AOS;
                        if (AOS) {
                            AOS.refresh = () => { };
                            AOS.refreshHard = () => { };
                        }
                    } catch { /* ignore */ }

                    // Inline style reset: iterate every DOM element and clear hidden states
                    const all = document.querySelectorAll<HTMLElement>('*');
                    all.forEach(el => {
                        const s = el.style;
                        // Unhide opacity
                        if (s.opacity === '0' || s.opacity === '0.0') s.opacity = '1';
                        // Unhide visibility
                        if (s.visibility === 'hidden') s.visibility = 'visible';
                        // Reset AOS/WOW/GSAP translate transforms (but preserve layout transforms)
                        // Only reset transforms that include translate (slide-in effects)
                        if (s.transform && s.transform !== 'none') {
                            const t = s.transform;
                            if (t.includes('translate') || t.includes('scale(0') || t.includes('rotate')) {
                                s.transform = 'none';
                            }
                        }
                        // Reset clip-path hiding patterns
                        if (s.clipPath && s.clipPath !== 'none' && s.clipPath !== '') {
                            s.clipPath = 'none';
                        }
                        // Reset max-height:0 patterns (drawers/accordions used as animation)
                        // Only if element has a data-aos or data-wow attribute (not layout elements)
                        if (s.maxHeight === '0px' && (el.dataset.aos || el.dataset.wow || el.dataset.sal)) {
                            s.maxHeight = '';
                        }
                    });
                });

                // Brief repaint wait after force-reveal
                await new Promise(r => setTimeout(r, 300));

                // ── 5. Screenshot ────────────────────────────────────────────
                emit("status", { message: "Taking screenshot..." });

                const captureHeight = Math.max(1080, designHeight);
                const rawScreenshotBuffer = await page.screenshot({
                    type: "webp",
                    clip: { x: 0, y: 0, width: designWidth, height: captureHeight },
                    captureBeyondViewport: true,
                    quality: 100,
                });

                await browser.close();
                browser = null;

                // §23 — Guard: empty buffer crashes sharp
                if (!rawScreenshotBuffer || rawScreenshotBuffer.length === 0) {
                    emit("error", { message: "Failed to capture a screenshot of the website.", code: "screenshot_failed" });
                    controller.close();
                    return;
                }

                // ── 6. Crop screenshot to match design dimensions ─────────────
                emit("status", { message: "Comparing pixels..." });

                const rawMeta = await sharp(rawScreenshotBuffer).metadata();
                const rawHeight = rawMeta.height || 1080;
                const cropHeight = Math.min(rawHeight, designHeight);
                const paddingBottom = Math.max(0, designHeight - rawHeight);

                const processedScreenshotBuffer = await sharp(rawScreenshotBuffer)
                    .extract({ left: 0, top: 0, width: designWidth, height: cropHeight })
                    .extend({ bottom: paddingBottom, background: { r: 255, g: 255, b: 255, alpha: 1 } })
                    .ensureAlpha()
                    .raw()
                    .toBuffer();

                // ── 7. Dimension safety check before pixelmatch ───────────────
                // Both buffers must be exactly designWidth × designHeight × 4 bytes.
                const expectedBytes = designWidth * designHeight * 4;
                if (processedDesignBuffer.length !== expectedBytes || processedScreenshotBuffer.length !== expectedBytes) {
                    console.error(
                        `[compare] Dimension mismatch — design: ${processedDesignBuffer.length}, screenshot: ${processedScreenshotBuffer.length}, expected: ${expectedBytes}`
                    );
                    emit("error", { message: "Image dimension mismatch — design and screenshot sizes differ.", code: "dimension_mismatch" });
                    controller.close();
                    return;
                }

                // ── 8. Pixelmatch ─────────────────────────────────────────────
                const diffPNG = new PNG({ width: designWidth, height: designHeight });
                const mismatchedPixels = pixelmatch(
                    processedDesignBuffer,
                    processedScreenshotBuffer,
                    diffPNG.data,
                    designWidth,
                    designHeight,
                    { threshold: compareThreshold, alpha: 0.5, includeAA: true }
                );

                const totalPixels = designWidth * designHeight;
                const similarityScore = ((totalPixels - mismatchedPixels) / totalPixels) * 100;

                // ── 9. Compress payloads (§13) ─────────────────────────────────
                emit("status", { message: "Compressing results..." });

                const diffBuffer = PNG.sync.write(diffPNG);
                const compressedDiff = await sharp(diffBuffer)
                    .resize({ width: 1200, withoutEnlargement: true })
                    .webp({ quality: 70 })
                    .toBuffer();

                const displayScreenshotBuffer = await sharp(rawScreenshotBuffer)
                    .extract({ left: 0, top: 0, width: designWidth, height: cropHeight })
                    .extend({ bottom: paddingBottom, background: { r: 255, g: 255, b: 255, alpha: 1 } })
                    .webp({ quality: 70 })
                    .toBuffer();

                const compressedScreenshot = await sharp(displayScreenshotBuffer)
                    .resize({ width: 1200, withoutEnlargement: true })
                    .webp({ quality: 70 })
                    .toBuffer();

                // ── 10. Emit final result ──────────────────────────────────────
                emit("result", {
                    similarityScore: Math.round(similarityScore),
                    mismatchedPixels,
                    totalPixels,
                    diffImage: `data:image/webp;base64,${compressedDiff.toString("base64")}`,
                    websiteScreenshot: `data:image/webp;base64,${compressedScreenshot.toString("base64")}`,
                    originalDesignImage: designImage,
                });

            } catch (err) {
                if (browser) await browser.close().catch(() => { });
                console.error("[compare] Unexpected error:", err);
                const msg = err instanceof Error ? err.message : "Comparison failed.";
                emit("error", { message: msg, code: "unknown" });
            } finally {
                controller.close();
            }
        }
    });

    return new Response(stream, {
        headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache, no-transform",
            "X-Accel-Buffering": "no",
        },
    });
}
