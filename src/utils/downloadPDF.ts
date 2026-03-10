/* eslint-disable @typescript-eslint/no-explicit-any */
import jsPDF from "jspdf";
import { SECTION_KEYS } from "@/types/scan";

/**
 * Helper: ensure text fits within page, adding a new page if needed.
 */
function ensureSpace(pdf: jsPDF, yOffset: number, needed: number): number {
  if (yOffset + needed > 275) {
    pdf.addPage();
    return 20;
  }
  return yOffset;
}

/**
 * Helper: draw a thin gray divider line.
 */
function drawDivider(pdf: jsPDF, y: number, margin: number): number {
  pdf.setDrawColor(200);
  pdf.setLineWidth(0.3);
  pdf.line(margin, y, 195, y);
  return y + 5;
}

/**
 * Helper: write wrapped text lines (for long strings like URLs or descriptions).
 */
function writeWrapped(
  pdf: jsPDF,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number
): number {
  const lines = pdf.splitTextToSize(text, maxWidth);
  for (const line of lines) {
    y = ensureSpace(pdf, y, lineHeight);
    pdf.text(line, x, y);
    y += lineHeight;
  }
  return y;
}

/**
 * Section detail writers — extract key metrics from each section result.
 * Keep text-based only per agent.md §10.
 */
