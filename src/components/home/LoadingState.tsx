"use client";

import { motion, AnimatePresence } from "framer-motion";
import { activeScanMessages, compareMessages } from "@/config/scanMessages";

interface LoadingStateProps {
  elapsed: number;
  scanMsg: number;
  designImage: string | null;
}

/**
 * Loading overlay with progress bar, rotating messages, and pulse dots.
 *
 * Uses dynamic message pool from scanMessages config.
 * Inline `style={{ width }}` permitted per agent.md §6 (dynamic calculation).
 */
export default function LoadingState({
  elapsed,
  scanMsg,
  designImage,
}: LoadingStateProps) {
  const messages = designImage ? compareMessages : activeScanMessages;

  return (
    <motion.div
      className="loading-state"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="loading-state__spinner-wrap">
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
            {messages[scanMsg]}
          </motion.p>
        </AnimatePresence>
      </div>
      <div className="loading-state__dots">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="pulse-dot"
            style={{ animationDelay: `${i * 0.3}s` }}
          />
        ))}
      </div>
    </motion.div>
  );
}
