"use client";

import { motion } from "framer-motion";

export default function SectionSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="sections-grid">
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          className="glass-card section-skeleton"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
        >
          <div className="section-skeleton__header">
            <div className="skeleton section-skeleton__icon" />
            <div className="skeleton section-skeleton__title" />
            <div className="skeleton section-skeleton__badge" />
          </div>
          <div className="section-skeleton__body">
            <div className="skeleton section-skeleton__line section-skeleton__line--long" />
            <div className="skeleton section-skeleton__line section-skeleton__line--medium" />
            <div className="skeleton section-skeleton__line section-skeleton__line--short" />
          </div>
        </motion.div>
      ))}
    </div>
  );
}
