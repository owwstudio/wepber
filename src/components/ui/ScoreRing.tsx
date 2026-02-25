import React from "react";
import { motion } from "framer-motion";
import { getScoreColor, getScoreClass, getScoreLabel } from "@/utils/score";

export default function ScoreRing({ score, size = 140 }: { score: number; size?: number }) {
    const radius = (size - 16) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (score / 100) * circumference;
    const color = getScoreColor(score);

    return (
        <div className="score-ring" style={{ width: size, height: size }}>
            <svg width={size} height={size}>
                <circle className="ring-bg" cx={size / 2} cy={size / 2} r={radius} />
                <motion.circle
                    className="ring-fill"
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke={color}
                    strokeDasharray={circumference}
                    initial={{ strokeDashoffset: circumference }}
                    animate={{ strokeDashoffset: offset }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                />
            </svg>
            <div className="score-text">
                <motion.div
                    className={`score-number score-${getScoreClass(score)}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                >
                    {score}
                </motion.div>
                <div className="score-label">{getScoreLabel(score)}</div>
            </div>
        </div>
    );
}
