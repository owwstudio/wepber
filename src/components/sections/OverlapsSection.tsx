"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Layers, Type, ImageIcon, AlertTriangle, CheckCircle, ChevronDown, ChevronUp } from "lucide-react";
import IssuesList from "@/components/ui/IssuesList";

/* eslint-disable @typescript-eslint/no-explicit-any */

interface ClippedText { tag: string; text: string; overflowX: boolean; overflowY: boolean; }
interface ClippedImage { src: string; naturalW: number; naturalH: number; renderedW: number; renderedH: number; }
interface OverlapItem { tagA: string; tagB: string; textA: string; textB: string; overlapPct: number; ax: number; ay: number; aw: number; ah: number; bx: number; by: number; bw: number; bh: number; }

function ScoreGauge({ score }: { score: number }) {
    const color = score >= 90 ? "var(--success)" : score >= 70 ? "#3b82f6" : score >= 50 ? "var(--warning)" : "var(--danger)";
    const label = score >= 90 ? "Good" : score >= 70 ? "Fair" : score >= 50 ? "Poor" : "Critical";
    return (
        <div className="metrics-card">
            <div className="metrics-card__header">
                <Layers size={16} style={{ color, flexShrink: 0 }} />
                <span className="metrics-card__title">Layout Integrity Score</span>
                <span className="metrics-card__badge" style={{ background: `${color}20`, color }}>{label}</span>
                <span className="metrics-card__score">{score}</span>
            </div>
            <div className="metrics-card__progress-bg">
                <div className="metrics-card__progress-fill" style={{ width: `${score}%`, background: color }} />
            </div>
            <div className="metrics-card__note">
                Checks for clipped text, cropped images, and unintentional element overlaps.
            </div>
        </div>
    );
}

function ExpandableList<T>({
    items,
    icon: Icon,
    title,
    emptyLabel,
    renderItem,
}: {
    items: T[];
    icon: any;
    title: string;
    emptyLabel: string;
    renderItem: (item: T, i: number) => React.ReactNode;
}) {
    const [open, setOpen] = useState(false);
    if (items.length === 0) {
        return (
            <div className="metrics-card" style={{ marginBottom: 12 }}>
                <div className="metrics-card__header">
                    <CheckCircle size={15} style={{ color: "var(--success)", flexShrink: 0 }} />
                    <span className="metrics-card__title">{emptyLabel}</span>
                </div>
            </div>
        );
    }
    return (
        <div style={{ marginBottom: 16 }}>
            <button onClick={() => setOpen(!open)} className="btn-warning-trigger">
                <Icon size={15} style={{ color: items.length > 0 ? "var(--warning)" : "var(--success)", flexShrink: 0 }} />
                <span style={{ flex: 1 }}>{title} ({items.length})</span>
                {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        style={{ overflow: "hidden" }}
                    >
                        <div className="failures-list">
                            {items.map((item, i) => (
                                <div key={i} className="failures-item">
                                    {renderItem(item, i)}
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

export default function OverlapsSection({ data }: { data: any }) {
    const clippedTexts: ClippedText[] = data.clippedTexts || [];
    const clippedImages: ClippedImage[] = data.clippedImages || [];
    const overlaps: OverlapItem[] = data.overlappingElements || [];

    return (
        <div>
            <ScoreGauge score={data.score ?? 100} />

            {/* Clipped Text */}
            <ExpandableList<ClippedText>
                items={clippedTexts}
                icon={Type}
                title="Clipped / Truncated Text"
                emptyLabel="No clipped text detected"
                renderItem={(item, i) => (
                    <div key={i}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                            <span style={{ fontFamily: "monospace", fontSize: 12, color: "var(--text-muted)" }}>&lt;{item.tag}&gt;</span>
                            {item.overflowX && <span className="badge badge-warning" style={{ fontSize: 10 }}>overflow-x</span>}
                            {item.overflowY && <span className="badge badge-warning" style={{ fontSize: 10 }}>overflow-y</span>}
                        </div>
                        <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: 0, fontStyle: "italic", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            &ldquo;{item.text}&rdquo;
                        </p>
                    </div>
                )}
            />

            {/* Clipped Images */}
            <ExpandableList<ClippedImage>
                items={clippedImages}
                icon={ImageIcon}
                title="Significantly Cropped Images"
                emptyLabel="No cropped images detected"
                renderItem={(item, i) => (
                    <div key={i}>
                        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                            <span className="badge badge-danger" style={{ fontSize: 10 }}>
                                natural {item.naturalW}&times;{item.naturalH}
                            </span>
                            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>→</span>
                            <span className="badge badge-warning" style={{ fontSize: 10 }}>
                                rendered {item.renderedW}&times;{item.renderedH}
                            </span>
                        </div>
                        {item.src && (
                            <p style={{ fontSize: 11, color: "var(--text-muted)", margin: "4px 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {item.src.split("/").pop()}
                            </p>
                        )}
                    </div>
                )}
            />

            {/* Overlapping Elements */}
            <ExpandableList<OverlapItem>
                items={overlaps}
                icon={AlertTriangle}
                title="Element Collisions (Bounding Box)"
                emptyLabel="No element collisions detected"
                renderItem={(item, i) => (
                    <div key={i}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
                            <span style={{ fontFamily: "monospace", fontSize: 12, color: "var(--warning)" }}>&lt;{item.tagA}&gt;</span>
                            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>overlaps</span>
                            <span style={{ fontFamily: "monospace", fontSize: 12, color: "var(--danger)" }}>&lt;{item.tagB}&gt;</span>
                            <span className="badge badge-danger" style={{ fontSize: 10 }}>{item.overlapPct}% collision</span>
                        </div>
                        {item.textA && (
                            <p style={{ fontSize: 11, color: "var(--text-muted)", margin: "0 0 2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                A: &ldquo;{item.textA}&rdquo; @ ({item.ax}, {item.ay}) {item.aw}&times;{item.ah}px
                            </p>
                        )}
                        {item.textB && (
                            <p style={{ fontSize: 11, color: "var(--text-muted)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                B: &ldquo;{item.textB}&rdquo; @ ({item.bx}, {item.by}) {item.bw}&times;{item.bh}px
                            </p>
                        )}
                    </div>
                )}
            />


            <IssuesList issues={data.issues || []} />
        </div>
    );
}
