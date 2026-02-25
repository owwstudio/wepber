export function getScoreClass(score: number) {
    if (score >= 90) return "excellent";
    if (score >= 75) return "good";
    if (score >= 60) return "average";
    if (score >= 40) return "poor";
    return "bad";
}

export function getScoreColor(score: number) {
    if (score >= 90) return "#22c55e";
    if (score >= 75) return "#84cc16";
    if (score >= 60) return "#f59e0b";
    if (score >= 40) return "#f97316";
    return "#ef4444";
}

export function getScoreLabel(score: number) {
    if (score >= 90) return "Excellent";
    if (score >= 75) return "Good";
    if (score >= 60) return "Average";
    if (score >= 40) return "Poor";
    return "Critical";
}
