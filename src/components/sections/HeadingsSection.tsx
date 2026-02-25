import React from "react";
import IssuesList from "@/components/ui/IssuesList";

/* eslint-disable @typescript-eslint/no-explicit-any */

export default function HeadingsSection({ data }: { data: any }) {
    const tagColors: Record<string, string> = {
        h1: "#6366f1",
        h2: "#8b5cf6",
        h3: "#a78bfa",
        h4: "#c4b5fd",
        h5: "#ddd6fe",
        h6: "#ede9fe",
    };
    return (
        <div>
            <div className="headings-section__badges">
                <span className="badge badge-info">H1: {data.h1Count}</span>
                {Object.entries(
                    data.structure.reduce((acc: any, h: any) => {
                        acc[h.tag] = (acc[h.tag] || 0) + 1;
                        return acc;
                    }, {})
                ).map(([tag, count]: any) => (
                    <span key={tag} className="badge" style={{ borderColor: tagColors[tag], color: tagColors[tag] }}>
                        {tag.toUpperCase()}: {count}
                    </span>
                ))}
            </div>

            {data.structure.length > 0 && (
                <div className="glass-card" style={{ padding: 12, marginBottom: 16 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginBottom: 8, paddingLeft: 4 }}>
                        Heading Tree
                    </div>
                    <div className="headings-section__tree">
                        {data.structure.map((h: any, i: number) => (
                            <div key={i} className="heading-tree-item" style={{ marginLeft: (h.level - 1) * 20 }}>
                                <span className="heading-tag" style={{ background: `${tagColors[h.tag]}22`, color: tagColors[h.tag] }}>
                                    {h.tag}
                                </span>
                                <span style={{ color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                    {h.text}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <IssuesList issues={data.issues} />
        </div>
    );
}
