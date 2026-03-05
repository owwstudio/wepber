import React from "react";
import { motion } from "framer-motion";
import { getScoreClass, getScoreColor } from "@/utils/score";

/* eslint-disable @typescript-eslint/no-explicit-any */

export default function MiniScore({
    score,
    label,
    icon: Icon,
    onClick,
    animationDelay = 0,
}: {
    score: number;
    label: string;
    icon: any;
    onClick?: () => void;
    animationDelay?: number;
}) {
    const cls = getScoreClass(score);
    return (
        <motion.div
            className={`glass-card score-bg-${cls} mini-score${onClick ? " mini-score--clickable" : ""}`}
            initial={{ opacity: 0, y: 16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.35, delay: animationDelay, ease: "easeOut" }}
            whileHover={{ scale: 1.02 }}
            onClick={onClick}
            title={onClick ? `Scroll to ${label} section` : undefined}
        >
            <Icon size={28} style={{ color: getScoreColor(score) }} />
            <div className="mini-score__body">
                <div className="mini-score__label">{label}</div>
                <div className={`mini-score__value score-${cls}`}>
                    {score}
                </div>
            </div>
        </motion.div>
    );
}
