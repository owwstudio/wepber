"use client";

import { useState, useCallback } from "react";
import type { ScanResult, ScanError } from "@/types/scan";
import { activeScanMessages, compareMessages } from "@/config/scanMessages";

/**
 * Custom hook encapsulating all scan execution logic.
 *
 * Manages URL state, loading indicators, progress message rotation,
 * elapsed timer, and the AbortController-based client timeout.
 *
 * @param designImage – current design image data URL (or null).
 *   When non-null the hook hits `/api/compare`; otherwise `/api/scan`.
 */
export function useScan(designImage: string | null) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<ScanError | null>(null);
  const [scanMsg, setScanMsg] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  const handleScan = useCallback(
    async (scanUrl?: string) => {
      const targetUrl = scanUrl || url.trim();
      if (!targetUrl) return;
      if (scanUrl) setUrl(scanUrl);

      setLoading(true);
      setResult(null);
      setError(null);
      setScanMsg(0);
      setElapsed(0);

      // Rotate scan progress messages based on the current mode
      const msgInterval = setInterval(() => {
        setScanMsg((prev) => {
          const pool = designImage ? compareMessages : activeScanMessages;
          return (prev + 1) % pool.length;
        });
      }, 3000);

      // Elapsed time counter (updates every second)
      const elapsedInterval = setInterval(() => {
        setElapsed((prev) => prev + 1);
      }, 1000);

      // Client-side hard timeout: abort after 120s
      const controller = new AbortController();
      const clientTimeout = setTimeout(() => controller.abort(), 120_000);

      try {
        const endpoint = designImage ? "/api/compare" : "/api/scan";
        const payload = designImage
          ? { url: targetUrl, designImage }
          : { url: targetUrl };

        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        const data = await res.json();
        if (!res.ok) {
          const msg = data.error || "Scan failed";
          const type: ScanError["type"] =
            res.status >= 500 ? "server" :
            msg.toLowerCase().includes("not allowed") || msg.toLowerCase().includes("blocked") ? "unreachable" :
            msg.toLowerCase().includes("invalid") || msg.toLowerCase().includes("url is required") ? "invalid-url" :
            "unknown";
          setError({ type, message: msg });
          return;
        }
        setResult(data);
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          setError({ type: "timeout", message: "Scan timed out after 120 seconds. The website may be too slow or unresponsive." });
        } else {
          const msg = err instanceof Error ? err.message : "Something went wrong";
          const isNetwork = err instanceof TypeError || msg.includes("Failed to fetch") || msg.includes("NetworkError");
          setError({ type: isNetwork ? "network" : "unknown", message: msg });
        }
      } finally {
        clearInterval(msgInterval);
        clearInterval(elapsedInterval);
        clearTimeout(clientTimeout);
        setLoading(false);
      }
    },
    [url, designImage]
  );

  return {
    url,
    setUrl,
    loading,
    result,
    error,
    scanMsg,
    elapsed,
    handleScan,
  };
}
