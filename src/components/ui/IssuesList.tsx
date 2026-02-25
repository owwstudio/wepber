import React from "react";
import { CheckCircle2, AlertTriangle } from "lucide-react";

export default function IssuesList({ issues }: { issues: string[] }) {
    if (!issues || issues.length === 0)
        return (
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--success)", fontSize: 13, padding: "8px 0" }}>
                <CheckCircle2 size={16} /> No issues found
            </div>
        );
    return (
        <div>
            {issues.map((issue, i) => (
                <div className="issue-item" key={i}>
                    <AlertTriangle size={14} style={{ color: "var(--warning)", flexShrink: 0, marginTop: 1 }} />
                    {issue}
                </div>
            ))}
        </div>
    );
}
