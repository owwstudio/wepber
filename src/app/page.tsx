"use client";

import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
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

const scanMessages = [
  "Launching browser engine...",
  "Navigating to target URL...",
  "Analyzing SEO meta tags...",
  "Scanning heading structure...",
  "Auditing images...",
  "Checking links & buttons...",
  "Analyzing visual consistency...",
  "Measuring performance...",
  "Running accessibility checks...",
  "Generating report...",
];

const SECTION_KEYS = ["seo", "headings", "images", "links", "visual", "performance", "accessibility", "responsive", "security", "sitemap"] as const;
type SectionKey = (typeof SECTION_KEYS)[number];

export default function HomePage() {
  const [url, setUrl] = useState("");
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

  const scrollToSection = useCallback((key: SectionKey) => {
    setOpenSections((prev) => ({ ...prev, [key]: true }));
    setTimeout(() => {
      sectionRefs.current[key]?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  }, []);

  const handleSectionOpenChange = useCallback((key: SectionKey, val: boolean) => {
    setOpenSections((prev) => ({ ...prev, [key]: val }));
  }, []);

  const handleScan = async (scanUrl?: string) => {
    const targetUrl = scanUrl || url.trim();
    if (!targetUrl) return;
    if (scanUrl) setUrl(scanUrl);
    setLoading(true);
    setResult(null);
    setError(null);
    setScanMsg(0);
    setElapsed(0);

    // Rotate scan progress messages
    const msgInterval = setInterval(() => {
      setScanMsg((prev) => (prev + 1) % scanMessages.length);
    }, 3000);

    // Elapsed time counter (updates every second)
    const elapsedInterval = setInterval(() => {
      setElapsed((prev) => prev + 1);
    }, 1000);

    // Client-side hard timeout: abort after 120s
    const controller = new AbortController();
    const clientTimeout = setTimeout(() => controller.abort(), 120_000);

    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: targetUrl }),
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
          className="page__header"
          style={result ? { paddingTop: "0vh" } : { paddingTop: "20vh" }}
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="page__badge">
            made with ❤️ by<a href="https://oneweekwonders.com" target="_blank">One Week Wonders</a>
          </div>
          <h1 className="page__headline">COAXA</h1>
          <p className="page__subheadline">
            a web analyzer tool to analyze any website for SEO compliance, broken elements, visual consistency, and overall quality.
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
              {/* <label for="url">URL:</label> */}
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
            <button className="btn-primary" onClick={() => handleScan()} disabled={loading || !url.trim()}>
              {loading ? (
                <RotateCw size={18} style={{ animation: "spin 1s linear infinite" }} />
              ) : (
                <span className="search-form__btn-content">
                  <Search size={18} /> Scan
                </span>
              )}
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
                <div className="loading-state__timer">
                  {Math.floor(elapsed / 60).toString().padStart(2, "0")}:{(elapsed % 60).toString().padStart(2, "0")}
                </div>
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
                    {scanMessages[scanMsg]}
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
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>

              {/* Overall Score */}
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

              {/* Category Scores Grid */}
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
              </div>

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

                {result.sitemap && (
                  <CollapsibleSection ref={(el) => { sectionRefs.current.sitemap = el; }} title={`Sitemap (${result.sitemap?.urls?.length || 0} URLs)`} icon={Map} score={-1} open={openSections.sitemap} onOpenChange={(v) => handleSectionOpenChange("sitemap", v)}>
                    <SitemapSection data={result.sitemap} onScanUrl={(u: string) => handleScan(u)} />
                  </CollapsibleSection>
                )}
              </div>

              {/* Footer */}
              <div className="page__footer">
                SEO &amp; Quality Checker — Powered by Puppeteer
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
