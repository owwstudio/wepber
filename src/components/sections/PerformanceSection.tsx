import React from "react";
import { Layers, ExternalLink, FileText, ImageIcon, Gauge, AlertTriangle } from "lucide-react";
import IssuesList from "@/components/ui/IssuesList";

/* eslint-disable @typescript-eslint/no-explicit-any */

export default function PerformanceSection({ data }: { data: any }) {
    const ratingColor = (r: string) =>
        r === "AAA" ? "var(--success)" : r === "AA" ? "#3b82f6" : r === "A" ? "var(--warning)" : "var(--danger)";

    const priorityColor = (p: string) =>
        p === "High" ? "var(--danger)" : p === "Medium" ? "var(--warning)" : "#3b82f6";

    const metrics = data.metrics;
    const dimensions = metrics ? [
        { key: "pageWeight", label: "Page Weight", icon: Layers, score: metrics.pageWeight.score, rating: metrics.pageWeight.rating, details: metrics.pageWeight.details },
        { key: "resourceCount", label: "HTTP Requests", icon: ExternalLink, score: metrics.resourceCount.score, rating: metrics.resourceCount.rating, details: metrics.resourceCount.details },
        { key: "domComplexity", label: "DOM Complexity", icon: FileText, score: metrics.domComplexity.score, rating: metrics.domComplexity.rating, details: metrics.domComplexity.details },
        { key: "imageOptimization", label: "Image Optimization", icon: ImageIcon, score: metrics.imageOptimization.score, rating: metrics.imageOptimization.rating, details: metrics.imageOptimization.details },
        { key: "loadSpeed", label: "Load Speed", icon: Gauge, score: metrics.caching.score, rating: metrics.caching.rating, details: metrics.caching.details },
    ] : [];

    return (
        <div>
            {/* Overview stats */}
            <div className="stats-badges">
                <span className="badge badge-info">Load: {(data.loadTime / 1000).toFixed(2)}s</span>
                <span className="badge badge-info">Requests: {data.totalResources}</span>
                {data.totalPageSize && <span className="badge badge-info">Size: {data.totalPageSize}</span>}
                {data.domElements && <span className="badge badge-info">DOM: {data.domElements} elements</span>}
            </div>

            {/* Sub-Score Cards */}
            {metrics && (
                <div style={{ display: "grid", gap: 10, marginBottom: 20 }}>
                    {dimensions.map((dim) => (
                        <div key={dim.key} className="metrics-card">
                            <div className="metrics-card__header">
                                <dim.icon size={16} style={{ color: ratingColor(dim.rating), flexShrink: 0 }} />
                                <span className="metrics-card__title">{dim.label}</span>
                                <span
                                    className="metrics-card__badge"
                                    style={{
                                        background: `${ratingColor(dim.rating)}20`,
                                        color: ratingColor(dim.rating),
                                    }}
                                >
                                    {dim.rating}
                                </span>
                                <span className="metrics-card__score">{dim.score}</span>
                            </div>
                            <div className="metrics-card__progress-bg">
                                <div
                                    className="metrics-card__progress-fill"
                                    style={{
                                        width: `${dim.score}%`,
                                        background:
                                            dim.score >= 90
                                                ? "var(--success)"
                                                : dim.score >= 70
                                                    ? "#3b82f6"
                                                    : dim.score >= 50
                                                        ? "var(--warning)"
                                                        : "var(--danger)",
                                    }}
                                />
                            </div>
                            <div style={{ display: "grid", gap: 3 }}>
                                {dim.details.map((d: string, j: number) => (
                                    <div key={j} style={{ fontSize: 11, color: d.startsWith("✓") ? "var(--success)" : "var(--text-muted)", lineHeight: 1.4 }}>
                                        {d}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Resource Breakdown Table */}
            {data.resourceBreakdown.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, color: "var(--text-muted)" }}>
                        Resource Breakdown
                    </div>
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Type</th>
                                <th>Count</th>
                                <th>Size</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.resourceBreakdown.map((r: any, i: number) => (
                                <tr key={i}>
                                    <td style={{ textTransform: "uppercase", fontWeight: 600, fontSize: 11, letterSpacing: 0.5 }}>{r.type}</td>
                                    <td>{r.count}</td>
                                    <td>{r.size}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Actionable Recommendations */}
            {data.recommendations?.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 6 }}>
                        <AlertTriangle size={14} /> Recommendations ({data.recommendations.length})
                    </div>
                    <div style={{ display: "grid", gap: 8 }}>
                        {data.recommendations.map((rec: any, i: number) => (
                            <div key={i} style={{
                                padding: "10px 14px", borderRadius: 8,
                                border: `1px solid ${priorityColor(rec.priority)}30`,
                                background: `${priorityColor(rec.priority)}08`,
                                fontSize: 12,
                            }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                                    <span style={{
                                        padding: "1px 8px", borderRadius: 4, fontSize: 10, fontWeight: 700,
                                        background: `${priorityColor(rec.priority)}20`, color: priorityColor(rec.priority),
                                        textTransform: "uppercase", letterSpacing: 0.5,
                                    }}>{rec.priority}</span>
                                    <span style={{ fontWeight: 600, color: "var(--text-secondary)" }}>{rec.category}</span>
                                </div>
                                <div style={{ color: "var(--text-muted)", lineHeight: 1.5 }}>{rec.message}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <IssuesList issues={data.issues} />
        </div>
    );
}
