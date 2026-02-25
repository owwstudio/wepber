import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { XCircle, Gauge, ExternalLink, Link2, ChevronUp, ChevronDown } from "lucide-react";
import IssuesList from "@/components/ui/IssuesList";

/* eslint-disable @typescript-eslint/no-explicit-any */

export default function LinksSection({ data }: { data: any }) {
    const [activeTab, setActiveTab] = useState("all");
    const [visibleCount, setVisibleCount] = useState(10);
    const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

    const allItems = [
        ...(data.details?.internal || []).map((l: any) => ({ ...l, type: "internal" })),
        ...(data.details?.external || []).map((l: any) => ({ ...l, type: "external" })),
        ...data.deadLinks.map((l: any) => ({ href: l.url, text: "", type: "dead", status: l.status })),
        ...(data.details?.buttonsNoLabel || []).map((b: any) => ({ ...b, type: "button" })),
    ];

    const tabs = [
        { id: "all", label: "All", count: data.details ? (data.details.internal?.length || 0) + (data.details.external?.length || 0) : data.total },
        { id: "internal", label: "Internal", count: data.details?.internal?.length || data.internal },
        { id: "external", label: "External", count: data.details?.external?.length || data.external },
        { id: "dead", label: "Dead Links", count: data.deadLinks.length },
        { id: "button", label: "Buttons No Label", count: data.buttonsWithoutLabels },
    ];

    const filtered = allItems.filter((item: any) => {
        if (activeTab === "all") return item.type === "internal" || item.type === "external";
        return item.type === activeTab;
    });

    const visible = filtered.slice(0, visibleCount);
    const hasMore = visibleCount < filtered.length;

    return (
        <div>
            {/* Stats */}
            <div className="stats-badges">
                <span className="badge badge-info">Total: {data.total}</span>
                <span className="badge badge-success">Internal: {data.internal}</span>
                <span className="badge badge-info">External: {data.external}</span>
                <span className={`badge ${data.deadLinks.length > 0 ? "badge-danger" : "badge-success"}`}>Dead: {data.deadLinks.length}</span>
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

            {/* Items List */}
            {visible.length > 0 ? (
                <div className="list-container">
                    {visible.map((item: any, i: number) => {
                        const isExpanded = expandedIdx === i;
                        const isButton = item.type === "button";
                        const isDead = item.type === "dead";
                        return (
                            <motion.div
                                key={i}
                                layout
                                className={`list-card ${isExpanded ? "list-card--expanded" : ""} ${isDead ? "list-card--error" : ""}`}
                            >
                                {/* Row summary */}
                                <div className="list-card__header" onClick={() => setExpandedIdx(isExpanded ? null : i)}>
                                    <div className="list-card__icon">
                                        {isDead ? (
                                            <XCircle size={16} style={{ color: "var(--danger)" }} />
                                        ) : isButton ? (
                                            <Gauge size={16} style={{ color: "#eab308" }} />
                                        ) : item.type === "external" ? (
                                            <ExternalLink size={16} style={{ color: "var(--accent-primary)" }} />
                                        ) : (
                                            <Link2 size={16} style={{ color: "var(--success)" }} />
                                        )}
                                    </div>
                                    <div className="list-card__title">
                                        {isButton ? `<${item.tag}>` : (item.href || "—")}
                                    </div>
                                    <div className="list-card__badges">
                                        {item.type === "internal" && <span className="badge badge-success" style={{ fontSize: 10 }}>Internal</span>}
                                        {item.type === "external" && <span className="badge badge-info" style={{ fontSize: 10 }}>External</span>}
                                        {isDead && <span className="badge badge-danger" style={{ fontSize: 10 }}>HTTP {item.status}</span>}
                                        {isButton && <span className="badge badge-warning" style={{ fontSize: 10 }}>No Label</span>}
                                    </div>
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
                                                {!isButton && (
                                                    <>
                                                        <div className="list-card__detail-row">
                                                            <span className="list-card__detail-label">URL:</span>
                                                            <span className="list-card__detail-value list-card__detail-value--accent">{item.href}</span>
                                                        </div>
                                                        {item.text && (
                                                            <div className="list-card__detail-row">
                                                                <span className="list-card__detail-label">Text:</span>
                                                                <span className="list-card__detail-value">{item.text}</span>
                                                            </div>
                                                        )}
                                                        <div className="list-card__detail-row">
                                                            <span className="list-card__detail-label">Type:</span>
                                                            <span className="list-card__detail-value" style={{ color: item.type === "internal" ? "var(--success)" : item.type === "dead" ? "var(--danger)" : "var(--accent-primary)", fontWeight: 600 }}>
                                                                {item.type === "internal" ? "Internal Link" : item.type === "dead" ? `Dead Link (HTTP ${item.status})` : "External Link"}
                                                            </span>
                                                        </div>
                                                    </>
                                                )}
                                                {isButton && (
                                                    <>
                                                        <div className="list-card__detail-row">
                                                            <span className="list-card__detail-label">Tag:</span>
                                                            <span className="badge badge-warning" style={{ fontSize: 10 }}>&lt;{item.tag}&gt;</span>
                                                        </div>
                                                        <div style={{ fontSize: 12 }}>
                                                            <span style={{ color: "var(--text-muted)" }}>HTML:</span>
                                                            <code style={{ fontSize: 10, color: "var(--text-muted)", wordBreak: "break-all", background: "rgba(0,0,0,0.2)", padding: "2px 6px", borderRadius: 4, display: "block", marginTop: 4 }}>
                                                                {item.html}
                                                            </code>
                                                        </div>
                                                    </>
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

                    <div className="list-summary">
                        Menampilkan {visible.length} dari {filtered.length} item
                    </div>
                </div>
            ) : (
                <div style={{ textAlign: "center", padding: "20px 0", color: "var(--text-muted)", fontSize: 13 }}>
                    Tidak ada item pada tab ini
                </div>
            )}

            <IssuesList issues={data.issues} />
        </div>
    );
}
