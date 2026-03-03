import { NextResponse } from "next/server";
import chromium from "@sparticuz/chromium-min";
import puppeteer, { Browser } from "puppeteer-core";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";
import sharp from "sharp";

export const maxDuration = 60; // 60 seconds
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
    let browser: Browser | null = null;

    try {
        const { url, designImage } = await request.json();

        if (!url || !designImage) {
            return NextResponse.json({ error: "Missing url or designImage in request body." }, { status: 400 });
        }

        let targetUrl = url;
        if (!/^https?:\/\//i.test(targetUrl)) {
            targetUrl = "http://" + targetUrl;
        }

        // 1. Process uploaded design image
        // The designImage is expected to be a data URL: "data:image/png;base64,....."
        const base64Data = designImage.replace(/^data:image\/\w+;base64,/, "");
        const designBuffer = Buffer.from(base64Data, "base64");

        // Use sharp to get dimensions and convert to standard PNG
        const designMeta = await sharp(designBuffer).metadata();
        const designWidth = designMeta.width || 1440;
        const designHeight = designMeta.height || 900;

        // Ensure design image is exactly RGBA PNG format for pixelmatch
        const processedDesignBuffer = await sharp(designBuffer)
            .ensureAlpha()
            .raw()
            .toBuffer();

        // 2. Launch Puppeteer
        const isLocal = process.env.NODE_ENV === "development";
        const executablePath = isLocal
            ? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" // Adjust if needed
            : await chromium.executablePath(
                "https://github.com/Sparticuz/chromium/releases/download/v131.0.1/chromium-v131.0.1-pack.tar"
            );

        browser = await puppeteer.launch({
            args: isLocal ? puppeteer.defaultArgs() : [...chromium.args, "--hide-scrollbars", "--disable-web-security"],
            defaultViewport: { width: designWidth, height: designHeight },
            executablePath,
            headless: chromium.headless,
        });

        const page = await browser.newPage();

        // Match viewport width to design, but keep a standard height so 100vh elements don't distort
        await page.setViewport({ width: designWidth, height: 1080 });
        await page.goto(targetUrl, { waitUntil: "networkidle2", timeout: 45000 });

        // Force disable all CSS animations, transitions, and common Intersection Observer hidden states (AOS, Elementor)
        await page.addStyleTag({
            content: `
                * {
                    animation-duration: 0.001ms !important;
                    animation-iteration-count: 1 !important;
                    transition-duration: 0.001ms !important;
                }
                .elementor-invisible, [data-aos], .wow, .animated {
                    opacity: 1 !important;
                    transform: none !important;
                    visibility: visible !important;
                }
            `
        });

        // Auto-scroll to trigger any remaining lazy loading assets
        await page.evaluate(async () => {
            await new Promise<void>((resolve) => {
                let totalHeight = 0;
                const distance = 400;
                const timer = setInterval(() => {
                    const scrollHeight = document.body.scrollHeight;
                    window.scrollBy(0, distance);
                    totalHeight += distance;
                    if (totalHeight >= scrollHeight) {
                        clearInterval(timer);
                        window.scrollTo({ top: 0, behavior: "instant" }); // Reset back to top instantly
                        resolve();
                    }
                }, 100);
            });
        });

        // Wait a larger buffer to let lazy-loaded images paint and sticky headers re-anchor
        await new Promise(r => setTimeout(r, 2500));

        // 3. Take a screenshot via captureBeyondViewport to prevent 100vh elements from stretching
        const captureHeight = Math.max(1080, designHeight);
        const rawScreenshotBuffer = await page.screenshot({
            type: "webp",
            clip: { x: 0, y: 0, width: designWidth, height: captureHeight },
            captureBeyondViewport: true,
            quality: 100
        });
        await browser.close();

        // 4. Crop/Extend the screenshot precisely to match the designImage boundaries using sharp
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

        // 4. Perform Pixelmatch comparison
        // Create an empty PNG buffer for the diff output
        const diffPNG = new PNG({ width: designWidth, height: designHeight });

        // Compare using pixelmatch
        // threshold 0.1 means 10% tolerance per pixel
        const mismatchedPixels = pixelmatch(
            processedDesignBuffer,
            processedScreenshotBuffer,
            diffPNG.data,
            designWidth,
            designHeight,
            { threshold: 0.15, alpha: 0.5, includeAA: true }
        );

        const totalPixels = designWidth * designHeight;
        const matchedPixels = totalPixels - mismatchedPixels;
        // Calculate similarity percentage (e.g. 98.45%)
        const similarityScore = (matchedPixels / totalPixels) * 100;

        // 5. Compress payloads to WebP before sending to avoid Vercel FUNCTION_PAYLOAD_TOO_LARGE limits
        const diffBuffer = PNG.sync.write(diffPNG);

        const compressedDiff = await sharp(diffBuffer)
            .resize({ width: 1200, withoutEnlargement: true })
            .webp({ quality: 70 })
            .toBuffer();
        const diffBase64 = `data:image/webp;base64,${compressedDiff.toString("base64")}`;

        // Create a display-safe version of the perfectly cropped original screenshot
        const displayScreenshotBuffer = await sharp(rawScreenshotBuffer)
            .extract({ left: 0, top: 0, width: designWidth, height: cropHeight })
            .extend({ bottom: paddingBottom, background: { r: 255, g: 255, b: 255, alpha: 1 } })
            .webp({ quality: 70 })
            .toBuffer();

        const compressedScreenshot = await sharp(displayScreenshotBuffer)
            .resize({ width: 1200, withoutEnlargement: true })
            .webp({ quality: 70 })
            .toBuffer();

        return NextResponse.json({
            similarityScore: Math.round(similarityScore), // Return integer without decimals
            mismatchedPixels,
            totalPixels,
            diffImage: diffBase64,
            websiteScreenshot: `data:image/webp;base64,${compressedScreenshot.toString("base64")}`,
            originalDesignImage: designImage
        });

    } catch (error) {
        if (browser) await browser.close().catch(() => { });
        console.error("[compare] Error:", error);
        return NextResponse.json(
            { error: "Comparison failed. Please check the URL and image format." },
            { status: 500 }
        );
    }
}
