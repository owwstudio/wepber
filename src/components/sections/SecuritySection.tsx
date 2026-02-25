import React from "react";
import { ShieldCheck, ShieldAlert, ShieldX, CheckCircle2, XCircle, AlertTriangle, Lock, Globe, Cookie, Code2, ExternalLink } from "lucide-react";
import IssuesList from "@/components/ui/IssuesList";

/* eslint-disable @typescript-eslint/no-explicit-any */

const PRIORITY_COLOR: Record<string, string> = {
    Critical: "var(--danger)",
    High: "#f97316",
    Medium: "var(--warning)",
    Low: "#3b82f6",
};

function HeaderRow({ label, present, value }: { label: string; present: boolean; value: string | null }) {
    return (
        <div className="sec-header-row">
            <div className="sec-header-row__left">
                {present
                    ? <CheckCircle2 size={14} className="sec-header-row__icon sec-header-row__icon--ok" />
                    : <XCircle size={14} className="sec-header-row__icon sec-header-row__icon--fail" />
                }
                <span className="sec-header-row__label">{label}</span>
            </div>
            {present && value ? (
                <code className="sec-header-row__value">{value}</code>
            ) : (
                <span className="sec-header-row__missing">Not set</span>
            )}
        </div>
    );
}

export default function SecuritySection({ data }: { data: any }) {
    const headers = data.headers;

    const shieldIcon = data.score >= 80
        ? <ShieldCheck size={20} style={{ color: "var(--success)" }} />
        : data.score >= 50
            ? <ShieldAlert size={20} style={{ color: "var(--warning)" }} />
            : <ShieldX size={20} style={{ color: "var(--danger)" }} />;

    return (
        <div>
            {/* Overview badges */}
            <div className="stats-badges">
                <span className={`badge ${data.isHttps ? "badge-success" : "badge-danger"}`}>
                    <Lock size={11} />
                    {data.isHttps ? "HTTPS ✓" : "HTTP (insecure)"}
                </span>
                <span className="badge badge-info">
                    <Globe size={11} />
                    {Object.values(headers).filter((h: any) => h.present).length}/6 Security Headers
                </span>
                {data.mixedContent.count > 0 && (
                    <span className="badge badge-warning">
                        <AlertTriangle size={11} />
                        {data.mixedContent.count} Mixed Content
                    </span>
                )}
                {data.cookieIssues.length > 0 && (
                    <span className="badge badge-warning">
                        <Cookie size={11} />
                        {data.cookieIssues.length} Cookie Issue(s)
                    </span>
                )}
            </div>

            {/* Security Headers table */}
            <div className="sec-section">
                <div className="sec-section__title">
                    {shieldIcon}
                    HTTP Security Headers
                </div>
                <div className="sec-headers-list">
                    <HeaderRow label="Strict-Transport-Security (HSTS)" present={headers.hsts.present} value={headers.hsts.value} />
                    <HeaderRow label="Content-Security-Policy (CSP)" present={headers.csp.present} value={headers.csp.value} />
                    <HeaderRow label="X-Frame-Options" present={headers.xFrameOptions.present} value={headers.xFrameOptions.value} />
                    <HeaderRow label="X-Content-Type-Options" present={headers.xContentTypeOptions.present} value={headers.xContentTypeOptions.value} />
                    <HeaderRow label="Referrer-Policy" present={headers.referrerPolicy.present} value={headers.referrerPolicy.value} />
                    <HeaderRow label="Permissions-Policy" present={headers.permissionsPolicy.present} value={headers.permissionsPolicy.value} />
                </div>
            </div>

            {/* Mixed Content */}
            {data.mixedContent.count > 0 && (
                <div className="sec-section">
                    <div className="sec-section__title">
                        <AlertTriangle size={16} style={{ color: "var(--warning)" }} />
                        Mixed Content ({data.mixedContent.count})
                    </div>
                    <div className="sec-mixed-list">
                        {data.mixedContent.items.map((url: string, i: number) => (
                            <div key={i} className="sec-mixed-item">
                                <ExternalLink size={12} style={{ color: "var(--warning)", flexShrink: 0 }} />
                                <span className="sec-mixed-item__url">{url}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Cookies */}
            {data.cookieIssues.length > 0 && (
                <div className="sec-section">
                    <div className="sec-section__title">
                        <Cookie size={16} style={{ color: "var(--warning)" }} />
                        Cookie Issues ({data.cookieIssues.length})
                    </div>
                    <div className="sec-headers-list">
                        {data.cookieIssues.map((c: any, i: number) => (
                            <div key={i} className="sec-cookie-row">
                                <span className="sec-cookie-row__name">{c.name}</span>
                                <div className="sec-cookie-row__flags">
                                    {c.missingHttpOnly && <span className="badge badge-warning badge--xs">No HttpOnly</span>}
                                    {c.missingSecure && <span className="badge badge-danger badge--xs">No Secure</span>}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Inline Scripts */}
            {data.dangerousInlineScripts > 0 && (
                <div className="sec-section">
                    <div className="sec-section__title">
                        <Code2 size={16} style={{ color: "#a855f7" }} />
                        Inline Scripts
                    </div>
                    <p className="sec-inline-note">
                        <strong>{data.dangerousInlineScripts}</strong> inline script(s) or event handler attribute(s) detected.
                        These reduce CSP effectiveness and may indicate XSS risks. Consider moving to external files.
                    </p>
                </div>
            )}

            {/* Recommendations */}
            {data.recommendations?.length > 0 && (
                <div className="sec-section">
                    <div className="sec-section__title">
                        <AlertTriangle size={16} style={{ color: "var(--text-muted)" }} />
                        Recommendations ({data.recommendations.length})
                    </div>
                    <div className="sec-recs-list">
                        {data.recommendations.map((rec: any, i: number) => (
                            <div
                                key={i}
                                className="sec-rec-item"
                                style={{ borderColor: `${PRIORITY_COLOR[rec.priority]}30`, background: `${PRIORITY_COLOR[rec.priority]}08` }}
                            >
                                <div className="sec-rec-item__header">
                                    <span
                                        className="sec-rec-item__priority"
                                        style={{ background: `${PRIORITY_COLOR[rec.priority]}20`, color: PRIORITY_COLOR[rec.priority] }}
                                    >
                                        {rec.priority}
                                    </span>
                                    <span className="sec-rec-item__check">{rec.check}</span>
                                </div>
                                <div className="sec-rec-item__msg">{rec.message}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <IssuesList issues={data.issues} />
        </div>
    );
}
