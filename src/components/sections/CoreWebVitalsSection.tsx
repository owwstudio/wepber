import React from "react";
import { Zap, CheckCircle2, AlertTriangle, XCircle, Info } from "lucide-react";
import IssuesList from "@/components/ui/IssuesList";

/* eslint-disable @typescript-eslint/no-explicit-any */

const THRESHOLDS = {
    lcp: { good: 2500, poor: 4000, unit: "ms", label: "Largest Contentful Paint", desc: "Time until the largest visible element loads. Target: < 2.5s" },
    cls: { good: 0.1, poor: 0.25, unit: "", label: "Cumulative Layout Shift", desc: "Visual stability score — how much elements shift. Target: < 0.1" },
    tbt: { good: 200, poor: 600, unit: "ms", label: "Total Blocking Time", desc: "Time blocked from responding to user input. Target: < 200ms" },
};

type Rating = "Good" | "Needs Improvement" | "Poor" | "Unknown" | "Critical";

const RATING_COLOR: Record<string, string> = {
    Good: "var(--success)",
    "Needs Improvement": "var(--warning)",
    Poor: "var(--danger)",
    Critical: "var(--danger)",
    Unknown: "var(--text-muted)",
};

const RATING_BG: Record<string, string> = {
    Good: "rgba(34,197,94,0.08)",
    "Needs Improvement": "rgba(245,158,11,0.08)",
    Poor: "rgba(239,68,68,0.08)",
    Critical: "rgba(239,68,68,0.08)",
    Unknown: "rgba(255,255,255,0.03)",
};

function RatingIcon({ rating }: { rating: string }) {
    if (rating === "Good") return <CheckCircle2 size={16} style={{ color: RATING_COLOR[rating] }} />;
    if (rating === "Unknown") return <Info size={16} style={{ color: RATING_COLOR[rating] }} />;
    if (rating === "Poor" || rating === "Critical") return <XCircle size={16} style={{ color: RATING_COLOR[rating] }} />;
    return <AlertTriangle size={16} style={{ color: RATING_COLOR[rating] }} />;
}

function MetricBar({ value, good, poor, isInverted = false }: { value: number; good: number; poor: number; isInverted?: boolean }) {
    // Fill from 0 to max (3× threshold), clamped at 100%
    const max = poor * 3;
    const pct = Math.min(100, (value / max) * 100);
    const color = value <= good ? "var(--success)" : value <= poor ? "var(--warning)" : "var(--danger)";
    return (
        <div className="cwv-bar-track">
            <div className="cwv-bar-fill" style={{ width: `${pct}%`, background: color }} />
            <div className="cwv-bar-marker cwv-bar-marker--good" style={{ left: `${(good / max) * 100}%` }} title={`Good: ${good}`} />
            <div className="cwv-bar-marker cwv-bar-marker--poor" style={{ left: `${(poor / max) * 100}%` }} title={`Poor: ${poor}`} />
        </div>
    );
}

function MetricCard({ label, desc, value, rating, unit, good, poor }: {
    label: string; desc: string; value: number | null; rating: string; unit: string; good: number; poor: number;
}) {
    const rounded = value === null ? null : Math.round(value * 1000) / 1000;
    const displayValue = rounded === null ? "—" : unit === "ms"
        ? rounded >= 1000 ? `${(rounded / 1000).toFixed(2)}s` : `${Math.round(rounded)}ms`
        : rounded.toFixed(3);

    return (
        <div className="cwv-metric-card" style={{ background: RATING_BG[rating], borderColor: `${RATING_COLOR[rating]}30` }}>
            <div className="cwv-metric-card__header">
                <RatingIcon rating={rating} />
                <span className="cwv-metric-card__label">{label}</span>
                <span className="cwv-metric-card__rating" style={{ color: RATING_COLOR[rating] }}>{rating}</span>
            </div>
            <div className="cwv-metric-card__value" style={{ color: RATING_COLOR[rating] }}>{displayValue}</div>
            {value !== null && unit === "ms" && (
                <MetricBar value={value} good={good} poor={poor} />
            )}
            {value !== null && unit === "" && (
                <MetricBar value={value * 1000} good={good * 1000} poor={poor * 1000} />
            )}
            <p className="cwv-metric-card__desc">{desc}</p>
        </div>
    );
}

export default function CoreWebVitalsSection({ data }: { data: any }) {
    return (
        <div>
            {/* Overview */}
            <div className="stats-badges" style={{ marginBottom: 16 }}>
                <span className={`badge ${data.score >= 90 ? "badge-success" : data.score >= 60 ? "badge-warning" : "badge-danger"}`}>
                    <Zap size={11} />
                    CWV Score: {data.score}
                </span>
                <span className="badge badge-info">
                    <Info size={11} />
                    Measured via PerformanceObserver
                </span>
            </div>

            {/* Metric Cards */}
            <div className="cwv-grid">
                <MetricCard
                    label={THRESHOLDS.lcp.label}
                    desc={THRESHOLDS.lcp.desc}
                    value={data.lcp.value}
                    rating={data.lcp.rating}
                    unit={THRESHOLDS.lcp.unit}
                    good={THRESHOLDS.lcp.good}
                    poor={THRESHOLDS.lcp.poor}
                />
                <MetricCard
                    label={THRESHOLDS.cls.label}
                    desc={THRESHOLDS.cls.desc}
                    value={data.cls.value}
                    rating={data.cls.rating}
                    unit={THRESHOLDS.cls.unit}
                    good={THRESHOLDS.cls.good}
                    poor={THRESHOLDS.cls.poor}
                />
                <MetricCard
                    label={THRESHOLDS.tbt.label}
                    desc={THRESHOLDS.tbt.desc}
                    value={data.tbt.value}
                    rating={data.tbt.rating}
                    unit={THRESHOLDS.tbt.unit}
                    good={THRESHOLDS.tbt.good}
                    poor={THRESHOLDS.tbt.poor}
                />
            </div>

            {/* Weight note */}
            <p className="cwv-weight-note">
                Score weighted: LCP 50% · CLS 30% · TBT 20%. Measured with Lighthouse simulated conditions (4x CPU slowdown, Fast 3G network) for accuracy.
            </p>

            <IssuesList issues={data.issues} />
        </div>
    );
}
