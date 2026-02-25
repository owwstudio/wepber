import React, { useState, useEffect, forwardRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronUp } from "lucide-react";
import { getScoreColor } from "@/utils/score";

/* eslint-disable @typescript-eslint/no-explicit-any */

const CollapsibleSection = forwardRef<
    HTMLDivElement,
    {
        title: string;
        icon: any;
        score: number;
        children: React.ReactNode;
        defaultOpen?: boolean;
        open?: boolean;
        onOpenChange?: (open: boolean) => void;
    }
>(function CollapsibleSection(
    { title, icon: Icon, score, children, defaultOpen = false, open: openProp, onOpenChange },
    ref
) {
    const [openInternal, setOpenInternal] = useState(defaultOpen);

    const isControlled = openProp !== undefined;
    const open = isControlled ? openProp : openInternal;

    // Sync internal state when controlled prop changes
    useEffect(() => {
        if (isControlled) setOpenInternal(openProp!);
    }, [isControlled, openProp]);

    const toggle = () => {
        const next = !open;
        if (!isControlled) setOpenInternal(next);
        onOpenChange?.(next);
    };

    return (
        <motion.div
            ref={ref}
            className="glass-card collapsible-section"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
        >
            <button
                onClick={toggle}
                className="collapsible-section__header"
            >
                <Icon size={20} style={{ color: score >= 0 ? getScoreColor(score) : "#3b82f6" }} />
                <span className="collapsible-section__title">{title}</span>
                {score >= 0 && (
                    <span
                        className={`badge badge-${score >= 75 ? "success" : score >= 50 ? "warning" : "danger"}`}
                    >
                        {score}/100
                    </span>
                )}
                {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>
            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="collapsible-section__content-wrapper"
                    >
                        <div className="collapsible-section__content">
                            {children}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
});

export default CollapsibleSection;
