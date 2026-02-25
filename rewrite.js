const fs = require("fs");
const path = require("path");

const routePath = path.join(__dirname, "src/app/api/scan/route.ts");
let content = fs.readFileSync(routePath, "utf-8");

// 1. Add fs and path imports if not present, and load config dynamically
if (!content.includes('const scannerConfig = JSON.parse(fs.readFileSync')) {
    const importReplacement = 'import puppeteer from "puppeteer-core";\nimport fs from "fs";\nimport path from "path";';
    content = content.replace('import puppeteer from "puppeteer-core";', importReplacement);

    const configLoad = `
        let scannerConfig = { features: { seo: true, headings: true, images: true, links: true, visual: true, performance: true, accessibility: true, responsive: true, security: true, techStack: true, sitemap: true } };
        try {
            const configPath = path.join(process.cwd(), "scanner.config.json");
            if (fs.existsSync(configPath)) {
                scannerConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));
            }
        } catch (e) {
            console.error("Failed to load scanner.config.json", e);
        }
`;
    const insertPoint = 'export async function POST(request: NextRequest) {';
    content = content.replace(insertPoint, insertPoint + "\n" + configLoad);
}

// 2. Make ScanResult interfaces optional
const typesToOptional = [
    "seo: SEOResult;",
    "headings: HeadingResult;",
    "images: ImageResult;",
    "links: LinkResult;",
    "visual: VisualResult;",
    "performance: PerformanceResult;",
    "accessibility: AccessibilityResult;",
    "responsive: ResponsiveResult;",
    "security: SecurityResult;",
    "techStack: TechStackResult;",
    "sitemap: { urls:"
];
typesToOptional.forEach(t => {
    content = content.replace(t, t.replace(":", "?:"));
});

// 3. Declare outer variables
const varDeclarations = `
        let seoScore = 0; let seoResult: SEOResult | undefined;
        let headingScore = 0; let headingResult: HeadingResult | undefined;
        let imageScore = 0; let imageResult: ImageResult | undefined;
        let linkScore = 0; let linkResult: LinkResult | undefined;
        let visualScore = 0; let visualResult: VisualResult | undefined;
        let perfScore = 0; let performanceResult: PerformanceResult | undefined;
        let a11yScore = 0; let accessibilityResult: AccessibilityResult | undefined;
        let responsiveScore = 0; let responsiveResult: ResponsiveResult | undefined;
        let securityScore = 0; let securityResult: SecurityResult | undefined;
        let techStackResult: TechStackResult | undefined;
        let sitemapResult: { urls: { loc: string; lastmod?: string; changefreq?: string; priority?: string }[]; source: string | null; error?: string } | undefined = { urls: [], source: null };
`;
if (!content.includes("let seoResult: SEOResult | undefined;")) {
    content = content.replace(
        /(const fullScreenshot = .*?;\n)/,
        "$1" + varDeclarations + "\n"
    );
}

function wrapSection(startMarker, endMarker, featureName, varsToRemoveConst) {
    const s = content.indexOf(startMarker);
    const e = content.indexOf(endMarker, s);
    if (s > -1 && e > -1) {
        if (content.substring(s, e).includes("if (scannerConfig.features." + featureName + ")")) {
            return;
        }
        let block = content.substring(s, e);
        varsToRemoveConst.forEach(v => {
            block = block.replace(new RegExp("const \\\\s+" + v + "\\\\s*=", "g"), v + " =");
        });
        const wrapped = startMarker + "\n        if (scannerConfig.features." + featureName + ") {\n" +
            block.substring(startMarker.length).split("\n").map(l => "    " + l).join("\n") +
            "\n        }\n\n        ";
        content = content.substring(0, s) + wrapped + content.substring(e);
    }
}

// Fix responsive seoResult?.viewport TS Error
content = content.replace(
    'const hasViewportMeta = !!seoResult.viewport && seoResult.viewport.includes("width=device-width");',
    'const hasViewportMeta = !!seoResult?.viewport && seoResult?.viewport.includes("width=device-width");'
);

