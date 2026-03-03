/* eslint-disable @typescript-eslint/no-explicit-any */
import jsPDF from "jspdf";
import { SECTION_KEYS } from "@/types/scan";

/**
 * Generate and download a PDF report using jsPDF text-mapping.
 *
 * @see agent.md §10 — Data-Driven Text Mapping (jsPDF) over Visual Snapshotting
 * @see agent.md §12 — Hybrid Component Data Fallbacks (|| operators)
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
    const lineHeight = 10;

    // Title & Meta — use || fallbacks for cross-API compatibility (§12)
    const targetUrl = result.url || fallbackUrl;
    const reportDate = result.scanDate
      ? new Date(result.scanDate)
      : new Date();

    pdf.setFontSize(22);
    pdf.text("COAXA Validation Report", margin, yOffset);
    yOffset += lineHeight * 1.5;

    pdf.setFontSize(11);
    pdf.setTextColor(100);
    pdf.text(`Target URL: ${targetUrl}`, margin, yOffset);
    yOffset += lineHeight;
    pdf.text(`Generated On: ${reportDate.toLocaleString()}`, margin, yOffset);
    yOffset += lineHeight * 2;

    // Report Body
    pdf.setTextColor(0);

    if (result.diffImage) {
      // Compare Mode
      pdf.setFontSize(16);
      pdf.text("Design Match Verification", margin, yOffset);
      yOffset += lineHeight;

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
      // Scan Mode
      pdf.setFontSize(16);
      pdf.text("Overall Metrics", margin, yOffset);
      yOffset += lineHeight;

      pdf.setFontSize(12);
      pdf.text(
        `Overall Quality Score: ${result.overallScore}/100`,
        margin,
        yOffset
      );
      yOffset += lineHeight * 2;

      pdf.setFontSize(14);
      pdf.text("Section Breakdown:", margin, yOffset);
      yOffset += lineHeight;

      pdf.setFontSize(12);
      SECTION_KEYS.forEach((key) => {
        if (result[key] && typeof result[key].score === "number") {
          if (yOffset > 270) {
            pdf.addPage();
            yOffset = 20;
          }
          const friendlyName =
            key.charAt(0).toUpperCase() +
            key
              .slice(1)
              .replace(/([A-Z])/g, " $1")
              .trim();
          const sc = result[key].score;
          const scoreLabel = sc === -1 ? "N/A" : `${sc}/100`;
          pdf.text(`• ${friendlyName}: ${scoreLabel}`, margin + 5, yOffset);
          yOffset += lineHeight;
        }
      });
    }

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
