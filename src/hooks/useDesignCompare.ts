"use client";

import { useState, useCallback } from "react";
import type { ScanResult, ScanError } from "@/types/scan";
import { compareMessages } from "@/config/scanMessages";

/**
 * Dedicated hook for Design vs Website comparison mode.
 *
 * Reads the new SSE stream from `/api/compare` and progressively
 * exposes status messages while the comparison runs server-side.
 *
 * Intentionally separate from `useScan` to keep scan-only SSE
 * logic clean and to allow compare-specific error classification
 * (screenshot_failed, dimension_mismatch, navigation_timeout).
 *
 * @see agent.md §19 — NEVER mix compare into scan SSE reader
 * @see agent.md §23 — empty buffer guard (enforced server-side)
 */
export function useDesignCompare() {
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<ScanResult | null>(null);
    const [error, setError] = useState<ScanError | null>(null);
    const [streamStatus, setStreamStatus] = useState<string | null>(null);
    const [scanMsg, setScanMsg] = useState(0);
    const [elapsed, setElapsed] = useState(0);

    // Error code → ScanError type mapping
    function classifyCode(code: string | undefined): ScanError["type"] {
        switch (code) {
            case "navigation_timeout": return "navigation_timeout";
            case "screenshot_failed": return "screenshot_failed";
            case "dimension_mismatch": return "dimension_mismatch";
            case "invalid_image": return "invalid_image";
            default: return "unknown";
        }
    }

    const compare = useCallback(async (url: string, designImage: string) => {
        if (!url.trim() || !designImage) return;

        setLoading(true);
        setResult(null);
        setError(null);
        setScanMsg(0);
        setElapsed(0);
        setStreamStatus(null);

        // Rotate compare progress messages
        const msgInterval = setInterval(() => {
            setScanMsg((prev) => (prev + 1) % compareMessages.length);
        }, 3000);

        // Elapsed timer
        const elapsedInterval = setInterval(() => {
            setElapsed((prev) => prev + 1);
        }, 1000);

        // Client-side hard timeout: 120s
        const controller = new AbortController();
        const clientTimeout = setTimeout(() => controller.abort(), 120_000);

        try {
            const res = await fetch("/api/compare", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ url: url.trim(), designImage }),
                signal: controller.signal,
            });

            if (!res.ok) {
                const data = await res.json().catch(() => ({ error: "Comparison failed" }));
                setError({ type: "server", message: data.error || "Comparison failed." });
                return;
            }

            // ── SSE reader ──────────────────────────────────────────────────
            const reader = res.body!.getReader();
            const decoder = new TextDecoder();
            let buffer = "";

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const parts = buffer.split("\n\n");
                buffer = parts.pop() || "";

                for (const part of parts) {
                    const line = part.trim();
                    if (!line.startsWith("data: ")) continue;
                    try {
                        const event = JSON.parse(line.slice(6));

                        if (event.type === "status") {
                            setStreamStatus(event.message);
                        } else if (event.type === "result") {
                            // Extract the type/message fields from event, rest is the result
                            // eslint-disable-next-line @typescript-eslint/no-unused-vars
                            const { type: _t, ...resultData } = event;
                            setResult(resultData);
                        } else if (event.type === "error") {
                            throw Object.assign(new Error(event.message || "Comparison failed."), {
                                code: event.code,
                            });
                        }
                    } catch (parseErr) {
                        if (parseErr instanceof Error && (parseErr as any).code) {
                            throw parseErr; // structured API error — propagate
                        }
                        // Otherwise malformed SSE chunk — ignore
                    }
                }
            }

        } catch (err) {
            if (err instanceof Error && err.name === "AbortError") {
                setError({ type: "timeout", message: "Comparison timed out after 120 seconds." });
            } else if (err instanceof Error) {
                const code = (err as any).code;
                if (code) {
                    setError({ type: classifyCode(code), message: err.message });
                } else {
                    const isNetwork = err instanceof TypeError || err.message.includes("Failed to fetch");
                    setError({ type: isNetwork ? "network" : "unknown", message: err.message });
                }
            } else {
                setError({ type: "unknown", message: "Something went wrong." });
            }
        } finally {
            clearInterval(msgInterval);
            clearInterval(elapsedInterval);
            clearTimeout(clientTimeout);
            setLoading(false);
            setStreamStatus(null);
        }
    }, []);

    return {
        loading,
        result,
        error,
        streamStatus,
        scanMsg,
        elapsed,
        compare,
        clearResult: () => { setResult(null); setError(null); },
    };
}