wrapSection("// ===== SEO META ANALYSIS =====", "// ===== HEADING STRUCTURE =====", "seo", ["seoScore", "seoResult"]);
wrapSection("// ===== HEADING STRUCTURE =====", "// ===== IMAGE AUDIT =====", "headings", ["headingScore", "headingResult"]);
wrapSection("// ===== IMAGE AUDIT =====", "// ===== LINK & BUTTON CHECK =====", "images", ["imageScore", "imageResult"]);
wrapSection("// ===== LINK & BUTTON CHECK =====", "// ===== VISUAL CONSISTENCY (International Standards) =====", "links", ["linkScore", "linkResult"]);
wrapSection("// ===== VISUAL CONSISTENCY (International Standards) =====", "// ===== PERFORMANCE (Comprehensive) =====", "visual", ["visualScore", "visualResult"]);
wrapSection("// ===== PERFORMANCE (Comprehensive) =====", "// ===== ACCESSIBILITY =====", "performance", ["perfScore", "performanceResult"]);
wrapSection("// ===== ACCESSIBILITY =====", "// ===== RESPONSIVE TEST =====", "accessibility", ["a11yScore", "accessibilityResult"]);
wrapSection("// ===== RESPONSIVE TEST =====", "// ===== SECURITY STANDARDS =====", "responsive", ["responsiveScore", "responsiveResult"]);
wrapSection("// ===== SECURITY STANDARDS =====", "// ===== TECH STACK DETECTION =====", "security", ["securityScore", "securityResult"]);
// Treat techStack and language detection as one big block since they are coupled
wrapSection("// ===== TECH STACK DETECTION =====", "// ===== SITEMAP =====", "techStack", ["techStackResult"]);

const sitemapStart = "// ===== SITEMAP =====";
const sitemapEnd = "// ===== OVERALL SCORE =====";
const sIdx = content.indexOf(sitemapStart);
const eIdx = content.indexOf(sitemapEnd, sIdx);
if (sIdx > -1 && eIdx > -1) {
    let block = content.substring(sIdx, eIdx);
    if (!block.includes("if (scannerConfig.features.sitemap !== false)")) {
        block = block.replace(/let sitemapResult.*?\n/, "");
        const wrapped = sitemapStart + "\n        if (scannerConfig.features.sitemap !== false) {\n" +
            block.substring(sitemapStart.length).split("\n").map(l => "    " + l).join("\n") +
            "\n        }\n\n        ";
        content = content.substring(0, sIdx) + wrapped + content.substring(eIdx);
    }
}

const scoreMathStart = "// ===== OVERALL SCORE =====\n        const overallScore = Math.round(";
if (content.includes(scoreMathStart)) {
    const newMath = `// ===== OVERALL SCORE =====
        let totalWeight = 0;
        let earnedWeight = 0;
        if (seoResult) { earnedWeight += seoScore * 0.18; totalWeight += 0.18; }
        if (headingResult) { earnedWeight += headingScore * 0.08; totalWeight += 0.08; }
        if (imageResult) { earnedWeight += imageScore * 0.08; totalWeight += 0.08; }
        if (linkResult) { earnedWeight += linkScore * 0.12; totalWeight += 0.12; }
        if (visualResult) { earnedWeight += visualScore * 0.08; totalWeight += 0.08; }
        if (performanceResult) { earnedWeight += perfScore * 0.13; totalWeight += 0.13; }
        if (accessibilityResult) { earnedWeight += a11yScore * 0.08; totalWeight += 0.08; }
        if (responsiveResult) { earnedWeight += responsiveScore * 0.08; totalWeight += 0.08; }
        if (securityResult) { earnedWeight += securityScore * 0.17; totalWeight += 0.17; }
        
        const overallScore = totalWeight > 0 ? Math.round((earnedWeight / totalWeight) * 100) : 0;`;
    const mIdx = content.indexOf(scoreMathStart);
    const mEnd = content.indexOf(");", mIdx) + 2;
    content = content.substring(0, mIdx) + newMath + content.substring(mEnd);
}

fs.writeFileSync(routePath, content, "utf-8");
console.log("Rewrite successful.");
