"use client";

import { useState, useRef, useCallback } from "react";
import { SECTION_KEYS, type SectionKey } from "@/types/scan";

/**
 * Custom hook for managing collapsible section open/close state,
 * refs for scroll-into-view, and navigation callbacks.
 */
export function useSections() {
  const [openSections, setOpenSections] = useState<
    Record<SectionKey, boolean>
  >(
    Object.fromEntries(SECTION_KEYS.map((k) => [k, false])) as Record<
      SectionKey,
      boolean
    >
  );

  const sectionRefs = useRef<Record<SectionKey, HTMLDivElement | null>>(
    Object.fromEntries(SECTION_KEYS.map((k) => [k, null])) as Record<
      SectionKey,
      HTMLDivElement | null
    >
  );

  const scrollToSection = useCallback((key: SectionKey) => {
    setOpenSections((prev) => ({ ...prev, [key]: true }));
    setTimeout(() => {
      sectionRefs.current[key]?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 50);
  }, []);

  const handleSectionOpenChange = useCallback(
    (key: SectionKey, val: boolean) => {
      setOpenSections((prev) => ({ ...prev, [key]: val }));
    },
    []
  );

  return {
    openSections,
    sectionRefs,
    scrollToSection,
    handleSectionOpenChange,
  };
}