const sectionDetails: Record<string, (pdf: jsPDF, data: any, y: number, m: number, lh: number) => number> = {
  seo: (pdf, data, y, m, lh) => {
    pdf.setFontSize(9);
    pdf.setTextColor(80);
    if (data.title?.value) {
      y = ensureSpace(pdf, y, lh);
      pdf.text(`Title: "${data.title.value.substring(0, 70)}" (${data.title.length} chars, ${data.title.status})`, m + 8, y);
      y += lh;
    }
    if (data.metaDescription?.value) {
      y = ensureSpace(pdf, y, lh);
      pdf.text(`Description: "${data.metaDescription.value.substring(0, 80)}..." (${data.metaDescription.length} chars)`, m + 8, y);
      y += lh;
    }
    if (data.canonical) {
      y = ensureSpace(pdf, y, lh);
      pdf.text(`Canonical: ${data.canonical.substring(0, 80)}`, m + 8, y);
      y += lh;
    }
    if (data.issues?.length > 0) {
      y = ensureSpace(pdf, y, lh);
      pdf.setTextColor(180, 60, 60);
      pdf.text(`Issues (${data.issues.length}): ${data.issues.slice(0, 3).join("; ")}`, m + 8, y);
      y += lh;
      pdf.setTextColor(80);
    }
    pdf.setTextColor(0);
    return y;
  },

  headings: (pdf, data, y, m, lh) => {
    pdf.setFontSize(9);
    pdf.setTextColor(80);
    y = ensureSpace(pdf, y, lh);
    pdf.text(`H1 Tags: ${data.h1Count || 0} | Total Headings: ${data.structure?.length || 0}`, m + 8, y);
    y += lh;
    if (data.issues?.length > 0) {
      y = ensureSpace(pdf, y, lh);
      pdf.setTextColor(180, 60, 60);
      pdf.text(`Issues: ${data.issues.slice(0, 2).join("; ")}`, m + 8, y);
      y += lh;
    }
    pdf.setTextColor(0);
    return y;
  },

  images: (pdf, data, y, m, lh) => {
    pdf.setFontSize(9);
    pdf.setTextColor(80);
    y = ensureSpace(pdf, y, lh);
    pdf.text(`Total: ${data.total || 0} | With Alt: ${data.withAlt || 0} | Without Alt: ${data.withoutAlt || 0} | Broken: ${data.broken || 0}`, m + 8, y);
    y += lh;
    pdf.setTextColor(0);
    return y;
  },

  links: (pdf, data, y, m, lh) => {
    pdf.setFontSize(9);
    pdf.setTextColor(80);
    y = ensureSpace(pdf, y, lh);
    pdf.text(`Total: ${data.total || 0} | Internal: ${data.internal || 0} | External: ${data.external || 0}`, m + 8, y);
    y += lh;
    if (data.deadLinks?.length > 0) {
      y = ensureSpace(pdf, y, lh);
      pdf.setTextColor(180, 60, 60);
      pdf.text(`Broken Links: ${data.deadLinks.length} — ${data.deadLinks.slice(0, 3).map((l: any) => l.url.substring(0, 40)).join(", ")}`, m + 8, y);
      y += lh;
    }
    pdf.setTextColor(0);
    return y;
  },

  performance: (pdf, data, y, m, lh) => {
    pdf.setFontSize(9);
    pdf.setTextColor(80);
    y = ensureSpace(pdf, y, lh);
    pdf.text(`Load Time: ${data.loadTime || 0}ms | Page Size: ${data.totalPageSize || "N/A"} | DOM Elements: ${data.domElements || 0}`, m + 8, y);
    y += lh;
    if (data.recommendations?.length > 0) {
      y = ensureSpace(pdf, y, lh);
      pdf.text(`Top Recommendation: ${data.recommendations[0]?.message?.substring(0, 90) || ""}`, m + 8, y);
      y += lh;
    }
    pdf.setTextColor(0);
    return y;
  },

  coreWebVitals: (pdf, data, y, m, lh) => {
    pdf.setFontSize(9);
    pdf.setTextColor(80);
    y = ensureSpace(pdf, y, lh);
    const lcp = data.lcp?.value != null ? `${data.lcp.value.toFixed(0)}ms (${data.lcp.rating})` : "N/A";
    const cls = data.cls?.value != null ? `${data.cls.value.toFixed(3)} (${data.cls.rating})` : "N/A";
    const tbt = data.tbt?.value != null ? `${data.tbt.value.toFixed(0)}ms (${data.tbt.rating})` : "N/A";
    pdf.text(`LCP: ${lcp} | CLS: ${cls} | TBT: ${tbt}`, m + 8, y);
    y += lh;
    pdf.setTextColor(0);
    return y;
  },

  accessibility: (pdf, data, y, m, lh) => {
    pdf.setFontSize(9);
    pdf.setTextColor(80);
    y = ensureSpace(pdf, y, lh);
    pdf.text(`Images w/o Alt: ${data.imagesWithoutAlt || 0} | Links w/o Text: ${data.linksWithoutText || 0} | Buttons w/o Label: ${data.buttonsWithoutLabels || 0} | Inputs w/o Label: ${data.inputsWithoutLabels || 0}`, m + 8, y);
    y += lh;
    if (data.ariaUsage) {
      y = ensureSpace(pdf, y, lh);
      pdf.text(`ARIA Attributes Found: ${data.ariaUsage}`, m + 8, y);
      y += lh;
    }
    pdf.setTextColor(0);
    return y;
  },

  security: (pdf, data, y, m, lh) => {
    pdf.setFontSize(9);
    pdf.setTextColor(80);
    y = ensureSpace(pdf, y, lh);
    pdf.text(`HTTPS: ${data.isHttps ? "Yes" : "No"} | Mixed Content: ${data.mixedContent?.count || 0}`, m + 8, y);
    y += lh;
    if (data.headers) {
      y = ensureSpace(pdf, y, lh);
      const missing = Object.entries(data.headers)
        .filter(([, v]: [string, any]) => !v.present)
        .map(([k]) => k);
      if (missing.length > 0) {
        pdf.setTextColor(180, 60, 60);
        pdf.text(`Missing Headers: ${missing.join(", ")}`, m + 8, y);
        y += lh;
      }
    }
    pdf.setTextColor(0);
    return y;
  },

  responsive: (pdf, data, y, m, lh) => {
    pdf.setFontSize(9);
    pdf.setTextColor(80);
    y = ensureSpace(pdf, y, lh);
    pdf.text(`Responsive: ${data.isResponsive ? "Yes" : "No"} | Viewport Meta: ${data.hasViewportMeta ? "Yes" : "No"} | Horizontal Scroll: ${data.horizontalScrollMobile ? "Yes" : "No"}`, m + 8, y);
    y += lh;
    if (data.tapTargets?.issues > 0) {
      y = ensureSpace(pdf, y, lh);
      pdf.text(`Tap Target Issues: ${data.tapTargets.issues} of ${data.tapTargets.total}`, m + 8, y);
      y += lh;
    }
    pdf.setTextColor(0);
    return y;
  },

  structuredData: (pdf, data, y, m, lh) => {
    pdf.setFontSize(9);
    pdf.setTextColor(80);
    y = ensureSpace(pdf, y, lh);
    pdf.text(`Schemas Found: ${data.totalFound || 0}${data.schemas?.length > 0 ? ` — Types: ${data.schemas.slice(0, 4).map((s: any) => `${s.type} (${s.source})`).join(", ")}` : ""}`, m + 8, y);
    y += lh;
    pdf.setTextColor(0);
    return y;
  },
};

