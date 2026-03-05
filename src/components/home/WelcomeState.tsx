"use client";

import { motion } from "framer-motion";
import { Search, Shield, Zap, Image, BarChart3, FileText } from "lucide-react";

const FEATURES = [
  { icon: FileText, label: "SEO Meta Tags" },
  { icon: Zap, label: "Performance" },
  { icon: Shield, label: "Security Headers" },
  { icon: Image, label: "Image Audit" },
  { icon: BarChart3, label: "Core Web Vitals" },
  { icon: Search, label: "Accessibility" },
];

const EXAMPLE_URLS = ["stripe.com", "github.com", "vercel.com"];

interface WelcomeStateProps {
  onScanUrl: (url: string) => void;
}

export default function WelcomeState({ onScanUrl }: WelcomeStateProps) {
  return (
    <motion.div
      className="welcome-state"
      initial={false}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
    >
      <div className="welcome-state__features">
        {FEATURES.map((f, i) => (
          <motion.div
            key={f.label}
            className="welcome-state__feature"
            initial={false}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 + i * 0.05 }}
          >
            <f.icon size={14} className="welcome-state__feature-icon" />
            {f.label}
          </motion.div>
        ))}
      </div>

      <p className="welcome-state__title">
        Enter a URL above to analyze any website
      </p>
      <p className="welcome-state__subtitle">
        COAXA checks SEO, performance, accessibility, security, and more
      </p>

      <div className="welcome-state__examples">
        <span className="welcome-state__example-label">Try:</span>
        {EXAMPLE_URLS.map((u) => (
          <button
            key={u}
            className="welcome-state__example-btn"
            onClick={() => onScanUrl(u)}
          >
            {u}
          </button>
        ))}
      </div>
    </motion.div>
  );
}
