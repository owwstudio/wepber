import React, { useState } from "react";
import { Server, Cpu } from "lucide-react";

/* eslint-disable @typescript-eslint/no-explicit-any */

const CATEGORY_ORDER = [
    "Language",
    "JS Framework",
    "JS Library",
    "CSS Framework",
    "Icon Library",
    "CMS",
    "E-commerce",
    "Website Builder",
    "Analytics",
    "Animation Library",
    "UI Library",
    "UI Library / Builder",
    "Data Visualization",
    "3D / WebGL",
    "Payment",
    "Maps",
    "Security",
    "Customer Support",
    "Error Tracking",
    "HTTP Client",
    "JS Utility",
    "Fonts",
    "CDN",
];

const LANG_ICON: Record<string, string> = {
    "JavaScript": "🟨",
    "TypeScript": "🔷",
    "PHP": "🐘",
    "Python": "🐍",
    "Ruby": "💎",
    "Java": "☕",
    "Go": "🐹",
    "Rust": "🦀",
    "C# / ASP.NET": "🟣",
    "Node.js": "🟩",
    "HTML5": "🟧",
    "HTML 4": "🟧",
    "XHTML": "🟧",
    "CSS": "🎨",
    "Sass / SCSS": "🌸",
    "Swift": "🍊",
    "Kotlin": "🟪",
};

const CONFIDENCE_LABEL: Record<string, string> = {
    high: "Detected",
    medium: "Likely",
    low: "Possible",
};
const CONFIDENCE_CLASS: Record<string, string> = {
    high: "badge-success",
    medium: "badge-info",
    low: "badge-warning",
};

export default function TechStackSection({ data }: { data: any }) {
    const [activeCategory, setActiveCategory] = useState<string>("All");

    if (!data) return null;

    const detected: any[] = data.detected || [];

    // Group by category
    const categories = ["All", ...CATEGORY_ORDER.filter((c) =>
        detected.some((t) => t.category === c)
    )];

    // Also add any unlisted categories
    detected.forEach((t) => {
        if (!categories.includes(t.category)) categories.push(t.category);
    });

    const filtered = activeCategory === "All"
        ? detected
        : detected.filter((t) => t.category === activeCategory);

    const { server, poweredBy } = data.serverInfo || {};

    return (
        <div className="tech-stack">
            {/* Server info */}
            {(server || poweredBy) && (
                <div className="tech-stack__server-row">
                    <Server size={13} className="tech-stack__server-icon" />
                    {server && <span className="tech-stack__server-badge">{server}</span>}
                    {poweredBy && <span className="tech-stack__server-badge">{poweredBy}</span>}
                </div>
            )}

            {detected.length === 0 ? (
                <div className="tech-stack__empty">
                    <Cpu size={32} className="tech-stack__empty-icon" />
                    <p>No technologies detected</p>
                </div>
            ) : (
                <>
                    {/* Category filter tabs */}
                    {categories.length > 2 && (
                        <div className="tech-stack__tabs">
                            {categories.map((cat) => (
                                <button
                                    key={cat}
                                    className={`tech-stack__tab${activeCategory === cat ? " tech-stack__tab--active" : ""}`}
                                    onClick={() => setActiveCategory(cat)}
                                >
                                    {cat}
                                    {cat === "All" && (
                                        <span className="tech-stack__tab-count">{detected.length}</span>
                                    )}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Tech cards grid */}
                    <div className="tech-stack__grid">
                        {filtered.map((tech: any, i: number) => (
                            <div key={i} className="tech-card">
                                <div className="tech-card__icon">
                                    {tech.category === "Language" ? (LANG_ICON[tech.name] ?? "🗣️") : tech.icon}
                                </div>
                                <div className="tech-card__body">
                                    <div className="tech-card__name">
                                        {tech.name}
                                        {tech.version && (
                                            <span className="tech-card__version">v{tech.version}</span>
                                        )}
                                    </div>
                                    <div className="tech-card__meta">
                                        <span className="tech-card__category">{tech.category}</span>
                                        <span className={`badge ${CONFIDENCE_CLASS[tech.confidence] || "badge-info"} badge--xs`}>
                                            {CONFIDENCE_LABEL[tech.confidence] || tech.confidence}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}
