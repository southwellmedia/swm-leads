export function ScoreBadge({ score }: { score: number | null }) {
  const s = score ?? 0;
  const cls =
    score === null ? "score-none" : s >= 70 ? "score-hot" : s >= 50 ? "score-warm" : s >= 25 ? "score-mid" : s > 0 ? "score-cool" : "score-none";

  return (
    <span
      className={`inline-flex h-7 w-9 items-center justify-center rounded-md text-xs font-semibold tabular-nums ${cls}`}
      title={score === null ? "Not scanned" : `Needs-help score ${s} of 100`}
    >
      {score === null ? "—" : s}
    </span>
  );
}
