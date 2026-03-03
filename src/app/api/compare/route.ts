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

        // Match viewport precisely to the design image to get an exact 1:1 comparison
        await page.setViewport({ width: designWidth, height: designHeight });
        await page.goto(targetUrl, { waitUntil: "networkidle2", timeout: 45000 });

        // Wait a small buffer to let animations/fonts settle
        await new Promise(r => setTimeout(r, 1500));

        // 3. Take screenshot of the website
        // We crop the screenshot to match the exact height of the design
        const screenshotBuffer = await page.screenshot({
            type: "png",
            clip: { x: 0, y: 0, width: designWidth, height: designHeight }
            // omitBackground: false
        });
        await browser.close();

        // Ensure screenshot is exactly RGBA
        const processedScreenshotBuffer = await sharp(screenshotBuffer)
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

        const compressedScreenshot = await sharp(screenshotBuffer)
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
