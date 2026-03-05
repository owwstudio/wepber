import React from "react";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown } from "lucide-react";
import { getScoreClass, getScoreColor } from "@/utils/score";

/* eslint-disable @typescript-eslint/no-explicit-any */

export default function MiniScore({
    score,
    label,
    icon: Icon,
    delta,
    onClick,
    animationDelay = 0,
}: {
    score: number;
    label: string;
    icon: any;
    delta?: number | null;
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
                <div className="mini-score__value-row">
                    <div className={`mini-score__value score-${cls}`}>
                        {score}
                    </div>
                    {delta !== undefined && delta !== null && delta !== 0 && (
                        <span
                            className={`mini-score__delta ${delta > 0 ? "mini-score__delta--positive" : "mini-score__delta--negative"}`}
                        >
                            {delta > 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                            {delta > 0 ? "+" : ""}
                            {delta}
                        </span>
                    )}
                </div>
            </div>
        </motion.div>
    );
}
