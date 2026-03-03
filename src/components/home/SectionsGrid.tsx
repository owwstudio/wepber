"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import type { MutableRefObject } from "react";
import CollapsibleSection from "@/components/ui/CollapsibleSection";
import { sectionRegistry } from "@/config/sectionRegistry";
import type { SectionKey } from "@/types/scan";

interface SectionsGridProps {
  result: any;
  openSections: Record<SectionKey, boolean>;
  sectionRefs: MutableRefObject<Record<SectionKey, HTMLDivElement | null>>;
  onSectionOpenChange: (key: SectionKey, val: boolean) => void;
  onScanUrl: (u: string) => void;
}

/**
 * Detailed collapsible sections — data-driven via sectionRegistry.
 *
 * Replaces 13 hardcoded CollapsibleSection blocks with a single loop.
 * Adding a new section only requires updating `sectionRegistry.ts`.
 *
 * @see agent.md §9  — Dynamic Component Configuration
 * @see agent.md §15 — Modular Architecture & Component Decomposition
 */
export default function SectionsGrid({
  result,
  openSections,
  sectionRefs,
  onSectionOpenChange,
  onScanUrl,
}: SectionsGridProps) {
  return (
    <div className="sections-grid">
      {sectionRegistry.map((entry) => {
        const data = result[entry.key];
        if (!data) return null;

        const title = entry.dynamicTitle
          ? entry.dynamicTitle(data)
          : entry.title;

        const score =
          entry.scoreOverride !== undefined
            ? entry.scoreOverride
            : data.score;

        const Component = entry.component;

        return (
          <CollapsibleSection
            key={entry.key}
            ref={(el) => {
              sectionRefs.current[entry.key] = el;
            }}
            title={title}
            icon={entry.icon}
            score={score}
            open={openSections[entry.key]}
            onOpenChange={(v) => onSectionOpenChange(entry.key, v)}
          >
            <Component
              data={data}
              {...(entry.receivesOnScanUrl ? { onScanUrl } : {})}
            />
          </CollapsibleSection>
        );
      })}
    </div>
  );
}