/**
 * Generate and download an enhanced PDF report using jsPDF text-mapping.
 *
 * Includes per-section details (key metrics, issues) while keeping
 * the text-based approach per user requirement.
 *
 * @see agent.md §10 — Data-Driven Text Mapping (jsPDF) over Visual Snapshotting
 * @see agent.md §12 — Hybrid Component Data Fallbacks (|| operators)
 * @see agent.md §20 — Enhanced PDF Report
 */
export async function downloadPDF(
  result: any,
  fallbackUrl: string,
  setIsExporting: (v: boolean) => void
): Promise<void> {
  if (!result) return;

  try {
    setIsExporting(true);
    const pdf = new jsPDF("p", "mm", "a4");

    let yOffset = 20;
    const margin = 15;
    const lineHeight = 7;
    const maxTextWidth = 175;

    // Title & Meta — use || fallbacks for cross-API compatibility (§12)
    const targetUrl = result.url || fallbackUrl;
    const reportDate = result.scanDate
      ? new Date(result.scanDate)
      : new Date();

    // Header
    pdf.setFontSize(22);
    pdf.setTextColor(99, 102, 241);
    pdf.text("COAXA", margin, yOffset);
    pdf.setFontSize(12);
    pdf.setTextColor(120);
    pdf.text("Validation Report", margin + 30, yOffset);
    yOffset += lineHeight * 2;

    pdf.setFontSize(10);
    pdf.setTextColor(100);
    yOffset = writeWrapped(pdf, `URL: ${targetUrl}`, margin, yOffset, maxTextWidth, lineHeight);
    pdf.text(`Date: ${reportDate.toLocaleString()}`, margin, yOffset);
    yOffset += lineHeight * 2;

    yOffset = drawDivider(pdf, yOffset, margin);

    // Report Body
    pdf.setTextColor(0);

    if (result.diffImage) {
      // Compare Mode
      pdf.setFontSize(16);
      yOffset += lineHeight * 1;
      pdf.text("Design Match Verification", margin, yOffset);
      yOffset += lineHeight * 1.5;

      pdf.setFontSize(12);
      pdf.text(
        `Similarity Score: ${result.similarityScore.toFixed(2)}%`,
        margin,
        yOffset
      );
      yOffset += lineHeight;
      pdf.text(
        `Mismatched Pixels: ${result.mismatchedPixels.toLocaleString()}`,
        margin,
        yOffset
      );
      yOffset += lineHeight;
      pdf.text(
        `Total Pixels Analyzed: ${result.totalPixels.toLocaleString()}`,
        margin,
        yOffset
      );
    } else {
      // Scan Mode — Overall Score
      pdf.setFontSize(16);
      pdf.setTextColor(0);
      yOffset += lineHeight * 1;
      pdf.text("Overall Quality Score", margin, yOffset);
      yOffset += lineHeight * 1.5;

      pdf.setFontSize(28);
      const scoreColor = result.overallScore >= 80 ? [34, 197, 94] : result.overallScore >= 50 ? [234, 179, 8] : [239, 68, 68];
      pdf.setTextColor(scoreColor[0], scoreColor[1], scoreColor[2]);
      pdf.text(`${result.overallScore}/100`, margin, yOffset);
      yOffset += lineHeight * 2;

      pdf.setTextColor(0);

      // Count total issues across all sections
      let totalIssues = 0;
      let sectionsAnalyzed = 0;
      SECTION_KEYS.forEach((key) => {
        if (result[key]) {
          sectionsAnalyzed++;
          if (result[key].issues?.length) totalIssues += result[key].issues.length;
        }
      });

      pdf.setFontSize(10);
      pdf.setTextColor(100);
      pdf.text(`Sections Analyzed: ${sectionsAnalyzed} | Total Issues Found: ${totalIssues}`, margin, yOffset);
      yOffset += lineHeight * 1.5;

      yOffset = drawDivider(pdf, yOffset, margin);

      // Section Breakdown with Details
      yOffset += lineHeight * 1;
      pdf.setFontSize(14);
      pdf.setTextColor(0);
      pdf.text("Section Breakdown", margin, yOffset);
      yOffset += lineHeight * 1.5;

      SECTION_KEYS.forEach((key) => {
        if (result[key] && typeof result[key].score === "number") {
          yOffset = ensureSpace(pdf, yOffset, lineHeight * 3);

          const friendlyName =
            key.charAt(0).toUpperCase() +
            key
              .slice(1)
              .replace(/([A-Z])/g, " $1")
              .trim();
          const sc = result[key].score;
          const scoreLabel = sc === -1 ? "N/A" : `${sc}/100`;

          // Section header with score
          pdf.setFontSize(11);
          pdf.setTextColor(0);
          pdf.text(`${friendlyName}`, margin + 3, yOffset);

          const sColor = sc >= 80 ? [34, 197, 94] : sc >= 50 ? [234, 179, 8] : sc < 0 ? [150, 150, 150] : [239, 68, 68];
          pdf.setTextColor(sColor[0], sColor[1], sColor[2]);
          pdf.text(scoreLabel, margin + 120, yOffset);
          yOffset += lineHeight;

          // Section-specific details
          pdf.setTextColor(0);
          const detailWriter = sectionDetails[key];
          if (detailWriter) {
            yOffset = detailWriter(pdf, result[key], yOffset, margin, lineHeight);
          } else if (result[key].issues?.length > 0) {
            // Generic fallback: show issue count
            pdf.setFontSize(9);
            pdf.setTextColor(80);
            yOffset = ensureSpace(pdf, yOffset, lineHeight);
            pdf.text(`Issues: ${result[key].issues.length}`, margin + 8, yOffset);
            yOffset += lineHeight;
            pdf.setTextColor(0);
          }

          yOffset += 2; // Small spacing between sections
        }
      });

      // Tech Stack Summary (if available)
      if (result.techStack?.detected?.length > 0) {
        yOffset = ensureSpace(pdf, yOffset, lineHeight * 3);
        yOffset = drawDivider(pdf, yOffset, margin);
        pdf.setFontSize(12);
        pdf.setTextColor(0);
        pdf.text(`Tech Stack (${result.techStack.totalDetected} detected)`, margin, yOffset);
        yOffset += lineHeight;
        pdf.setFontSize(9);
        pdf.setTextColor(80);
        const techs = result.techStack.detected
          .slice(0, 12)
          .map((t: any) => `${t.name}${t.version ? ` v${t.version}` : ""}`)
          .join(", ");
        yOffset = writeWrapped(pdf, techs, margin + 3, yOffset, maxTextWidth - 3, lineHeight);
        pdf.setTextColor(0);
      }
    }

    // Footer
    yOffset = ensureSpace(pdf, yOffset, lineHeight * 6);
    yOffset = drawDivider(pdf, yOffset + 5, margin);

    yOffset += 5;
    pdf.setFontSize(8);
    pdf.setTextColor(100);
    const disclaimerText = "* Disclaimer: Use scan results as a relative benchmark to track improvements over time — not as absolute values to compare against other tools like Lighthouse or PageSpeed Insights.";
    yOffset = writeWrapped(pdf, disclaimerText, margin, yOffset, maxTextWidth, 4);

    yOffset += 4;
    pdf.setTextColor(150);
    pdf.text("COAXA — Powered by One Week Wonders | oneweekwonders.com", margin, yOffset);

    let hostName = "website";
    try {
      if (targetUrl.includes("//")) {
        hostName = new URL(targetUrl).hostname.replace("www.", "");
      } else {
        hostName = targetUrl.replace("www.", "");
      }
    } catch {
      // Fallback silently if URL parser fails
    }

    const dateStr = reportDate.toISOString().split("T")[0];
    pdf.save(`coaxa-report-${dateStr}-${hostName}.pdf`);
  } catch (error) {
    console.error("Failed to export PDF:", error);
  } finally {
    setIsExporting(false);
  }
}
