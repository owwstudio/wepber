import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, XCircle, ChevronUp, ChevronDown } from "lucide-react";
import IssuesList from "@/components/ui/IssuesList";

/* eslint-disable @typescript-eslint/no-explicit-any */

export default function ImagesSection({ data }: { data: any }) {
    const [activeTab, setActiveTab] = useState("all");
    const [visibleCount, setVisibleCount] = useState(10);
    const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

    const tabs = [
        { id: "all", label: "All", count: data.details.length },
        { id: "no-alt", label: "Without Alt", count: data.details.filter((i: any) => !i.hasAlt).length },
        { id: "broken", label: "Broken", count: data.details.filter((i: any) => i.status === "broken").length },
        { id: "lazy", label: "Lazy Loaded", count: data.details.filter((i: any) => i.loading === "lazy").length },
        { id: "ok", label: "OK", count: data.details.filter((i: any) => i.status === "ok" && i.hasAlt).length },
    ];

    const filtered = data.details.filter((img: any) => {
        if (activeTab === "all") return true;
        if (activeTab === "no-alt") return !img.hasAlt;
        if (activeTab === "broken") return img.status === "broken";
        if (activeTab === "lazy") return img.loading === "lazy";
        if (activeTab === "ok") return img.status === "ok" && img.hasAlt;
        return true;
    });

    const visible = filtered.slice(0, visibleCount);
    const hasMore = visibleCount < filtered.length;

    return (
        <div>
            {/* Stats Badges */}
            <div className="stats-badges">
                <span className="badge badge-info">Total: {data.total}</span>
                <span className="badge badge-success">With Alt: {data.withAlt}</span>
                <span className={`badge ${data.withoutAlt > 0 ? "badge-warning" : "badge-success"}`}>Without Alt: {data.withoutAlt}</span>
                <span className={`badge ${data.broken > 0 ? "badge-danger" : "badge-success"}`}>Broken: {data.broken}</span>
                <span className="badge badge-info">Lazy: {data.lazyLoaded}</span>
            </div>

            {/* Tabs */}
            <div className="tabs-container">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => { setActiveTab(tab.id); setVisibleCount(10); setExpandedIdx(null); }}
                        className={`tab-button ${activeTab === tab.id ? "tab-button--active" : ""}`}
                    >
                        {tab.label}
                        <span className="tab-button__count">{tab.count}</span>
                    </button>
                ))}
            </div>

            {/* Image List */}
            {visible.length > 0 ? (
                <div className="list-container">
                    {visible.map((img: any, i: number) => {
                        const globalIdx = data.details.indexOf(img);
                        const isExpanded = expandedIdx === globalIdx;
                        const isBroken = img.status === "broken";

                        return (
                            <motion.div
                                key={globalIdx}
                                layout
                                className={`list-card ${isExpanded ? "list-card--expanded" : ""} ${isBroken ? "list-card--error" : ""}`}
                            >
                                {/* Row summary */}
                                <div className="list-card__header" onClick={() => setExpandedIdx(isExpanded ? null : globalIdx)}>
                                    <div className="list-card__icon">
                                        {img.status === "ok" ? (
                                            <CheckCircle2 size={16} style={{ color: "var(--success)" }} />
                                        ) : (
                                            <XCircle size={16} style={{ color: "var(--danger)" }} />
                                        )}
                                    </div>
                                    <div className="list-card__title">
                                        {img.src || "—"}
                                    </div>
                                    <div className="list-card__badges">
                                        {!img.hasAlt && <span className="badge badge-warning" style={{ fontSize: 10 }}>No Alt</span>}
                                        {img.status === "broken" && <span className="badge badge-danger" style={{ fontSize: 10 }}>Broken</span>}
                                        {img.loading === "lazy" && <span className="badge badge-info" style={{ fontSize: 10 }}>Lazy</span>}
                                    </div>
                                    <span style={{ color: "var(--text-muted)", fontSize: 12, flexShrink: 0 }}>
                                        {img.width}×{img.height}
                                    </span>
                                    {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                </div>

                                {/* Expanded detail */}
                                <AnimatePresence>
                                    {isExpanded && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: "auto", opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{ duration: 0.2 }}
                                            style={{ overflow: "hidden" }}
                                        >
                                            <div className="list-card__detail">
                                                <div className="list-card__detail-row">
                                                    <span className="list-card__detail-label">Source:</span>
                                                    <span className="list-card__detail-value list-card__detail-value--accent">{img.src}</span>
                                                </div>
                                                <div className="list-card__detail-row">
                                                    <span className="list-card__detail-label">Alt Text:</span>
                                                    <span className="list-card__detail-value" style={{ color: img.alt ? "var(--text-secondary)" : "var(--warning)" }}>
                                                        {img.alt || "(tidak ada)"}
                                                    </span>
                                                </div>
                                                <div className="list-card__detail-row">
                                                    <span className="list-card__detail-label">Dimensions:</span>
                                                    <span className="list-card__detail-value">{img.width} × {img.height} px</span>
                                                </div>
                                                <div className="list-card__detail-row">
                                                    <span className="list-card__detail-label">Loading:</span>
                                                    <span className="list-card__detail-value">{img.loading}</span>
                                                </div>
                                                <div className="list-card__detail-row">
                                                    <span className="list-card__detail-label">Status:</span>
                                                    <span className="list-card__detail-value" style={{ color: img.status === "ok" ? "var(--success)" : "var(--danger)", fontWeight: 600 }}>
                                                        {img.status === "ok" ? "✓ Loaded" : "✗ Broken"}
                                                    </span>
                                                </div>
                                                {img.src && img.status === "ok" && (
                                                    <div style={{ marginTop: 4 }}>
                                                        <img
                                                            src={img.src}
                                                            alt={img.alt || "preview"}
                                                            style={{
                                                                maxWidth: 200,
                                                                maxHeight: 120,
                                                                borderRadius: 8,
                                                                border: "1px solid var(--border-color)",
                                                                objectFit: "contain",
                                                                background: "rgba(255,255,255,0.03)",
                                                            }}
                                                            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.div>
                        );
                    })}

                    {/* Load More */}
                    {hasMore && (
                        <button
                            onClick={(e) => { e.stopPropagation(); setVisibleCount((prev) => prev + 10); }}
                            className="btn-load-more"
                        >
                            Load More ({filtered.length - visibleCount} remaining)
                        </button>
                    )}

                    {/* Count info */}
                    <div className="list-summary">
                        Menampilkan {visible.length} dari {filtered.length} gambar
                    </div>
                </div>
            ) : (
                <div style={{ textAlign: "center", padding: "20px 0", color: "var(--text-muted)", fontSize: 13 }}>
                    Tidak ada gambar pada tab ini
                </div>
            )}

            <IssuesList issues={data.issues} />
        </div>
    );
}
