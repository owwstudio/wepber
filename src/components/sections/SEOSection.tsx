import React from "react";
import IssuesList from "@/components/ui/IssuesList";

/* eslint-disable @typescript-eslint/no-explicit-any */

export default function SEOSection({ data }: { data: any }) {
    return (
        <div>
            <div className="seo-section__grid">
                <div className="seo-section__item">
                    <span className="seo-section__label">Title</span>
                    <span className="seo-section__value">
                        {data.title.value || <span style={{ color: "var(--danger)" }}>Missing</span>}
                        <span className={`badge badge-${data.title.status === "good" ? "success" : "warning"}`} style={{ marginLeft: 8 }}>
                            {data.title.length} chars
                        </span>
                    </span>
                </div>
                <div className="seo-section__item">
                    <span className="seo-section__label">Meta Description</span>
                    <span className="seo-section__value">
                        {data.metaDescription.value
                            ? data.metaDescription.value.substring(0, 80) + (data.metaDescription.value.length > 80 ? "..." : "")
                            : <span style={{ color: "var(--danger)" }}>Missing</span>}
                        <span className={`badge badge-${data.metaDescription.status === "good" ? "success" : "warning"}`} style={{ marginLeft: 8 }}>
                            {data.metaDescription.length} chars
                        </span>
                    </span>
                </div>
                {[
                    { label: "Canonical", value: data.canonical },
                    { label: "Language", value: data.language },
                    { label: "Viewport", value: data.viewport ? "✓ Set" : null },
                    { label: "Favicon", value: data.favicon ? "✓ Set" : null },
                    { label: "Robots", value: data.robots },
                ].map((item, i) => (
                    <div key={i} className="seo-section__item">
                        <span className="seo-section__label">{item.label}</span>
                        <span className="seo-section__value" style={{ color: item.value ? "var(--text-secondary)" : "var(--danger)" }}>
                            {item.value || "Missing"}
                        </span>
                    </div>
                ))}
            </div>
            {Object.keys(data.ogTags).length > 0 && (
                <div className="seo-section__og-tags">
                    <div className="seo-section__og-title">Open Graph Tags</div>
                    {Object.entries(data.ogTags).map(([key, val]) => (
                        <div key={key} className="seo-section__og-item">
                            <span className="seo-section__og-key">{key}</span>: {val as string}
                        </div>
                    ))}
                </div>
            )}
            <IssuesList issues={data.issues} />
        </div>
    );
}
