"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import MiniScore from "@/components/ui/MiniScore";
import { sectionRegistry } from "@/config/sectionRegistry";
import type { SectionKey } from "@/types/scan";

interface ScoresGridProps {
  result: any;
  sectionDeltas?: Partial<Record<SectionKey, number>>;
  onScrollToSection: (key: SectionKey) => void;
}

/**
 * Mini scores grid — data-driven via sectionRegistry.
 *
 * Iterates registered sections that have `showMiniScore: true` and
 * exist in the result payload. Shows score deltas when available.
 *
 * @see agent.md §9  — Dynamic Component Configuration
 * @see agent.md §18 — Historical Scan Comparison
 */
export default function ScoresGrid({
  result,
  sectionDeltas,
  onScrollToSection,
}: ScoresGridProps) {
  return (
    <div className="scores-grid">
      {sectionRegistry
        .filter((entry) => entry.showMiniScore && result[entry.key])
        .map((entry, index) => (
          <MiniScore
            key={entry.key}
            score={result[entry.key].score}
            label={entry.label}
            icon={entry.icon}
            delta={sectionDeltas?.[entry.key]}
            onClick={() => onScrollToSection(entry.key)}
            animationDelay={index * 0.05}
          />
        ))}
    </div>
  );
}
