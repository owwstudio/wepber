"use client";

import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import jsPDF from "jspdf";
import {
  Search,
  Globe,
  FileText,
  Heading,
  Image as ImageIcon,
  Link2,
  Palette,
  Zap,
  Accessibility,
  XCircle,
  RotateCw,
  ExternalLink,
  Camera,
  Map,
  Smartphone,
  Download,
  Network,
  Bug,
  ShieldCheck,
  Layers,
} from "lucide-react";

import ScoreRing from "@/components/ui/ScoreRing";
import MiniScore from "@/components/ui/MiniScore";
import ScreenshotGallery from "@/components/ui/ScreenshotGallery";
import CollapsibleSection from "@/components/ui/CollapsibleSection";

/* eslint-disable @typescript-eslint/no-explicit-any */

import SEOSection from "@/components/sections/SEOSection";
import HeadingsSection from "@/components/sections/HeadingsSection";
import ImagesSection from "@/components/sections/ImagesSection";
import LinksSection from "@/components/sections/LinksSection";
import VisualSection from "@/components/sections/VisualSection";
import PerformanceSection from "@/components/sections/PerformanceSection";
import SitemapSection from "@/components/sections/SitemapSection";
import ResponsiveSection from "@/components/sections/ResponsiveSection";
import AccessibilitySection from "@/components/sections/AccessibilitySection";
import SecuritySection from "@/components/sections/SecuritySection";
import TechStackSection from "@/components/sections/TechStackSection";
import CoreWebVitalsSection from "@/components/sections/CoreWebVitalsSection";
import StructuredDataSection from "@/components/sections/StructuredDataSection";
import RobotsSection from "@/components/sections/RobotsSection";

// Import config to dynamically map scan messages
import scannerConfig from "../../scanner.config.json";

// Shared generic messages
const initialScanMessages = [
  "Launching browser engine...",
  "Navigating to target URL..."
];

const compareMessages = [
  ...initialScanMessages,
  "Taking a pixel-perfect screenshot...",
  "Processing the uploaded design mockup...",
  "Running visual pixelmatch algorithm...",
  "Calculating structural differences...",
  "Generating side-by-side verification report..."
];

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
  sitemap: "Scanning site graph properties..."
};

// Dynamically compile active scan messages from the JSON config
const activeScanMessages = [
  ...initialScanMessages,
  ...Object.entries(scannerConfig.features)
    .filter(([_, isEnabled]) => isEnabled)
    .map(([key]) => featureMessagesMap[key] || `Scanning ${key}...`),
  "Generating final assessment report..."
];

const SECTION_KEYS = ["seo", "headings", "images", "links", "visual", "performance", "accessibility", "responsive", "security", "coreWebVitals", "structuredData", "robots", "sitemap"] as const;
type SectionKey = (typeof SECTION_KEYS)[number];

