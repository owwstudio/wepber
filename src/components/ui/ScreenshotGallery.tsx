import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, Eye, AlertTriangle, X } from "lucide-react";

export default function ScreenshotGallery({ screenshots }: { screenshots: { label: string; image: string }[] }) {
    const [lightbox, setLightbox] = useState<string | null>(null);

    if (!screenshots || screenshots.length === 0) return null;

    return (
        <div className="screenshot-gallery">
            <div className="screenshot-gallery__header">
                <Camera size={14} /> Screenshots — Element yang bermasalah
            </div>
            <div className="screenshot-gallery__grid">
                {screenshots.map((ss, i) => (
                    <motion.div
                        key={i}
                        className="glass-card screenshot-card"
                        whileHover={{ scale: 1.02 }}
                        onClick={() => setLightbox(ss.image)}
                    >
                        <div className="screenshot-card__image-wrapper">
                            <img
                                src={ss.image}
                                alt={ss.label}
                                className="screenshot-card__image"
                            />
                            <div className="screenshot-card__overlay">
                                <Eye size={12} /> Klik untuk memperbesar
                            </div>
                        </div>
                        <div className="screenshot-card__footer">
                            <AlertTriangle size={12} style={{ color: "var(--warning)", flexShrink: 0 }} />
                            {ss.label}
                        </div>
                    </motion.div>
                ))}
            </div>

            <AnimatePresence>
                {lightbox && (
                    <motion.div
                        className="lightbox-modal"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setLightbox(null)}
                    >
                        <button
                            className="lightbox-modal__close"
                            onClick={() => setLightbox(null)}
                        >
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
