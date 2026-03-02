import React, { useState } from "react";
import { CheckCircle2, XCircle, AlertTriangle, Bot, Map, ChevronDown, ChevronRight, FileText } from "lucide-react";
import IssuesList from "@/components/ui/IssuesList";

/* eslint-disable @typescript-eslint/no-explicit-any */

export default function RobotsSection({ data }: { data: any }) {
    const [showContent, setShowContent] = useState(false);

    return (
        <div>
            {/* Overview badges */}
            <div className="stats-badges" style={{ marginBottom: 16 }}>
                <span className={`badge ${data.exists ? "badge-success" : "badge-danger"}`}>
                    <FileText size={11} />
                    {data.exists ? "robots.txt Found" : "robots.txt Missing"}
                </span>
                <span className={`badge ${data.googleBotAllowed ? "badge-success" : "badge-danger"}`}>
                    <Bot size={11} />
                    Googlebot: {data.googleBotAllowed ? "Allowed" : "Blocked"}
                </span>
                {data.isBlockingPage && (
                    <span className="badge badge-danger">
                        <XCircle size={11} />
                        Page Blocked!
                    </span>
                )}
                {data.hasSitemapDirective && (
                    <span className="badge badge-success">
                        <Map size={11} />
                        Sitemap Declared
                    </span>
                )}
            </div>

            {/* Checklist */}
            <div className="robots-checklist">
                <div className="robots-check-row">
                    {data.exists
                        ? <CheckCircle2 size={15} style={{ color: "var(--success)" }} />
                        : <XCircle size={15} style={{ color: "var(--danger)" }} />}
                    <div className="robots-check-row__content">
                        <span className="robots-check-row__label">robots.txt exists</span>
                        {!data.exists && (
                            <span className="robots-check-row__note">
                                Create a robots.txt at your domain root to control crawler access.
                            </span>
                        )}
                    </div>
                </div>

                <div className="robots-check-row">
                    {!data.isBlockingPage
                        ? <CheckCircle2 size={15} style={{ color: "var(--success)" }} />
                        : <XCircle size={15} style={{ color: "var(--danger)" }} />}
                    <div className="robots-check-row__content">
                        <span className="robots-check-row__label">
                            {data.isBlockingPage ? "Page is blocked by robots.txt" : "Page is accessible to crawlers"}
                        </span>
                        {data.blockedByRule && (
                            <code className="robots-check-row__rule">{data.blockedByRule}</code>
                        )}
                    </div>
                </div>

                <div className="robots-check-row">
                    {data.googleBotAllowed
                        ? <CheckCircle2 size={15} style={{ color: "var(--success)" }} />
                        : <XCircle size={15} style={{ color: "var(--danger)" }} />}
                    <div className="robots-check-row__content">
                        <span className="robots-check-row__label">
                            Googlebot: {data.googleBotAllowed ? "allowed to crawl" : "explicitly blocked"}
                        </span>
                    </div>
                </div>

                <div className="robots-check-row">
                    {data.hasSitemapDirective
                        ? <CheckCircle2 size={15} style={{ color: "var(--success)" }} />
                        : <AlertTriangle size={15} style={{ color: "var(--warning)" }} />}
                    <div className="robots-check-row__content">
                        <span className="robots-check-row__label">
                            Sitemap directive: {data.hasSitemapDirective ? "present" : "not declared"}
                        </span>
                        {data.sitemapUrl && (
                            <a
                                href={data.sitemapUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="robots-check-row__url"
                            >
                                {data.sitemapUrl}
                            </a>
                        )}
                        {!data.hasSitemapDirective && (
                            <span className="robots-check-row__note">
                                Add <code>Sitemap: https://yoursite.com/sitemap.xml</code> to help search engines discover all your pages.
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Raw robots.txt content toggle */}
            {data.content && (
                <div className="robots-raw">
                    <button className="robots-raw__toggle" onClick={() => setShowContent(!showContent)}>
                        {showContent ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        <FileText size={14} />
                        View robots.txt content
                    </button>
                    {showContent && (
                        <pre className="robots-raw__content">{data.content}</pre>
                    )}
                </div>
            )}

            <IssuesList issues={data.issues} />
        </div>
    );
}
