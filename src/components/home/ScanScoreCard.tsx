"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { AnimatePresence, motion } from "framer-motion";
import { ExternalLink, Download, RotateCw, TrendingUp, TrendingDown, Loader } from "lucide-react";
import ScoreRing from "@/components/ui/ScoreRing";

interface ScanScoreCardProps {
  result: any;
  isExporting: boolean;
  overallDelta?: number | null;
  isStreaming?: boolean;
  onDownloadPDF: () => void;
}



/**
 * Overall quality score card + PDF download button for Scan mode.
 * Each state (streaming → done) cross-fades smoothly via AnimatePresence.
 *
 * @see agent.md §18 — Historical Scan Comparison
 * @see agent.md §19 — Progressive Result Streaming
 */
export default function ScanScoreCard({
  result,
  isExporting,
  overallDelta,
  isStreaming,
  onDownloadPDF,
}: ScanScoreCardProps) {
  return (
    <>
      <motion.div
        className="glass-card score-card"
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      >
        {/* URL row */}
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

        {/* Ring / Loader — cross-fade between states */}
        <div className="score-card__ring-wrap" style={{ position: "relative", minHeight: 160 }}>
          <AnimatePresence mode="wait">
            {isStreaming ? (
              <motion.div
                key="loader"
                style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1, transition: { duration: 0.3 } }}
                exit={{ opacity: 0, scale: 0.7, transition: { duration: 0.2 } }}
              >
                <Loader size={42} className="score-card__streaming-spinner" />
              </motion.div>
            ) : (
              <motion.div
                key="ring"
                style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1, transition: { duration: 0.5, ease: [0.34, 1.56, 0.64, 1] } }}
                exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
              >
                <ScoreRing score={result.overallScore} size={160} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Title — slides up when streaming ends */}
        <AnimatePresence>
          {!isStreaming && (
            <motion.h2
              key="title"
              className="score-card__title"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0, transition: { duration: 0.35, delay: 0.1 } }}
              exit={{ opacity: 0, y: 4, transition: { duration: 0.2 } }}
            >
              Overall Quality Score
            </motion.h2>
          )}
        </AnimatePresence>

        {/* Delta badge — appears after title */}
        <AnimatePresence>
          {!isStreaming && overallDelta !== undefined && overallDelta !== null && overallDelta !== 0 && (
            <motion.div
              key="delta"
              className="score-card__delta-row"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0, transition: { duration: 0.35, delay: 0.18 } }}
              exit={{ opacity: 0, y: 4, transition: { duration: 0.2 } }}
            >
              <span className={`score-card__delta ${overallDelta > 0 ? "score-card__delta--positive" : "score-card__delta--negative"}`}>
                {overallDelta > 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                {overallDelta > 0 ? "+" : ""}{overallDelta} vs previous scan
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Meta text — cross-fades between "Scanning…" and scan date */}
        <div style={{ position: "relative", minHeight: 20, marginTop: 6 }}>
          <AnimatePresence mode="wait">
            <motion.p
              key={isStreaming ? "scanning" : "date"}
              className="score-card__meta"
              style={{ position: "absolute", left: 0, right: 0, textAlign: "center" }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, transition: { duration: 0.3 } }}
              exit={{ opacity: 0, transition: { duration: 0.2 } }}
            >
              {isStreaming
                ? "Preparing data..."
                : `Scanned on ${new Date(result.scanDate).toLocaleString()}`}
            </motion.p>
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Download PDF — slides down once streaming ends */}
      <AnimatePresence>
        {!isStreaming && (
          <motion.div
            key="pdf-row"
            className="score-card__action-row"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0, transition: { duration: 0.35, delay: 0.25, ease: "easeOut" } }}
            exit={{ opacity: 0, y: 6, transition: { duration: 0.2 } }}
          >
            <button
              className="btn-secondary score-card__download-btn"
              onClick={onDownloadPDF}
              disabled={isExporting}
            >
              {isExporting ? (
                <RotateCw size={16} style={{ animation: "spin 1s linear infinite" }} />
              ) : (
                <Download size={16} />
              )}
              {isExporting ? "Generating PDF..." : "Download Report as PDF"}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
