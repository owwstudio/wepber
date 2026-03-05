import React, { useState } from "react";
import { Code2, CheckCircle2, XCircle, ChevronDown, ChevronRight, Database } from "lucide-react";
import IssuesList from "@/components/ui/IssuesList";
import CopyButton from "@/components/ui/CopyButton";

/* eslint-disable @typescript-eslint/no-explicit-any */

const SCHEMA_TYPE_ICONS: Record<string, string> = {
    Article: "📰",
    Product: "🛒",
    FAQPage: "❓",
    LocalBusiness: "🏢",
    Organization: "🏛️",
    WebSite: "🌐",
    BreadcrumbList: "🔗",
    Review: "⭐",
    Event: "📅",
    Person: "👤",
    Unknown: "🔩",
};

function SchemaCard({ schema }: { schema: any }) {
    const [expanded, setExpanded] = useState(false);
    const icon = SCHEMA_TYPE_ICONS[schema.type] || "🔩";

    return (
        <div className={`sd-schema-card ${schema.valid ? "sd-schema-card--valid" : "sd-schema-card--invalid"}`}>
            <div className="sd-schema-card__header" onClick={() => setExpanded(!expanded)} style={{ cursor: "pointer" }}>
                <div className="sd-schema-card__title">
                    <span className="sd-schema-card__emoji">{icon}</span>
                    <span className="sd-schema-card__type">{schema.type}</span>
                    {schema.source && (
                        <span className="badge badge-info badge--xs">{schema.source}</span>
                    )}
                    {schema.valid
                        ? <CheckCircle2 size={14} style={{ color: "var(--success)" }} />
                        : <XCircle size={14} style={{ color: "var(--danger)" }} />
                    }
                    {!schema.valid && (
                        <span className="badge badge-danger badge--xs">{schema.issues.length} issue(s)</span>
                    )}
                </div>
                {expanded
                    ? <ChevronDown size={14} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
                    : <ChevronRight size={14} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
                }
            </div>

            {expanded && (
                <div className="sd-schema-card__body">
                    {schema.issues.length > 0 && (
                        <div className="sd-issues">
                            {schema.issues.map((issue: string, i: number) => (
                                <div key={i} className="sd-issue-item">
                                    <XCircle size={12} style={{ color: "var(--danger)", flexShrink: 0 }} />
                                    <span>{issue}</span>
                                </div>
                            ))}
                        </div>
                    )}
                    <div className="sd-raw-label" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <Code2 size={12} style={{ color: "var(--text-muted)" }} />
                        Raw {schema.source || "JSON-LD"} (truncated)
                        {schema.raw && <CopyButton text={schema.raw} />}
                    </div>
                    <pre className="sd-raw-json">{schema.raw}</pre>
                </div>
            )}
        </div>
    );
}

export default function StructuredDataSection({ data }: { data: any }) {
    const validCount = data.schemas.filter((s: any) => s.valid).length;
    const invalidCount = data.schemas.filter((s: any) => !s.valid).length;

    // Group by type
    const byType: Record<string, unknown[]> = {};
    for (const schema of data.schemas) {
        if (!byType[schema.type]) byType[schema.type] = [];
        byType[schema.type].push(schema);
    }

    return (
        <div>
            {/* Overview badges */}
            <div className="stats-badges" style={{ marginBottom: 16 }}>
                <span className="badge badge-info">
                    <Database size={11} />
                    {data.totalFound} Schema(s) Found
                </span>
                {validCount > 0 && (
                    <span className="badge badge-success">
                        <CheckCircle2 size={11} />
                        {validCount} Valid
                    </span>
                )}
                {invalidCount > 0 && (
                    <span className="badge badge-danger">
                        <XCircle size={11} />
                        {invalidCount} With Issues
                    </span>
                )}
            </div>

            {data.totalFound === 0 ? (
                <div className="sd-empty">
                    <Code2 size={32} style={{ color: "var(--text-muted)", marginBottom: 8 }} />
                    <p style={{ color: "var(--text-muted)", margin: 0 }}>No structured data found (JSON-LD, Microdata, or RDFa)</p>
                    <p className="sd-empty__hint">
                        Add structured data to help Google understand your content and unlock rich results in search.
                        Common types: Article, Product, FAQPage, BreadcrumbList, Organization.
                    </p>
                </div>
            ) : (
                <div className="sd-list">
                    {/* Type summary pills */}
                    <div className="sd-type-summary">
                        {Object.keys(byType).map(type => (
                            <span key={type} className="badge badge-info" style={{ fontSize: 12 }}>
                                {SCHEMA_TYPE_ICONS[type] || "🔩"} {type} ×{(byType[type] as unknown[]).length}
                            </span>
                        ))}
                    </div>
                    {/* Individual schema cards */}
                    {data.schemas.map((schema: any, i: number) => (
                        <SchemaCard key={i} schema={schema} />
                    ))}
                </div>
            )}

            {/* Testing tool link */}
            <div className="sd-testing-link">
                <Code2 size={12} style={{ color: "var(--accent-primary)" }} />
                <a
                    href="https://search.google.com/test/rich-results"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: "var(--accent-primary)", textDecoration: "none", fontSize: 12 }}
                >
                    Test with Google Rich Results Tool →
                </a>
            </div>

            <IssuesList issues={data.issues} />
        </div>
    );
}
