"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import MiniScore from "@/components/ui/MiniScore";
import { sectionRegistry } from "@/config/sectionRegistry";
import type { SectionKey } from "@/types/scan";

interface ScoresGridProps {
  result: any;
  onScrollToSection: (key: SectionKey) => void;
}

/**
 * Mini scores grid — data-driven via sectionRegistry.
 *
 * Iterates registered sections that have `showMiniScore: true` and
 * exist in the result payload.
 *
 * @see agent.md §9 — Dynamic Component Configuration
 */
export default function ScoresGrid({
  result,
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
            onClick={() => onScrollToSection(entry.key)}
            animationDelay={index * 0.05}
          />
        ))}
    </div>
  );
}
