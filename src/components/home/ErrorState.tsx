"use client";

import { motion } from "framer-motion";
import { XCircle } from "lucide-react";

interface ErrorStateProps {
  error: string;
  onRetry: () => void;
}

/**
 * Error card with retry button.
 */
export default function ErrorState({ error, onRetry }: ErrorStateProps) {
  return (
    <motion.div
      className="glass-card error-card"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
    >
      <XCircle size={40} className="error-card__icon" />
      <h3 className="error-card__title">Scan Failed</h3>
      <p className="error-card__message">{error}</p>
      <button className="btn-primary error-card__retry-btn" onClick={onRetry}>
        Try Again
      </button>
    </motion.div>
  );
}
