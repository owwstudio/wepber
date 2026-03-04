"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { motion } from "framer-motion";
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
 * Shows score delta vs previous scan when available.
 *
 * PDF button placed directly below score card per agent.md §11
 * (contextual action binding).
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
          {isStreaming && (
            <span className="score-card__streaming-badge">
              <Loader size={12} className="score-card__streaming-spinner" />
              Scanning...
            </span>
          )}
        </div>
        <div className="score-card__ring-wrap">
          <ScoreRing
            score={isStreaming ? 0 : result.overallScore}
            size={160}
          />
        </div>
        <h2 className="score-card__title">Overall Quality Score</h2>
        {overallDelta !== undefined && overallDelta !== null && overallDelta !== 0 && !isStreaming && (
          <div className="score-card__delta-row">
            <span
              className={`score-card__delta ${overallDelta > 0 ? "score-card__delta--positive" : "score-card__delta--negative"}`}
            >
              {overallDelta > 0 ? (
                <TrendingUp size={14} />
              ) : (
                <TrendingDown size={14} />
              )}
              {overallDelta > 0 ? "+" : ""}
              {overallDelta} vs previous scan
            </span>
          </div>
        )}
        <p className="score-card__meta">
          {isStreaming
            ? "Scanning sections..."
            : `Scanned on ${new Date(result.scanDate).toLocaleString()}`}
        </p>
      </motion.div>

      {/* Download PDF — contextually bound beneath score card (§11) */}
      {!isStreaming && (
        <div className="score-card__action-row">
          <button
            className="btn-secondary score-card__download-btn"
            onClick={onDownloadPDF}
            disabled={isExporting}
          >
            {isExporting ? (
              <RotateCw
                size={16}
                style={{ animation: "spin 1s linear infinite" }}
              />
            ) : (
              <Download size={16} />
            )}
            {isExporting ? "Generating PDF..." : "Download Report as PDF"}
          </button>
        </div>
      )}
    </>
  );
}
