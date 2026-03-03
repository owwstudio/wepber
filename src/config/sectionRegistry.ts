/**
 * Data-driven section registry — maps each section key to its display
 * metadata, icon, React component, and scoring behaviour.
 *
 * Adding or removing a section from the results page requires ONLY
 * editing this registry. No hardcoded JSX blocks needed in page.tsx.
 *
 * @see agent.md §9  — Dynamic Component Configuration
 * @see agent.md §15 — Modular Architecture & Component Decomposition
 */
import type { ComponentType } from "react";
import type { LucideIcon } from "lucide-react";
import type { SectionKey } from "@/types/scan";

import {
  FileText,
  Heading,
  Image as ImageIcon,
  Link2,
  Palette,
  Zap,
  Accessibility,
  Smartphone,
  ShieldCheck,
  Network,
  Bug,
  Map,
} from "lucide-react";

import SEOSection from "@/components/sections/SEOSection";
import HeadingsSection from "@/components/sections/HeadingsSection";
import ImagesSection from "@/components/sections/ImagesSection";
import LinksSection from "@/components/sections/LinksSection";
import VisualSection from "@/components/sections/VisualSection";
import PerformanceSection from "@/components/sections/PerformanceSection";
import AccessibilitySection from "@/components/sections/AccessibilitySection";
import ResponsiveSection from "@/components/sections/ResponsiveSection";
import SecuritySection from "@/components/sections/SecuritySection";
import CoreWebVitalsSection from "@/components/sections/CoreWebVitalsSection";
import StructuredDataSection from "@/components/sections/StructuredDataSection";
import RobotsSection from "@/components/sections/RobotsSection";
import SitemapSection from "@/components/sections/SitemapSection";

export interface SectionRegistryEntry {
  /** Unique key matching the API response property. */
  key: SectionKey;
  /** Human-readable title shown in the CollapsibleSection header. */
  title: string;
  /** Short label shown in the MiniScore card (e.g. "SEO", "Links"). */
  label: string;
  /** Lucide icon component. */
  icon: LucideIcon;
  /** The detail component rendered inside the collapsible body. */
  /* eslint-disable @typescript-eslint/no-explicit-any */
  component: ComponentType<{ data: any; onScanUrl?: (u: string) => void }>;
  /** Whether to render a MiniScore card in the scores grid. */
  showMiniScore: boolean;
  /**
   * Static score override. Use -1 for sections that do not have a
   * numeric score (e.g. Robots, Sitemap).
   */
  scoreOverride?: number;
  /**
   * Optional dynamic title builder. Receives the section data and
   * returns a string to replace the static `title`.
   */
  /* eslint-disable @typescript-eslint/no-explicit-any */
  dynamicTitle?: (data: any) => string;
  /**
   * Whether this section receives `onScanUrl` callback (e.g. Sitemap).
   */
  receivesOnScanUrl?: boolean;
}

export const sectionRegistry: SectionRegistryEntry[] = [
  {
    key: "seo",
    title: "SEO Meta Tags",
    label: "SEO",
    icon: FileText,
    component: SEOSection,
    showMiniScore: true,
  },
  {
    key: "headings",
    title: "Heading Structure",
    label: "Headings",
    icon: Heading,
    component: HeadingsSection,
    showMiniScore: true,
  },
  {
    key: "images",
    title: "Image Audit",
    label: "Images",
    icon: ImageIcon,
    component: ImagesSection,
    showMiniScore: true,
  },
  {
    key: "links",
    title: "Links & Buttons",
    label: "Links",
    icon: Link2,
    component: LinksSection,
    showMiniScore: true,
  },
  {
    key: "visual",
    title: "Visual Consistency",
    label: "Visual",
    icon: Palette,
    component: VisualSection,
    showMiniScore: true,
  },
  {
    key: "performance",
    title: "Performance",
    label: "Performance",
    icon: Zap,
    component: PerformanceSection,
    showMiniScore: true,
  },
  {
    key: "accessibility",
    title: "Accessibility",
    label: "Accessibility",
    icon: Accessibility,
    component: AccessibilitySection,
    showMiniScore: true,
  },
  {
    key: "responsive",
    title: "Responsive Test",
    label: "Responsive",
    icon: Smartphone,
    component: ResponsiveSection,
    showMiniScore: true,
  },
  {
    key: "security",
    title: "Security Standards",
    label: "Security",
    icon: ShieldCheck,
    component: SecuritySection,
    showMiniScore: true,
  },
  {
    key: "coreWebVitals",
    title: "Core Web Vitals",
    label: "Core Web Vitals",
    icon: Zap,
    component: CoreWebVitalsSection,
    showMiniScore: true,
  },
  {
    key: "structuredData",
    title: "Structured Data",
    label: "Structured Data",
    icon: Network,
    component: StructuredDataSection,
    showMiniScore: true,
  },
  {
    key: "robots",
    title: "Robots.txt",
    label: "Robots",
    icon: Bug,
    component: RobotsSection,
    showMiniScore: false,
    scoreOverride: -1,
  },
  {
    key: "sitemap",
    title: "Sitemap",
    label: "Sitemap",
    icon: Map,
    component: SitemapSection,
    showMiniScore: false,
    scoreOverride: -1,
    dynamicTitle: (data) => `Sitemap (${data?.urls?.length || 0} URLs)`,
    receivesOnScanUrl: true,
  },
];
