import React, { useState } from "react";
import { Globe } from "lucide-react";

/* eslint-disable @typescript-eslint/no-explicit-any */

export default function SitemapSection({ data, onScanUrl }: { data: any; onScanUrl: (url: string) => void }) {
    const [visibleCount, setVisibleCount] = useState(20);
    const [filter, setFilter] = useState("");

    const filtered = data.urls.filter((u: any) =>
        u.loc.toLowerCase().includes(filter.toLowerCase())
    );
    const visible = filtered.slice(0, visibleCount);

    return (
        <div>
            {data.source && (
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 12, fontStyle: "italic" }}>
                    Source: <a href={data.source} target="_blank" rel="noopener noreferrer" style={{ color: "#3b82f6" }}>{data.source}</a>
                </div>
            )}

            {data.urls.length === 0 && !data.error && (
                <div style={{ fontSize: 13, color: "var(--text-muted)", padding: "20px 0", textAlign: "center" }}>
                    No sitemap found for this website
                </div>
            )}

            {data.error && (
                <div style={{ fontSize: 13, color: "var(--danger)", padding: "12px", borderRadius: 8, background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)" }}>
                    {data.error}
                </div>
            )}

            {data.urls.length > 0 && (
                <>
                    <div style={{ display: "flex", gap: 10, marginBottom: 12, alignItems: "center" }}>
                        <span className="badge badge-info">{data.urls.length} URLs</span>
                        <input
                            type="text"
                            placeholder="Filter URLs..."
                            value={filter}
                            onChange={(e) => { setFilter(e.target.value); setVisibleCount(20); }}
                            style={{
                                flex: 1, padding: "6px 12px", borderRadius: 8,
                                border: "1px solid var(--border-color)", background: "rgba(255,255,255,0.04)",
                                color: "var(--text-primary)", fontSize: 12, outline: "none",
                            }}
                        />
                    </div>

                    <div style={{ display: "grid", gap: 6 }}>
                        {visible.map((u: any, i: number) => {
                            const pathOnly = (() => { try { return new URL(u.loc).pathname; } catch { return u.loc; } })();
                            return (
                                <div key={i} className="sitemap-item" onClick={() => onScanUrl(u.loc)}>
                                    <Globe size={14} style={{ color: "#3b82f6", flexShrink: 0 }} />
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                            {pathOnly}
                                        </div>
                                        <div style={{ display: "flex", gap: 8, marginTop: 3, fontSize: 10, color: "var(--text-muted)" }}>
                                            {u.lastmod && <span>Modified: {new Date(u.lastmod).toLocaleDateString()}</span>}
                                            {u.changefreq && <span>• {u.changefreq}</span>}
                                            {u.priority && <span>• Priority: {u.priority}</span>}
                                        </div>
                                    </div>
                                    <div style={{
                                        padding: "4px 10px", borderRadius: 6, fontSize: 10, fontWeight: 600,
                                        background: "rgba(59,130,246,0.1)", color: "#3b82f6",
                                        whiteSpace: "nowrap", flexShrink: 0,
                                    }}>
                                        Scan →
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {visibleCount < filtered.length && (
                        <button
                            onClick={() => setVisibleCount((prev) => prev + 20)}
                            style={{
                                width: "100%", marginTop: 12, padding: "10px", borderRadius: 8,
                                border: "1px solid var(--border-color)", background: "rgba(255,255,255,0.03)",
                                color: "var(--text-secondary)", fontSize: 12, fontWeight: 600, cursor: "pointer",
                            }}
                        >
                            Load More ({filtered.length - visibleCount} remaining)
                        </button>
                    )}
                </>
            )}
        </div>
    );
}
