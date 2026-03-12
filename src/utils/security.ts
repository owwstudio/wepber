// src/utils/security.ts

// SSRF PROTECTION
// Block private, loopback, link-local, multicast, and metadata service IP ranges
const BLOCKED_HOSTNAMES = /^(localhost|.*\.local|.*\.internal|.*\.corp|0\.0\.0\.0|::)$/i;

// Regex for reserved IPv4 and IPv6 space (local, private, etc)
// 127.0.0.0/8
// 10.0.0.0/8
// 172.16.0.0/12
// 192.168.0.0/16
// 169.254.0.0/16
// 0.0.0.0/8
// ::1/128 (Loopback IPv6)
// fc00::/7 (Unique local address IPv6) - fc or fd
// fe80::/10 (Link-local IPv6)
const PRIVATE_IP_RE = /^(?:\[)?(?:127\.|10\.|172\.(?:1[6-9]|2[0-9]|3[01])\.|192\.168\.|169\.254\.|0\.|::1|fc[0-9a-f]{0,2}:|fd[0-9a-f]{0,2}:|fe[89ab][0-9a-f]:)/i;

export function isSafeUrl(parsed: URL): { safe: boolean; reason: string } {
    const { protocol, hostname } = parsed;

    // Protocol whitelist
    if (protocol !== "http:" && protocol !== "https:") {
        return { safe: false, reason: `Protocol "${protocol}" is not allowed` };
    }

    // Block numeric private IPs and IPv6 local addresses
    if (PRIVATE_IP_RE.test(hostname)) {
        return { safe: false, reason: "Scanning private/internal IP addresses is not allowed" };
    }

    // Block dangerous hostnames
    if (BLOCKED_HOSTNAMES.test(hostname)) {
        return { safe: false, reason: "Scanning internal hostnames is not allowed" };
    }

    // Block bare IP literals that look like private ranges (extra guard)
    // Note: Node's URL parser will convert hexadecimal/octal IP formats into standard dotted decimal
    const ipv4Parts = hostname.replace(/^\[|\]$/g, '').split(".").map(Number);
    if (ipv4Parts.length === 4 && ipv4Parts.every(n => !isNaN(n))) {
        const [a, b] = ipv4Parts;
        if (
            a === 0 || 
            a === 10 || 
            a === 127 || 
            (a === 172 && b >= 16 && b <= 31) || 
            (a === 192 && b === 168) || 
            (a === 169 && b === 254)
        ) {
            return { safe: false, reason: "Scanning private/internal IP addresses is not allowed" };
        }
    }

    // Block mapped IPv4-in-IPv6 addresses targeting loopback/private (e.g. ::ffff:127.0.0.1)
    if (hostname.includes("::ffff:")) {
        const mappedIpv4 = hostname.split("::ffff:")[1]?.replace("]", "");
        if (mappedIpv4 && PRIVATE_IP_RE.test(mappedIpv4)) {
            return { safe: false, reason: "Scanning private/internal IP addresses is not allowed" };
        }
    }

    return { safe: true, reason: "" };
}
