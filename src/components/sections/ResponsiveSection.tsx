import React from "react";
import { CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import IssuesList from "@/components/ui/IssuesList";

/* eslint-disable @typescript-eslint/no-explicit-any */

export default function ResponsiveSection({ data }: { data: any }) {

    return (
        <div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
                {/* Mobile Preview */}
                {data.mobileScreenshot && (
                    <div className="responsive-preview">
                        <div className="responsive-preview__notch" />
                        <div style={{ position: "relative", width: "100%", height: "100%" }}>
                            <img src={data.mobileScreenshot} alt="Mobile Preview" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }} />
                            {/* Draw bounding boxes for tap target issues */}
                            {data.tapTargets?.elements?.map((el: any, i: number) => {
                                // The screenshot is 390x844 in puppeteer. We need to scale the boxes to percentages.
                                const left = (el.x / 390) * 100;
                                const top = (el.y / 844) * 100;
                                const width = (el.width / 390) * 100;
                                const height = (el.height / 844) * 100;

                                // Only show if it's within the first viewport (roughly y < 844)
                                if (el.y > 844) return null;

                                return (
                                    <div key={i} style={{
                                        position: "absolute",
                                        left: `${left}%`,
                                        top: `${top}%`,
                                        width: `${width}%`,
                                        height: `${height}%`,
                                        border: "2px solid var(--danger)",
                                        background: "rgba(239,68,68,0.2)",
                                        borderRadius: Math.max(2, Math.min(el.width, el.height) * 0.1),
                                        zIndex: 20
                                    }} title={el.html} />
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Metrics Grid */}
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <div className="responsive-metric" style={{ border: `1px solid ${data.hasViewportMeta ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)"}` }}>
                        <div className="responsive-metric__title">Viewport Meta Tag</div>
                        <div className="responsive-metric__status" style={{ color: data.hasViewportMeta ? "var(--success)" : "var(--danger)" }}>
                            {data.hasViewportMeta ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                            {data.hasViewportMeta ? "Present and valid" : "Missing or invalid"}
                        </div>
                    </div>

                    <div className="responsive-metric" style={{ border: `1px solid ${!data.horizontalScrollMobile ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)"}` }}>
                        <div className="responsive-metric__title">Horizontal Layout Overflow</div>
                        <div className="responsive-metric__status" style={{ color: !data.horizontalScrollMobile ? "var(--success)" : "var(--danger)" }}>
                            {!data.horizontalScrollMobile ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                            {!data.horizontalScrollMobile ? "Fits mobile width perfectly" : "Content overflows horizontally"}
                        </div>
                    </div>

                    <div className="responsive-metric" style={{ border: `1px solid ${data.tapTargets.issues === 0 ? "rgba(34,197,94,0.3)" : "rgba(245,158,11,0.3)"}` }}>
                        <div className="responsive-metric__title">Tap Targets</div>
                        <div className="responsive-metric__status" style={{ color: data.tapTargets.issues === 0 ? "var(--success)" : "var(--warning)" }}>
                            {data.tapTargets.issues === 0 ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
                            {data.tapTargets.issues === 0 ? "All interactive elements are well-sized" : `${data.tapTargets.issues} elements are too small (< 44px)`}
                        </div>
                    </div>

                    <div className="responsive-metric" style={{ border: `1px solid ${data.elementConsistency.hiddenOnMobile < data.elementConsistency.desktopVisible * 0.2 ? "rgba(34,197,94,0.3)" : "rgba(245,158,11,0.3)"}` }}>
                        <div className="responsive-metric__title">Element Consistency</div>
                        <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>
                            Desktop: {data.elementConsistency.desktopVisible} main elements<br />
                            Mobile: {data.elementConsistency.mobileVisible} main elements
                        </div>
                        <div style={{ fontSize: 12, color: data.elementConsistency.hiddenOnMobile === 0 ? "var(--success)" : "var(--warning)" }}>
                            {data.elementConsistency.hiddenOnMobile === 0 ? "Perfect consistency" : `${data.elementConsistency.hiddenOnMobile} elements hidden on mobile`}
                        </div>
                    </div>
                </div>
            </div>

            {/* Tap Target Details List */}
            {data.tapTargets?.elements?.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
                        <AlertTriangle size={14} style={{ color: "var(--warning)" }} />
                        Tap Target Issues ({data.tapTargets.issues})
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 12 }}>
                        The following elements are smaller than the recommended 44x44px touch target size.
                        Highlight boxes are shown on the mobile preview for elements visible in the first viewport.
                    </div>
                    <div style={{ display: "grid", gap: 6, maxHeight: 300, overflowY: "auto", paddingRight: 4 }}>
                        {data.tapTargets.elements.map((el: any, i: number) => (
                            <div key={i} style={{ padding: "10px 14px", borderRadius: 8, border: "1px solid var(--border-color)", background: "rgba(255,255,255,0.02)", fontSize: 12 }}>
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                                    <span className="badge badge-warning" style={{ fontSize: 10 }}>{el.width}x{el.height}px</span>
                                    <span style={{ fontSize: 10, color: "var(--text-muted)" }}>Position: {el.x}, {el.y}</span>
                                </div>
                                <code style={{ display: "block", padding: 8, borderRadius: 6, background: "rgba(0,0,0,0.3)", color: "var(--text-primary)", fontSize: 11, wordBreak: "break-all" }}>
                                    {el.html}
                                </code>
                            </div>
                        ))}
                        {data.tapTargets.issues > 20 && (
                            <div style={{ fontSize: 11, color: "var(--text-muted)", textAlign: "center", fontStyle: "italic", marginTop: 8 }}>
                                + {data.tapTargets.issues - 20} more interactive elements are too small.
                            </div>
                        )}
                    </div>
                </div>
            )}

            <IssuesList issues={data.issues} />
        </div>
    );
}
