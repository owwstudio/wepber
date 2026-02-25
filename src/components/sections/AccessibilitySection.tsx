import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ImageIcon, Eye, Link2, Gauge, FileText, ChevronUp, ChevronDown, X } from "lucide-react";
import IssuesList from "@/components/ui/IssuesList";

/* eslint-disable @typescript-eslint/no-explicit-any */

export default function AccessibilitySection({ data }: { data: any }) {
    const [expanded, setExpanded] = useState<string | null>(null);
    const [loadCounts, setLoadCounts] = useState<Record<string, number>>({});
    const [lightbox, setLightbox] = useState<string | null>(null);

    const getLoadCount = (key: string) => loadCounts[key] || 10;

    const categories = [
        {
            key: "imagesNoAlt",
            label: "Images without alt text",
            count: data.imagesWithoutAlt,
            icon: ImageIcon,
            color: "#f97316",
            items: data.details?.imagesNoAlt || [],
            renderItem: (item: any, i: number) => (
                <div key={i} className="a11y-item">
                    <div className="a11y-item__row">
                        <ImageIcon size={14} className="a11y-item__icon" />
                        <span className="a11y-item__src">{item.src || "(no src)"}</span>
                        <span className="a11y-item__dims">{item.width}×{item.height}</span>
                    </div>
                    {item.screenshot && (
                        <div
                            className="a11y-item__screenshot-wrap"
                            onClick={(e) => { e.stopPropagation(); setLightbox(item.screenshot); }}
                        >
                            <img src={item.screenshot} alt="Element location" className="a11y-item__screenshot" />
                            <div className="a11y-item__zoom-hint">
                                <Eye size={10} /> Klik untuk memperbesar
                            </div>
                        </div>
                    )}
                </div>
            ),
        },
        {
            key: "linksNoText",
            label: "Links without descriptive text",
            count: data.linksWithoutText,
            icon: Link2,
            color: "#a855f7",
            items: data.details?.linksNoText || [],
            renderItem: (item: any, i: number) => (
                <div key={i} className="a11y-item">
                    <div className="a11y-item__row a11y-item__row--col">
                        <div className="a11y-item__row a11y-item__row--nested">
                            <Link2 size={14} className="a11y-item__icon" />
                            <span className="a11y-item__href">{item.href || "(no href)"}</span>
                        </div>
                        <code className="a11y-item__code">{item.html}</code>
                    </div>
                    {item.screenshot && (
                        <img src={item.screenshot} alt="Element location" className="a11y-item__screenshot" />
                    )}
                </div>
            ),
        },
        {
            key: "buttonsNoLabel",
            label: "Buttons without labels",
            count: data.buttonsWithoutLabels,
            icon: Gauge,
            color: "#eab308",
            items: data.details?.buttonsNoLabel || [],
            renderItem: (item: any, i: number) => (
                <div key={i} className="a11y-item">
                    <div className="a11y-item__row a11y-item__row--col">
                        <div className="a11y-item__row a11y-item__row--nested">
                            <Gauge size={14} className="a11y-item__icon" />
                            <span className="badge badge-warning badge--xs">&lt;{item.tag}&gt;</span>
                        </div>
                        <code className="a11y-item__code">{item.html}</code>
                    </div>
                    {item.screenshot && (
                        <img src={item.screenshot} alt="Element location" className="a11y-item__screenshot" />
                    )}
                </div>
            ),
        },
        {
            key: "inputsNoLabel",
            label: "Form inputs without labels",
            count: data.inputsWithoutLabels,
            icon: FileText,
            color: "#ec4899",
            items: data.details?.inputsNoLabel || [],
            renderItem: (item: any, i: number) => (
                <div key={i} className="a11y-item">
                    <div className="a11y-item__row a11y-item__row--wrap">
                        <FileText size={14} className="a11y-item__icon" />
                        <span className="badge badge-info badge--xs">&lt;{item.tag}&gt;</span>
                        {item.type && <span className="a11y-item__attr">type=&quot;{item.type}&quot;</span>}
                        {item.name && <span className="a11y-item__attr--secondary">name=&quot;{item.name}&quot;</span>}
                        {item.id && <span className="a11y-item__attr--accent">id=&quot;{item.id}&quot;</span>}
                    </div>
                    {item.screenshot && (
                        <img src={item.screenshot} alt="Element location" className="a11y-item__screenshot" />
                    )}
                </div>
            ),
        },
    ];

    return (
        <div>
            <div className="a11y-header">
                <span className="badge badge-info">ARIA Elements: {data.ariaUsage}</span>
            </div>

            {/* Accordion List */}
            <div className="a11y-accordion">
                {categories.map((cat) => {
                    const isOpen = expanded === cat.key;
                    const visibleItems = cat.items.slice(0, getLoadCount(cat.key));
                    const hasMore = getLoadCount(cat.key) < cat.items.length;

                    return (
                        <motion.div
                            key={cat.key}
                            className={`a11y-accordion__item${isOpen ? " a11y-accordion__item--open" : ""}`}
                            style={{ "--cat-color": cat.color } as React.CSSProperties}
                        >
                            {/* Accordion Header */}
                            <button
                                className="a11y-accordion__trigger"
                                onClick={() => setExpanded(isOpen ? null : cat.key)}
                                disabled={cat.count === 0}
                            >
                                <cat.icon size={16} className={cat.count > 0 ? "a11y-accordion__trigger-icon" : "a11y-accordion__trigger-icon--ok"} />
                                <span className="a11y-accordion__trigger-label">{cat.label}</span>
                                <span className={`badge ${cat.count > 0 ? "badge-warning" : "badge-success"}`}>
                                    {cat.count}
                                </span>
                                {cat.count > 0 && (
                                    isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                                )}
                            </button>

                            {/* Accordion Body */}
                            <AnimatePresence>
                                {isOpen && cat.count > 0 && (
                                    <motion.div
                                        className="a11y-accordion__body"
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: "auto", opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.25 }}
                                    >
                                        <div className="a11y-accordion__body-inner">
                                            {visibleItems.map((item: any, i: number) => cat.renderItem(item, i))}

                                            {/* Load More */}
                                            {hasMore && (
                                                <button
                                                    className="btn-load-more"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setLoadCounts((prev) => ({ ...prev, [cat.key]: (prev[cat.key] || 10) + 10 }));
                                                    }}
                                                >
                                                    Load More ({cat.items.length - getLoadCount(cat.key)} remaining)
                                                </button>
                                            )}

                                            <div className="list-summary">
                                                Menampilkan {visibleItems.length} dari {cat.items.length} item
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    );
                })}
            </div>

            <IssuesList issues={data.issues} />

            {/* Lightbox Modal */}
            <AnimatePresence>
                {lightbox && (
                    <motion.div
                        className="lightbox-modal"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setLightbox(null)}
                    >
                        <button className="lightbox-modal__close" onClick={() => setLightbox(null)}>
                            <X size={24} />
                        </button>
                        <motion.img
                            className="lightbox-modal__image"
                            initial={{ scale: 0.9 }}
                            animate={{ scale: 1 }}
                            src={lightbox}
                            alt="Screenshot detail"
                        />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
