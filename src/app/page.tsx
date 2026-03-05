"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, Layers } from "lucide-react";

import { useScan } from "@/hooks/useScan";
import { useDesignImage } from "@/hooks/useDesignImage";
import { useSections } from "@/hooks/useSections";
import { downloadPDF } from "@/utils/downloadPDF";

import {
  SearchForm,
  LoadingState,
  ErrorState,
  ScanScoreCard,
  CompareResult,
  ScoresGrid,
  SectionsGrid,
  WelcomeState,
} from "@/components/home";
import SectionSkeleton from "@/components/ui/SectionSkeleton";
import TechStackSection from "@/components/sections/TechStackSection";

/* eslint-disable @typescript-eslint/no-explicit-any */

export default function HomePage() {
  const { designImage, handleImageUpload, clearImage } = useDesignImage();
  const { url, setUrl, loading, result, error, scanMsg, elapsed, handleScan } =
    useScan(designImage);
  const { openSections, sectionRefs, scrollToSection, handleSectionOpenChange } =
    useSections();

  const reportRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  const handleDownloadPDF = () => downloadPDF(result, url, setIsExporting);

  return (
    <div className="page">
      <div className="page__container">
        {/* Header */}
        <motion.div
          className={`page__header ${result ? "page__header--compact" : "page__header--expanded"}`}
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
          onScan={() => handleScan()}
        />

        {/* Loading State */}
        <AnimatePresence>
          {loading && (
            <>
              <LoadingState
                elapsed={elapsed}
                scanMsg={scanMsg}
                designImage={designImage}
              />
              <SectionSkeleton count={4} />
            </>
          )}
        </AnimatePresence>

        {/* Error */}
        <AnimatePresence>
          {error && <ErrorState error={error} onRetry={() => handleScan()} />}
        </AnimatePresence>

        {/* Results */}
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
              <div className="page__footer">
                COAXA — Powered by One Week Wonders
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Welcome State */}
        <AnimatePresence>
          {!loading && !result && !error && (
            <WelcomeState onScanUrl={(u) => { setUrl(u); handleScan(u); }} />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
