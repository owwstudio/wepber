"use client";

import { motion } from "framer-motion";
import { WifiOff, Clock, Link2, Globe, ServerCrash, XCircle } from "lucide-react";
import type { ScanError } from "@/types/scan";
import type { LucideIcon } from "lucide-react";

interface ErrorStateProps {
  error: ScanError;
  onRetry: () => void;
}

const ERROR_CONFIG: Record<ScanError["type"], { icon: LucideIcon; title: string; suggestion: string }> = {
  network:       { icon: WifiOff,     title: "Connection Error",    suggestion: "Check your internet connection and try again." },
  timeout:       { icon: Clock,       title: "Scan Timed Out",      suggestion: "The website may be too slow or unresponsive. Try again later." },
  "invalid-url": { icon: Link2,       title: "Invalid URL",         suggestion: "Please enter a valid website URL (e.g., example.com)." },
  unreachable:   { icon: Globe,       title: "Site Unreachable",    suggestion: "The website could not be reached. Verify the URL is correct." },
  server:        { icon: ServerCrash, title: "Server Error",        suggestion: "Something went wrong on our end. Please try again." },
  unknown:       { icon: XCircle,     title: "Scan Failed",         suggestion: "An unexpected error occurred." },
};

/**
 * Error card with per-type icon, title, suggestion, and retry button.
 */
export default function ErrorState({ error, onRetry }: ErrorStateProps) {
  const config = ERROR_CONFIG[error.type] || ERROR_CONFIG.unknown;
  const Icon = config.icon;

  return (
    <motion.div
      className="glass-card error-card"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
    >
      <Icon size={40} className="error-card__icon" />
      <h3 className="error-card__title">{config.title}</h3>
      <p className="error-card__message">{error.message}</p>
      <p className="error-card__suggestion">{config.suggestion}</p>
      <button className="btn-primary error-card__retry-btn" onClick={onRetry}>
        Try Again
      </button>
    </motion.div>
  );
}
