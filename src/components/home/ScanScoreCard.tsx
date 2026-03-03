"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { motion } from "framer-motion";
import { ExternalLink, Download, RotateCw } from "lucide-react";
import ScoreRing from "@/components/ui/ScoreRing";

interface ScanScoreCardProps {
  result: any;
  isExporting: boolean;
  onDownloadPDF: () => void;
}

/**
 * Overall quality score card + PDF download button for Scan mode.
 *
 * PDF button placed directly below score card per agent.md §11
 * (contextual action binding).
 */
export default function ScanScoreCard({
  result,
  isExporting,
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
        </div>
        <div className="score-card__ring-wrap">
          <ScoreRing score={result.overallScore} size={160} />
        </div>
        <h2 className="score-card__title">Overall Quality Score</h2>
        <p className="score-card__meta">
          Scanned on {new Date(result.scanDate).toLocaleString()}
        </p>
      </motion.div>

      {/* Download PDF — contextually bound beneath score card (§11) */}
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
    </>
  );
}
