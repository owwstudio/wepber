"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  Globe,
  Image as ImageIcon,
  XCircle,
  RotateCw,
  Search,
  Layers,
} from "lucide-react";

interface SearchFormProps {
  url: string;
  onUrlChange: (value: string) => void;
  loading: boolean;
  designImage: string | null;
  onImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClearImage: () => void;
  onScan: () => void;
}

/**
 * URL input + design file upload + animated Scan/Compare button.
 *
 * @see agent.md §8 — AnimatePresence mode="wait" for button swap
 */
export default function SearchForm({
  url,
  onUrlChange,
  loading,
  designImage,
  onImageUpload,
  onClearImage,
  onScan,
}: SearchFormProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="search-form"
    >
      <div className="search-form__row">
        <div className="search-form__input-wrap">
          <Globe size={18} className="search-form__icon" />
          <input
            name="url"
            className="glow-input search-form__input"
            placeholder="Enter website URL (e.g., example.com)"
            value={url}
            onChange={(e) => onUrlChange(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !loading && onScan()}
            disabled={loading}
          />
        </div>

        <div className="search-form__file-wrap">
          {designImage ? (
            <div className="search-form__file-ready">
              <ImageIcon size={18} color="var(--success)" />
              <span className="search-form__file-ready-text">
                Design Ready
              </span>
              <button
                onClick={onClearImage}
                className="search-form__file-clear"
              >
                <XCircle size={16} />
              </button>
            </div>
          ) : (
            <>
              <input
                type="file"
                id="design-file"
                accept="image/png, image/jpeg, image/webp"
                onChange={onImageUpload}
                className="search-form__file-input"
                disabled={loading}
              />
              <div className="glow-input search-form__input search-form__file-placeholder">
                <ImageIcon size={18} className="search-form__file-icon" />
              </div>
            </>
          )}
        </div>

        <button
          className="btn-primary"
          onClick={onScan}
          disabled={loading || !url.trim()}
        >
          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.2 }}
              >
                <RotateCw
                  size={18}
                  style={{ animation: "spin 1s linear infinite" }}
                />
              </motion.div>
            ) : designImage ? (
              <motion.span
                key="compare"
                className="search-form__btn-content"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <Layers size={18} /> Compare
              </motion.span>
            ) : (
              <motion.span
                key="scan"
                className="search-form__btn-content"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <Search size={18} /> Scan
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>
    </motion.div>
  );
}
