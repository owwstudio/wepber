"use client";

import { useState, useCallback } from "react";
import type { ScanResult, ScanError } from "@/types/scan";
import { activeScanMessages, compareMessages } from "@/config/scanMessages";

/**
 * Custom hook encapsulating all scan execution logic.
 *
 * Manages URL state, loading indicators, progress message rotation,
 * elapsed timer, SSE streaming, and the AbortController-based client timeout.
 *
 * In scan mode (no designImage), uses SSE streaming to progressively
 * deliver section results as they complete. In compare mode, uses
 * traditional JSON response.
 *
 * @param designImage – current design image data URL (or null).
 *   When non-null the hook hits `/api/compare`; otherwise `/api/scan`.
 *
 * @see agent.md §19 — Progressive Result Streaming
 */
export function useScan(designImage: string | null) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<ScanError | null>(null);
  const [scanMsg, setScanMsg] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [streaming, setStreaming] = useState(false);
  const [streamStatus, setStreamStatus] = useState<string | null>(null);

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
      setStreaming(false);
      setStreamStatus(null);

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
        if (designImage) {
          // ===== COMPARE MODE — traditional JSON response =====
          const res = await fetch("/api/compare", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url: targetUrl, designImage }),
            signal: controller.signal,
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || "Scan failed");
          setResult(data);
        } else {
          // ===== SCAN MODE — SSE streaming =====
          const res = await fetch("/api/scan", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url: targetUrl }),
            signal: controller.signal,
          });

          if (!res.ok) {
            const data = await res.json().catch(() => ({ error: "Scan failed" }));
            const msg = data.error || "Scan failed";
            const errType: ScanError["type"] =
              res.status >= 500 ? "server" :
              msg.toLowerCase().includes("not allowed") || msg.toLowerCase().includes("blocked") ? "unreachable" :
              msg.toLowerCase().includes("invalid") || msg.toLowerCase().includes("url is required") ? "invalid-url" :
              "unknown";
            setError({ type: errType, message: msg });
            return;
          }

          const reader = res.body!.getReader();
          const decoder = new TextDecoder();
          let buffer = "";
          let partialResult: ScanResult = { url: targetUrl };
          let receivedFirstSection = false;

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });

            // Parse SSE events from buffer (split by double newline)
            const parts = buffer.split("\n\n");
            buffer = parts.pop() || "";

            for (const part of parts) {
              const line = part.trim();
              if (!line.startsWith("data: ")) continue;

              try {
                const event = JSON.parse(line.slice(6));

                if (event.type === "status") {
                  setStreamStatus(event.message);
                } else if (event.type === "section") {
                  // Section data arrived — add to partial result
                  partialResult = { ...partialResult, [event.key]: event.data };
                  if (!receivedFirstSection) {
                    receivedFirstSection = true;
                    setStreaming(true);
                  }
                  setResult({ ...partialResult });
                } else if (event.type === "screenshot") {
                  partialResult = { ...partialResult, screenshot: event.data };
                  setResult({ ...partialResult });
                } else if (event.type === "complete") {
                  // Final event — merge metadata into result
                  partialResult = {
                    ...partialResult,
                    url: event.url,
                    scanDate: event.scanDate,
                    overallScore: event.overallScore,
                  };
                  setResult({ ...partialResult });
                  setStreaming(false);
                } else if (event.type === "error") {
                  throw new Error(event.message || "Scan failed");
                }
              } catch (parseErr) {
                // If it's a rethrown error from the handler, propagate it
                if (parseErr instanceof Error && parseErr.message !== "Unexpected end of JSON input") {
                  throw parseErr;
                }
                // Otherwise ignore malformed SSE chunk
              }
            }
          }
        }
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
        setStreaming(false);
        setStreamStatus(null);
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
    streaming,
    streamStatus,
    handleScan,
  };
}
