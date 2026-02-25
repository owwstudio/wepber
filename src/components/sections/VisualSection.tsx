import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, XCircle, ChevronUp, ChevronDown, Type, Palette } from "lucide-react";
import IssuesList from "@/components/ui/IssuesList";

/* eslint-disable @typescript-eslint/no-explicit-any */

export default function VisualSection({ data }: { data: any }) {
    const [contrastExpanded, setContrastExpanded] = useState(false);
    const contrast = data.contrast;

    const ratingColor = (r: string) =>
        r === "AAA" ? "var(--success)" : r === "AA" ? "#3b82f6" : r === "A" ? "var(--warning)" : "var(--danger)";

    return (
        <div>
            {/* WCAG Contrast Gauge */}
            {contrast && (
                <div className="metrics-card">
                    <div className="metrics-card__header">
                        <Eye size={16} style={{ color: ratingColor(contrast.rating), flexShrink: 0 }} />
                        <span className="metrics-card__title">WCAG 2.1 Contrast Check</span>
                        <span
                            className="metrics-card__badge"
                            style={{
                                background: `${ratingColor(contrast.rating)}20`,
                                color: ratingColor(contrast.rating),
                            }}
                        >
                            {contrast.rating}
                        </span>
                        <span className="metrics-card__score">{contrast.score}</span>
                    </div>
                    <div className="metrics-card__progress-bg">
                        <div
                            className="metrics-card__progress-fill"
                            style={{
                                width: `${contrast.score}%`,
                                background:
                                    contrast.score >= 90
                                        ? "var(--success)"
                                        : contrast.score >= 70
                                            ? "#3b82f6"
                                            : contrast.score >= 50
                                                ? "var(--warning)"
                                                : "var(--danger)",
                            }}
                        />
                    </div>
                    <div className="metrics-card__details">
                        <span style={{ color: "var(--success)" }}>✓ {contrast.passAA} pass AA</span>
                        {contrast.failAA > 0 && <span style={{ color: "var(--danger)" }}>✗ {contrast.failAA} fail AA</span>}
                        <span style={{ color: "var(--text-muted)" }}>|</span>
                        <span style={{ color: "var(--success)" }}>✓ {contrast.passAAA} pass AAA</span>
                        {contrast.failAAA > 0 && <span style={{ color: "var(--warning)" }}>✗ {contrast.failAAA} fail AAA</span>}
                        <span style={{ color: "var(--text-muted)" }}>|</span>
                        <span style={{ color: "var(--text-muted)" }}>{contrast.totalChecked} checked</span>
                    </div>
                    <div className="metrics-card__note">
                        Standard: WCAG 2.1 — AA (4.5:1 normal text, 3:1 large text) / AAA (7:1 / 4.5:1)
                    </div>
                </div>
            )}

            {/* WCAG Contrast Failures */}
            {contrast?.failures.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                    <button
                        onClick={() => setContrastExpanded(!contrastExpanded)}
                        className="btn-warning-trigger"
                    >
                        <XCircle size={16} style={{ color: "var(--danger)" }} />
                        <span style={{ flex: 1 }}>WCAG Contrast Failures ({contrast.failures.length})</span>
                        {contrastExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                    <AnimatePresence>
                        {contrastExpanded && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.25 }}
                                style={{ overflow: "hidden" }}
                            >
                                <div className="failures-list">
                                    {contrast.failures.map((f: any, i: number) => (
                                        <div key={i} className="failures-item">
                                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                                                <span style={{ fontWeight: 600, color: "var(--text-secondary)" }}>&lt;{f.element}&gt;</span>
                                                <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--text-muted)", fontStyle: "italic" }}>
                                                    &quot;{f.text}&quot;
                                                </span>
                                            </div>
                                            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                                                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                                    <span style={{ fontSize: 10, color: "var(--text-muted)" }}>FG:</span>
                                                    <div style={{ width: 20, height: 20, borderRadius: 4, background: f.fg, border: "1px solid rgba(255,255,255,0.15)" }} />
                                                </div>
                                                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                                    <span style={{ fontSize: 10, color: "var(--text-muted)" }}>BG:</span>
                                                    <div style={{ width: 20, height: 20, borderRadius: 4, background: f.bg, border: "1px solid rgba(255,255,255,0.15)" }} />
                                                </div>
                                                <span className="badge badge-danger" style={{ fontSize: 10 }}>{f.ratio}:1</span>
                                                <span style={{ fontSize: 10, color: "var(--text-muted)" }}>(needs {f.required}:1)</span>
                                                <div style={{ padding: "2px 8px", borderRadius: 4, background: f.bg, color: f.fg, fontSize: 11, fontWeight: 600, border: "1px solid rgba(255,255,255,0.1)" }}>Aa</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            )}

            {/* Font Families */}
            <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 6 }}>
                    <Type size={14} /> Font Families ({data.fonts.length})
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {data.fonts.map((font: string, i: number) => (
                        <span key={i} className="font-tag" style={{ fontFamily: font }}>{font}</span>
                    ))}
                </div>
            </div>

            {/* Colors */}
            <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 6 }}>
                    <Palette size={14} /> Text Colors ({data.colors.length})
                </div>
                <div className="color-swatch-list">
                    {data.colors.slice(0, 20).map((color: string, i: number) => (
                        <div key={i} className="color-swatch" style={{ background: color }} title={color} />
                    ))}
                </div>
            </div>

            <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, color: "var(--text-muted)" }}>
                    Background Colors ({data.backgroundColors.length})
                </div>
                <div className="color-swatch-list">
                    {data.backgroundColors.slice(0, 20).map((color: string, i: number) => (
                        <div key={i} className="color-swatch" style={{ background: color }} title={color} />
                    ))}
                </div>
            </div>

            <IssuesList issues={data.issues} />
        </div>
    );
}
