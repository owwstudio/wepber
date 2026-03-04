"use client";

import { motion, AnimatePresence } from "framer-motion";
import { History, ExternalLink, Trash2, TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { ScanHistoryEntry } from "@/hooks/useScanHistory";

interface RecentScansProps {
  history: ScanHistoryEntry[];
  onScanUrl: (url: string) => void;
  onClear: () => void;
}

function DeltaBadge({ delta }: { delta?: number }) {
  if (delta === undefined || delta === null) return null;
  if (delta === 0) {
    return (
      <span className="recent-scans__delta recent-scans__delta--neutral">
        <Minus size={10} /> 0
      </span>
    );
  }
  const isPositive = delta > 0;
  return (
    <span
      className={`recent-scans__delta ${isPositive ? "recent-scans__delta--positive" : "recent-scans__delta--negative"}`}
    >
      {isPositive ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
      {isPositive ? "+" : ""}
      {delta}
    </span>
  );
}

/**
 * Recent scans list — shows previously scanned URLs with scores.
 * Click any entry to re-scan that URL.
 *
 * @see agent.md §18 — Historical Scan Comparison
 */
export default function RecentScans({
  history,
  onScanUrl,
  onClear,
}: RecentScansProps) {
  if (history.length === 0) return null;

  return (
    <motion.div
      className="recent-scans"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
    >
      <div className="recent-scans__header">
        <div className="recent-scans__title">
          <History size={14} />
          Recent Scans
        </div>
        <button
          className="recent-scans__clear-btn"
          onClick={onClear}
          title="Clear history"
        >
          <Trash2 size={12} />
        </button>
      </div>
      <div className="recent-scans__list">
        <AnimatePresence>
          {history.slice(0, 5).map((entry, i) => {
            const delta =
              entry.previousOverallScore !== undefined
                ? entry.overallScore - entry.previousOverallScore
                : undefined;

            const scoreClass =
              entry.overallScore >= 80
                ? "recent-scans__score--good"
                : entry.overallScore >= 50
                  ? "recent-scans__score--warn"
                  : "recent-scans__score--poor";

            let hostname = entry.url;
            try {
              hostname = new URL(entry.url).hostname;
            } catch {
              /* use raw url */
            }

            const timeAgo = getTimeAgo(entry.scanDate);

            return (
              <motion.button
                key={entry.url}
                className="recent-scans__item"
                onClick={() => onScanUrl(entry.url)}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ delay: i * 0.05 }}
                title={`Re-scan ${entry.url}`}
              >
                <ExternalLink size={12} className="recent-scans__item-icon" />
                <span className="recent-scans__item-url">{hostname}</span>
                <span className="recent-scans__item-time">{timeAgo}</span>
                <span className={`recent-scans__score ${scoreClass}`}>
                  {entry.overallScore}
                </span>
                <DeltaBadge delta={delta} />
              </motion.button>
            );
          })}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

function getTimeAgo(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60_000);
    if (diffMin < 1) return "just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    const diffDay = Math.floor(diffHr / 24);
    if (diffDay < 7) return `${diffDay}d ago`;
    return date.toLocaleDateString();
  } catch {
    return "";
  }
}
