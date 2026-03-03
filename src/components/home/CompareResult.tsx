"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { motion } from "framer-motion";
import {
  Image as ImageIcon,
  Globe,
  Zap,
  Bug,
  Download,
  RotateCw,
} from "lucide-react";
import ScoreRing from "@/components/ui/ScoreRing";

interface CompareResultProps {
  result: any;
  designImage: string | null;
  isExporting: boolean;
  onDownloadPDF: () => void;
}

/**
 * Design Match Verification — 3-column comparison grid + PDF button.
 *
 * @see agent.md §7  — derives image from response (result.originalDesignImage || designImage)
 * @see agent.md §11 — contextual action binding (PDF below score card)
 */
export default function CompareResult({
  result,
  designImage,
  isExporting,
  onDownloadPDF,
}: CompareResultProps) {
  return (
    <>
      <motion.div
        className="glass-card compare-card"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        <div className="compare-card__header">
          <div>
            <h2 className="score-card__title compare-card__title">
              Design Match Verification
            </h2>
            <p className="compare-card__subtitle">
              A pixel-perfect comparison between the uploaded design and the
              live website.
            </p>
            <div className="compare-card__badge">
              <Bug size={14} className="compare-card__badge-icon" />
              <span className="compare-card__badge-text">
                <strong className="compare-card__badge-highlight">
                  {result.mismatchedPixels.toLocaleString()}
                </strong>{" "}
                mismatched pixels out of{" "}
                {result.totalPixels.toLocaleString()}
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
              <img
                src={result.originalDesignImage || designImage!}
                alt="Original Design"
                className="compare-card__img"
              />
            </div>
          </div>
          <div className="compare-card__column">
            <h4 className="compare-card__column-title">
              <Globe size={16} className="text-muted" /> Live Website
            </h4>
            <div className="screenshot-card__viewer compare-card__viewer">
              <img
                src={result.websiteScreenshot}
                alt="Live Website"
                className="compare-card__img"
              />
            </div>
          </div>
          <div className="compare-card__column">
            <h4 className="compare-card__column-title compare-card__column-title--danger">
              <Zap size={16} /> Visual Differences
            </h4>
            <div className="screenshot-card__viewer compare-card__viewer compare-card__viewer--diff">
              <img
                src={result.diffImage}
                alt="Differences"
                className="compare-card__img"
              />
            </div>
          </div>
        </div>
      </motion.div>

      {/* Download PDF — contextually bound beneath compare card (§11) */}
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
