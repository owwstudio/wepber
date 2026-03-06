"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, Layers } from "lucide-react";

import { useScan } from "@/hooks/useScan";
import { useDesignCompare } from "@/hooks/useDesignCompare";
import { useDesignImage } from "@/hooks/useDesignImage";
import { useSections } from "@/hooks/useSections";
import { useScanHistory } from "@/hooks/useScanHistory";
import { downloadPDF } from "@/utils/downloadPDF";

import {
  SearchForm,
  LoadingState,
  ErrorState,
  ScanScoreCard,
  CompareResult,
  ScoresGrid,
  SectionsGrid,
  RecentScans,
  WelcomeState,
} from "@/components/home";
import SectionSkeleton from "@/components/ui/SectionSkeleton";
import TechStackSection from "@/components/sections/TechStackSection";

/* eslint-disable @typescript-eslint/no-explicit-any */

export default function HomePage() {
  const { designImage, handleImageUpload, clearImage } = useDesignImage();

  // Scan mode (no design image)
  const {
    url: scanUrl,
    setUrl: setScanUrl,
    loading: scanLoading,
    result: scanResult,
    error: scanError,
    scanMsg: scanScanMsg,
    elapsed: scanElapsed,
    streaming,
    handleScan,
  } = useScan();

  // Compare mode (design image present) — dedicated SSE hook
  const {
    loading: compareLoading,
    result: compareResult,
    error: compareError,
    streamStatus: compareStatus,
    scanMsg: compareScanMsg,
    elapsed: compareElapsed,
    compare,
    clearResult: clearCompareResult,
  } = useDesignCompare();

  const { openSections, sectionRefs, scrollToSection, handleSectionOpenChange } =
    useSections();
  const { history, addEntry, getScoreDeltas, clearHistory } = useScanHistory();

  const reportRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  // Unified URL state: scan URL drives both modes
  const url = scanUrl;
  const setUrl = setScanUrl;

  // Active mode flags
  const isCompareMode = !!designImage;
  const loading = isCompareMode ? compareLoading : scanLoading;
  const result = isCompareMode ? compareResult : scanResult;
  const error = isCompareMode ? compareError : scanError;
  const scanMsg = isCompareMode ? compareScanMsg : scanScanMsg;
  const elapsed = isCompareMode ? compareElapsed : scanElapsed;

  // Save completed scan results to history (scan mode only)
  useEffect(() => {
    if (scanResult && scanResult.overallScore !== undefined && !streaming) {
      addEntry(scanResult);
    }
  }, [scanResult, streaming, addEntry]);

  // Clear compare result when design image is cleared
  useEffect(() => {
    if (!designImage) clearCompareResult();
  }, [designImage, clearCompareResult]);

  // Auto-scan from ?q= query param (shareable scan links)
  // e.g. coaxa.com?q=stripe.com → immediately starts scan for stripe.com
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const q = params.get("q");
    if (q) {
      const decoded = decodeURIComponent(q);
      setScanUrl(decoded);
      handleScan(decoded);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Compute score deltas for the current result
  const deltas = scanResult?.url ? getScoreDeltas(scanResult.url) : null;

  const handleDownloadPDF = () => downloadPDF(result, url, setIsExporting);

  const handleScanOrCompare = (targetUrl?: string) => {
    const u = (targetUrl || url).trim();
    if (!u) return;
    // Update URL bar so this scan result is shareable
    window.history.replaceState(null, "", `?q=${encodeURIComponent(u)}`);
    if (isCompareMode) {
      compare(u, designImage!);
    } else {
      handleScan(targetUrl);
    }
  };

  // Whether to show loading state (only when no partial results yet)
  const showLoading = loading && !result;

  return (
    <div className="page">
      <div className="page__container">
        {/* Header */}
        <motion.div
          // className={`page__header ${result ? "page__header--compact" : "page__header--expanded"}`}
          className="page__header"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="page__badge">
            made with ❤️ by
            <a href="https://oneweekwonders.com" target="_blank">
              One Week Wonders
            </a>
          </div>
          <h1 className="page__headline">COAXA</h1>
          <p className="page__subheadline">
            An advanced web analyzer to validate SEO compliance, overall
            quality, and pixel-perfect design accuracy.
          </p>
        </motion.div>

        {/* Search Form */}
        <SearchForm
          url={url}
          onUrlChange={setUrl}
          loading={loading}
          designImage={designImage}
          onImageUpload={handleImageUpload}
          onClearImage={clearImage}
          onScan={() => handleScanOrCompare()}
        />

        {/* Recent Scans — shown when idle (no result, not loading) */}
        {!loading && !result && !error && (
          <RecentScans
            history={history}
            onScanUrl={(u: string) => {
              window.history.replaceState(null, "", `?q=${encodeURIComponent(u)}`);
              setUrl(u);
              handleScan(u);
            }}
            onClear={clearHistory}
          />
        )}

        {/* Loading State — only shown before first section/result arrives */}
        <AnimatePresence>
          {showLoading && (
            <>
              <LoadingState
                elapsed={elapsed}
                scanMsg={scanMsg}
                designImage={designImage}
                streamStatus={compareStatus}
              />
              {/* Only show skeletons in scan mode — compare has no sections */}
              {!isCompareMode && <SectionSkeleton count={2} />}
            </>
          )}
        </AnimatePresence>

        {/* Error */}
        <AnimatePresence>
          {error && <ErrorState error={error} onRetry={() => handleScanOrCompare()} />}
        </AnimatePresence>

        {/* Results — appears as soon as first section streams in */}
        <AnimatePresence>
          {result && (
            <motion.div
              ref={reportRef}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="report-container"
            >
              {/* Scan Mode — Overall Score */}
              {!result.diffImage && (
                <ScanScoreCard
                  result={result}
                  isExporting={isExporting}
                  overallDelta={deltas?.overall}
                  isStreaming={streaming}
                  onDownloadPDF={handleDownloadPDF}
                />
              )}

              {/* Compare Mode — Design Match Verification */}
              {result.diffImage && (
                <CompareResult
                  result={result}
                  designImage={designImage}
                  isExporting={isExporting}
                  onDownloadPDF={handleDownloadPDF}
                />
              )}

              {/* Category Scores Grid */}
              {!result.diffImage && (
                <ScoresGrid
                  result={result}
                  sectionDeltas={deltas?.sections}
                  onScrollToSection={scrollToSection}
                />
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
                    <span className="tech-stack-card__count">
                      {result.techStack.totalDetected} technologies
                    </span>
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
                    <Camera
                      size={18}
                      className="screenshot-card__header-icon"
                    />{" "}
                    Full Page Screenshot
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
              <SectionsGrid
                result={result}
                openSections={openSections}
                sectionRefs={sectionRefs}
                onSectionOpenChange={handleSectionOpenChange}
                onScanUrl={(u: string) => handleScan(u)}
              />

              {/* Footer */}
              {!streaming && (
                <div className="page__footer">
                  © 2026 COAXA — by One Week Wonders
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Welcome State */}
        <AnimatePresence>
          {!loading && !result && !error && (
            <WelcomeState onScanUrl={(u) => {
              window.history.replaceState(null, "", `?q=${encodeURIComponent(u)}`);
              setUrl(u);
              handleScan(u);
            }} />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