export default function HomePage() {
  const [url, setUrl] = useState("");
  const [designImage, setDesignImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [scanMsg, setScanMsg] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [openSections, setOpenSections] = useState<Record<SectionKey, boolean>>(
    Object.fromEntries(SECTION_KEYS.map((k) => [k, false])) as Record<SectionKey, boolean>
  );
  const sectionRefs = useRef<Record<SectionKey, HTMLDivElement | null>>(
    Object.fromEntries(SECTION_KEYS.map((k) => [k, null])) as Record<SectionKey, HTMLDivElement | null>
  );

  const reportRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  const scrollToSection = useCallback((key: SectionKey) => {
    setOpenSections((prev) => ({ ...prev, [key]: true }));
    setTimeout(() => {
      sectionRefs.current[key]?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  }, []);

  const handleSectionOpenChange = useCallback((key: SectionKey, val: boolean) => {
    setOpenSections((prev) => ({ ...prev, [key]: val }));
  }, []);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setDesignImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setDesignImage(null);
    }
  };

  const clearImage = () => {
    setDesignImage(null);
    // Reset file input value
    const fileInput = document.getElementById("design-file") as HTMLInputElement;
    if (fileInput) fileInput.value = "";
  };

  const downloadPDF = async () => {
    if (!result) return;
    try {
      setIsExporting(true);
      const pdf = new jsPDF("p", "mm", "a4");

      let yOffset = 20;
      const margin = 15;
      const lineHeight = 10;

      // Title & Meta
      const targetUrl = result.url || url;
      const reportDate = result.scanDate ? new Date(result.scanDate) : new Date();

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
        pdf.text(`Similarity Score: ${result.similarityScore.toFixed(2)}%`, margin, yOffset);
        yOffset += lineHeight;
        pdf.text(`Mismatched Pixels: ${result.mismatchedPixels.toLocaleString()}`, margin, yOffset);
        yOffset += lineHeight;
        pdf.text(`Total Pixels Analyzed: ${result.totalPixels.toLocaleString()}`, margin, yOffset);
      } else {
        // Scan Mode
        pdf.setFontSize(16);
        pdf.text("Overall Metrics", margin, yOffset);
        yOffset += lineHeight;

        pdf.setFontSize(12);
        pdf.text(`Overall Quality Score: ${result.overallScore}/100`, margin, yOffset);
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
            const friendlyName = key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1').trim();
            const sc = result[key].score;
            const scoreLabel = sc === -1 ? "N/A" : `${sc}/100`;
            pdf.text(`• ${friendlyName}: ${scoreLabel}`, margin + 5, yOffset);
            yOffset += lineHeight;
          }
        });
      }

      let hostName = "website";
      try {
        if (targetUrl.includes('//')) {
          hostName = new URL(targetUrl).hostname.replace('www.', '');
        } else {
          hostName = targetUrl.replace('www.', '');
        }
      } catch (e) {
        // Fallback silently if URL parser fails
      }

      const dateStr = reportDate.toISOString().split('T')[0];
      pdf.save(`coaxa-report-${dateStr}-${hostName}.pdf`);
    } catch (error) {
      console.error("Failed to export PDF:", error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleScan = async (scanUrl?: string) => {
    const targetUrl = scanUrl || url.trim();
    if (!targetUrl) return;
    if (scanUrl) setUrl(scanUrl);
    setLoading(true);
    setResult(null);
    setError(null);
    setScanMsg(0);
    setElapsed(0);

    // Rotate scan progress messages based on the current mode
    const msgInterval = setInterval(() => {
      setScanMsg((prev) => {
        const pool = designImage ? compareMessages : activeScanMessages;
        return (prev + 1) % pool.length;
      });
    }, 3000);

    // Elapsed time counter (updates every second)
    const elapsedInterval = setInterval(() => {
      setElapsed((prev) => prev + 1);
    }, 1000);

    // Client-side hard timeout: abort after 120s (or more for compare)
    const controller = new AbortController();
    const clientTimeout = setTimeout(() => controller.abort(), 120_000);

    try {
      const endpoint = designImage ? "/api/compare" : "/api/scan";
      const payload = designImage ? { url: targetUrl, designImage } : { url: targetUrl };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Scan failed");
      setResult(data);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        setError("Scan timed out after 120 seconds. The website may be too slow or unresponsive.");
      } else {
        setError(err instanceof Error ? err.message : "Something went wrong");
      }
    } finally {
      clearInterval(msgInterval);
      clearInterval(elapsedInterval);
      clearTimeout(clientTimeout);
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <div className="page__container">

        {/* Header */}
        <motion.div
          className={`page__header ${result ? 'page__header--compact' : 'page__header--expanded'}`}
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="page__badge">
            made with ❤️ by<a href="https://oneweekwonders.com" target="_blank">One Week Wonders</a>
          </div>
          <h1 className="page__headline">COAXA</h1>
          <p className="page__subheadline">
            An advanced web analyzer to validate SEO compliance, overall quality, and pixel-perfect design accuracy.
          </p>
        </motion.div>

        {/* Search Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="search-form"
        >
          <div className="search-form__row">
            <div className="search-form__input-wrap">
              <Globe size={18} className="search-form__icon" />
              <input
                name="url"
                className="glow-input search-form__input"
                placeholder="Enter website URL (e.g., example.com)"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !loading && handleScan()}
                disabled={loading}
              />
            </div>

            <div className="search-form__file-wrap">
              {designImage ? (
                <div className="search-form__file-ready">
                  <ImageIcon size={18} color="var(--success)" />
                  <span className="search-form__file-ready-text">Design Ready</span>
                  <button onClick={clearImage} className="search-form__file-clear">
                    <XCircle size={16} />
                  </button>
                </div>
              ) : (
                <>
                  <input
                    type="file"
                    id="design-file"
                    accept="image/png, image/jpeg, image/webp"
                    onChange={handleImageUpload}
                    className="search-form__file-input"
                    disabled={loading}
                  />
                  <div className="glow-input search-form__input search-form__file-placeholder">
                    <ImageIcon size={18} className="search-form__file-icon" />
                  </div>
                </>
              )}
            </div>

            <button className="btn-primary" onClick={() => handleScan()} disabled={loading || !url.trim()}>
              <AnimatePresence mode="wait">
                {loading ? (
                  <motion.div
                    key="loading"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.2 }}
                  >
                    <RotateCw size={18} style={{ animation: "spin 1s linear infinite" }} />
                  </motion.div>
                ) : designImage ? (
                  <motion.span
                    key="compare"
                    className="search-form__btn-content"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Layers size={18} /> Compare
                  </motion.span>
                ) : (
                  <motion.span
                    key="scan"
                    className="search-form__btn-content"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Search size={18} /> Scan
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          </div>
        </motion.div>

        {/* Loading State */}
        <AnimatePresence>
          {loading && (
            <motion.div
              className="loading-state"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="loading-state__spinner-wrap">
                {/* Elapsed timer */}
                {/* <div className="loading-state__timer">
                  {Math.floor(elapsed / 60).toString().padStart(2, "0")}:{(elapsed % 60).toString().padStart(2, "0")}
                </div> */}
                {/* Progress bar (fills up to 120s limit) */}
                <div className="loading-state__progress-track">
                  <div
                    className="loading-state__progress-bar"
                    style={{ width: `${Math.min(100, (elapsed / 120) * 100)}%` }}
                  />
                </div>
                <AnimatePresence mode="wait">
                  <motion.p
                    key={scanMsg}
                    className="loading-state__message"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    {designImage ? compareMessages[scanMsg] : activeScanMessages[scanMsg]}
                  </motion.p>
                </AnimatePresence>
              </div>
              <div className="loading-state__dots">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="pulse-dot" style={{ animationDelay: `${i * 0.3}s` }} />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div
              className="glass-card error-card"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <XCircle size={40} className="error-card__icon" />
              <h3 className="error-card__title">Scan Failed</h3>
              <p className="error-card__message">{error}</p>
              <button
                className="btn-primary error-card__retry-btn"
                onClick={() => handleScan()}
              >
                Try Again
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Results */}
        <AnimatePresence>
          {result && (
            <motion.div ref={reportRef} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }} className="report-container" style={{ padding: "20px 0" }}>

              {/* Overall Score */}
              {!result.diffImage && (
                <>
                  <motion.div
                    className="glass-card score-card"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                  >
                    <div className="score-card__url-row">
                      <ExternalLink size={14} className="score-card__url-icon" />
                      <a
                        href={result.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="score-card__url-link"
                      >
                        {result.url}
                      </a>
                    </div>
                    <div className="score-card__ring-wrap">
                      <ScoreRing score={result.overallScore} size={160} />
                    </div>
                    <h2 className="score-card__title">Overall Quality Score</h2>
                    <p className="score-card__meta">
                      Scanned on {new Date(result.scanDate).toLocaleString()}
                    </p>
                  </motion.div>

                  {/* Download PDF Action for Scan Mode */}
                  <div style={{ textAlign: "center", marginBottom: "30px" }}>
                    <button
                      className="btn-secondary"
                      onClick={downloadPDF}
                      disabled={isExporting}
                      style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "10px 20px", fontSize: "14px" }}
                    >
                      {isExporting ? (
                        <RotateCw size={16} style={{ animation: "spin 1s linear infinite" }} />
                      ) : (
                        <Download size={16} />
                      )}
                      {isExporting ? "Generating PDF..." : "Download Report as PDF"}
                    </button>
                  </div>
                </>
              )}

              {/* Design Verification Result */}
              {result.diffImage && (
                <>
                  <motion.div
                    className="glass-card compare-card"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                  >
                    <div className="compare-card__header">
                      <div>
                        <h2 className="score-card__title compare-card__title">Design Match Verification</h2>
                        <p className="compare-card__subtitle">
                          A pixel-perfect comparison between the uploaded design and the live website.
                        </p>
                        <div className="compare-card__badge">
                          <Bug size={14} className="compare-card__badge-icon" />
                          <span className="compare-card__badge-text">
                            <strong className="compare-card__badge-highlight">{result.mismatchedPixels.toLocaleString()}</strong> mismatched pixels out of {result.totalPixels.toLocaleString()}
                          </span>
                        </div>
                      </div>
                      <div className="score-card__ring-wrap compare-card__ring-wrapper">
                        <ScoreRing score={result.similarityScore} size={160} />
                      </div>
                    </div>

                    <div className="compare-card__grid">
                      <div className="compare-card__column">
                        <h4 className="compare-card__column-title">
                          <ImageIcon size={16} className="text-muted" /> Design Mockup
                        </h4>
                        <div className="screenshot-card__viewer compare-card__viewer">
                          <img src={result.originalDesignImage || designImage!} alt="Original Design" className="compare-card__img" />
                        </div>
                      </div>
                      <div className="compare-card__column">
                        <h4 className="compare-card__column-title">
                          <Globe size={16} className="text-muted" /> Live Website
                        </h4>
                        <div className="screenshot-card__viewer compare-card__viewer">
                          <img src={result.websiteScreenshot} alt="Live Website" className="compare-card__img" />
                        </div>
                      </div>
                      <div className="compare-card__column">
                        <h4 className="compare-card__column-title compare-card__column-title--danger">
                          <Zap size={16} /> Visual Differences
                        </h4>
                        <div className="screenshot-card__viewer compare-card__viewer compare-card__viewer--diff">
                          <img src={result.diffImage} alt="Differences" className="compare-card__img" />
                        </div>
                      </div>
                    </div>
                  </motion.div>

                  {/* Download PDF Action for Compare Mode */}
                  <div style={{ textAlign: "center", marginBottom: "30px" }}>
                    <button
                      className="btn-secondary"
                      onClick={downloadPDF}
                      disabled={isExporting}
                      style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "10px 20px", fontSize: "14px" }}
                    >
                      {isExporting ? (
                        <RotateCw size={16} style={{ animation: "spin 1s linear infinite" }} />
                      ) : (
                        <Download size={16} />
                      )}
                      {isExporting ? "Generating PDF..." : "Download Report as PDF"}
                    </button>
                  </div>
                </>
              )}

              {/* Category Scores Grid */}
              {!result.diffImage && (
                <div className="scores-grid">
                  {result.seo && <MiniScore score={result.seo.score} label="SEO" icon={FileText} onClick={() => scrollToSection("seo")} />}
                  {result.headings && <MiniScore score={result.headings.score} label="Headings" icon={Heading} onClick={() => scrollToSection("headings")} />}
                  {result.images && <MiniScore score={result.images.score} label="Images" icon={ImageIcon} onClick={() => scrollToSection("images")} />}
                  {result.links && <MiniScore score={result.links.score} label="Links" icon={Link2} onClick={() => scrollToSection("links")} />}
                  {result.visual && <MiniScore score={result.visual.score} label="Visual" icon={Palette} onClick={() => scrollToSection("visual")} />}
                  {result.performance && <MiniScore score={result.performance.score} label="Performance" icon={Zap} onClick={() => scrollToSection("performance")} />}
                  {result.accessibility && <MiniScore score={result.accessibility.score} label="Accessibility" icon={Accessibility} onClick={() => scrollToSection("accessibility")} />}
                  {result.responsive && <MiniScore score={result.responsive.score} label="Responsive" icon={Smartphone} onClick={() => scrollToSection("responsive")} />}
                  {result.security && <MiniScore score={result.security.score} label="Security" icon={ShieldCheck} onClick={() => scrollToSection("security")} />}
                  {result.coreWebVitals && <MiniScore score={result.coreWebVitals.score} label="Core Web Vitals" icon={Zap} onClick={() => scrollToSection("coreWebVitals")} />}
                  {result.structuredData && <MiniScore score={result.structuredData.score} label="Structured Data" icon={Network} onClick={() => scrollToSection("structuredData")} />}
                </div>
              )}

              {/* Tech Stack */}
              {result.techStack && (
                <motion.div
                  className="glass-card tech-stack-card"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                >
                  <div className="tech-stack-card__header">
                    <Layers size={18} className="tech-stack-card__header-icon" />
                    Tech Stack Detected
                    <span className="tech-stack-card__count">{result.techStack.totalDetected} technologies</span>
                  </div>
                  <div className="tech-stack-card__body">
                    <TechStackSection data={result.techStack} />
                  </div>
                </motion.div>
              )}

              {/* Full Page Screenshot */}
              {result.screenshot && (
                <motion.div
                  className="glass-card screenshot-card"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <div className="screenshot-card__header">
                    <Camera size={18} className="screenshot-card__header-icon" /> Full Page Screenshot
                  </div>
                  <div className="screenshot-card__viewer">
                    <img
                      src={result.screenshot}
                      alt="Full page screenshot"
                      className="screenshot-card__img"
                    />
                  </div>
                </motion.div>
              )}

              {/* Detailed Sections */}
              <div className="sections-grid">
                {result.seo && (
                  <CollapsibleSection ref={(el) => { sectionRefs.current.seo = el; }} title="SEO Meta Tags" icon={FileText} score={result.seo.score} open={openSections.seo} onOpenChange={(v) => handleSectionOpenChange("seo", v)}>
                    <SEOSection data={result.seo} />
                  </CollapsibleSection>
                )}

                {result.headings && (
                  <CollapsibleSection ref={(el) => { sectionRefs.current.headings = el; }} title="Heading Structure" icon={Heading} score={result.headings.score} open={openSections.headings} onOpenChange={(v) => handleSectionOpenChange("headings", v)}>
                    <HeadingsSection data={result.headings} />
                  </CollapsibleSection>
                )}

                {result.images && (
                  <CollapsibleSection ref={(el) => { sectionRefs.current.images = el; }} title="Image Audit" icon={ImageIcon} score={result.images.score} open={openSections.images} onOpenChange={(v) => handleSectionOpenChange("images", v)}>
                    <ImagesSection data={result.images} />
                  </CollapsibleSection>
                )}

                {result.links && (
                  <CollapsibleSection ref={(el) => { sectionRefs.current.links = el; }} title="Links &amp; Buttons" icon={Link2} score={result.links.score} open={openSections.links} onOpenChange={(v) => handleSectionOpenChange("links", v)}>
                    <LinksSection data={result.links} />
                  </CollapsibleSection>
                )}

                {result.visual && (
                  <CollapsibleSection ref={(el) => { sectionRefs.current.visual = el; }} title="Visual Consistency" icon={Palette} score={result.visual.score} open={openSections.visual} onOpenChange={(v) => handleSectionOpenChange("visual", v)}>
                    <VisualSection data={result.visual} />
                  </CollapsibleSection>
                )}

                {result.performance && (
                  <CollapsibleSection ref={(el) => { sectionRefs.current.performance = el; }} title="Performance" icon={Zap} score={result.performance.score} open={openSections.performance} onOpenChange={(v) => handleSectionOpenChange("performance", v)}>
                    <PerformanceSection data={result.performance} />
                  </CollapsibleSection>
                )}

                {result.accessibility && (
                  <CollapsibleSection ref={(el) => { sectionRefs.current.accessibility = el; }} title="Accessibility" icon={Accessibility} score={result.accessibility.score} open={openSections.accessibility} onOpenChange={(v) => handleSectionOpenChange("accessibility", v)}>
                    <AccessibilitySection data={result.accessibility} />
                  </CollapsibleSection>
                )}

                {result.responsive && (
                  <CollapsibleSection ref={(el) => { sectionRefs.current.responsive = el; }} title="Responsive Test" icon={Smartphone} score={result.responsive.score} open={openSections.responsive} onOpenChange={(v) => handleSectionOpenChange("responsive", v)}>
                    <ResponsiveSection data={result.responsive} />
                  </CollapsibleSection>
                )}

                {result.security && (
                  <CollapsibleSection ref={(el) => { sectionRefs.current.security = el; }} title="Security Standards" icon={ShieldCheck} score={result.security.score} open={openSections.security} onOpenChange={(v) => handleSectionOpenChange("security", v)}>
                    <SecuritySection data={result.security} />
                  </CollapsibleSection>
                )}

                {result.coreWebVitals && (
                  <CollapsibleSection ref={(el) => { sectionRefs.current.coreWebVitals = el; }} title="Core Web Vitals" icon={Zap} score={result.coreWebVitals.score} open={openSections.coreWebVitals} onOpenChange={(v) => handleSectionOpenChange("coreWebVitals", v)}>
                    <CoreWebVitalsSection data={result.coreWebVitals} />
                  </CollapsibleSection>
                )}

                {result.structuredData && (
                  <CollapsibleSection ref={(el) => { sectionRefs.current.structuredData = el; }} title="Structured Data" icon={Network} score={result.structuredData.score} open={openSections.structuredData} onOpenChange={(v) => handleSectionOpenChange("structuredData", v)}>
                    <StructuredDataSection data={result.structuredData} />
                  </CollapsibleSection>
                )}

                {result.robots && (
                  <CollapsibleSection ref={(el) => { sectionRefs.current.robots = el; }} title="Robots.txt" icon={Bug} score={-1} open={openSections.robots} onOpenChange={(v) => handleSectionOpenChange("robots", v)}>
                    <RobotsSection data={result.robots} />
                  </CollapsibleSection>
                )}

                {result.sitemap && (
                  <CollapsibleSection ref={(el) => { sectionRefs.current.sitemap = el; }} title={`Sitemap (${result.sitemap?.urls?.length || 0} URLs)`} icon={Map} score={-1} open={openSections.sitemap} onOpenChange={(v) => handleSectionOpenChange("sitemap", v)}>
                    <SitemapSection data={result.sitemap} onScanUrl={(u: string) => handleScan(u)} />
                  </CollapsibleSection>
                )}
              </div>

              {/* Footer */}
              <div className="page__footer">
                COAXA — Powered by One Week Wonders
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Empty State */}
        {!loading && !result && !error && (
          <></>
          // <motion.div
          //   className="empty-state"
          //   initial={{ opacity: 0 }}
          //   animate={{ opacity: 1 }}
          //   transition={{ delay: 0.4 }}
          // >
          //   <Search size={48} className="empty-state__icon" />
          //   <p className="empty-state__primary">Enter a URL above to start scanning</p>
          //   <p className="empty-state__secondary">
          //     Checks SEO, images, links, visual consistency, performance &amp; accessibility
          //   </p>
          // </motion.div>
        )}
      </div>
    </div>
  );
}
