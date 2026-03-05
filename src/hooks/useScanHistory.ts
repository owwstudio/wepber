"use client";

import { useState, useCallback, useEffect } from "react";
import { SECTION_KEYS, type SectionKey } from "@/types/scan";

/* eslint-disable @typescript-eslint/no-explicit-any */

const STORAGE_KEY = "coaxa_scan_history";
const MAX_HISTORY = 20;

/**
 * A single scan history entry stored in localStorage.
 * Captures scores for each section + previous scan scores for delta display.
 */
export interface ScanHistoryEntry {
  url: string;
  scanDate: string;
  overallScore: number;
  sectionScores: Partial<Record<SectionKey, number>>;
  /** Previous overall score (from the scan before this one for the same URL). */
  previousOverallScore?: number;
  /** Previous section scores (from the scan before this one for the same URL). */
  previousSectionScores?: Partial<Record<SectionKey, number>>;
}

function loadHistory(): ScanHistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function persistHistory(entries: ScanHistoryEntry[]): void {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(entries.slice(0, MAX_HISTORY))
    );
  } catch {
    // localStorage may be full or unavailable — fail silently
  }
}

/**
 * Custom hook for managing scan history in localStorage.
 *
 * Stores the last MAX_HISTORY scan results, keyed by URL.
 * When a URL is re-scanned, the previous scores are preserved
 * so the UI can show improvement/regression deltas.
 *
 * @see agent.md §18 — Historical Scan Comparison
 */
export function useScanHistory() {
  // Start with [] on both server and client to avoid hydration mismatch.
  // localStorage is only available client-side, so we load it after mount.
  const [history, setHistory] = useState<ScanHistoryEntry[]>([]);

  useEffect(() => {
    setHistory(loadHistory());
  }, []);

  /**
   * Save a scan result to history. Captures current + previous
   * scores for delta computation.
   */
  const addEntry = useCallback((result: any) => {
    if (!result || !result.url || result.diffImage) return; // Skip compare mode

    const sectionScores: Partial<Record<SectionKey, number>> = {};
    for (const key of SECTION_KEYS) {
      if (result[key] && typeof result[key].score === "number") {
        sectionScores[key] = result[key].score;
      }
    }

    setHistory((prev) => {
      const existing = prev.find((e) => e.url === result.url);

      const entry: ScanHistoryEntry = {
        url: result.url,
        scanDate: result.scanDate || new Date().toISOString(),
        overallScore: result.overallScore,
        sectionScores,
        previousOverallScore: existing?.overallScore,
        previousSectionScores: existing?.sectionScores,
      };

      const filtered = prev.filter((e) => e.url !== entry.url);
      const updated = [entry, ...filtered].slice(0, MAX_HISTORY);
      persistHistory(updated);
      return updated;
    });
  }, []);

  /**
   * Get score deltas between current and previous scan for a URL.
   * Returns null deltas if no previous scan exists.
   */
  const getScoreDeltas = useCallback(
    (
      url: string
    ): {
      overall: number | null;
      sections: Partial<Record<SectionKey, number>>;
    } => {
      const entry = history.find((e) => e.url === url);
      if (!entry || entry.previousOverallScore === undefined) {
        return { overall: null, sections: {} };
      }

      const sectionDeltas: Partial<Record<SectionKey, number>> = {};
      for (const key of SECTION_KEYS) {
        const current = entry.sectionScores[key];
        const prev = entry.previousSectionScores?.[key];
        if (current !== undefined && prev !== undefined) {
          sectionDeltas[key] = current - prev;
        }
      }

      return {
        overall: entry.overallScore - entry.previousOverallScore,
        sections: sectionDeltas,
      };
    },
    [history]
  );

  /** Clear all scan history. */
  const clearHistory = useCallback(() => {
    setHistory([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // fail silently
    }
  }, []);

  return { history, addEntry, getScoreDeltas, clearHistory };
}
