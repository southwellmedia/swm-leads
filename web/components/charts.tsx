/**
 * Small inline charts. Deliberately plain CSS rather than a charting library:
 * these are eight-row bar lists, and a dependency would cost more than it saves.
 */

const BUCKETS = [
  { label: "0", min: 0, max: 0, cls: "score-none" },
  { label: "1–24", min: 1, max: 24, cls: "score-cool" },
  { label: "25–49", min: 25, max: 49, cls: "score-mid" },
  { label: "50–69", min: 50, max: 69, cls: "score-warm" },
  { label: "70+", min: 70, max: 100, cls: "score-hot" },
];

export function ScoreHistogram({ scores }: { scores: number[] }) {
  const counts = BUCKETS.map((b) => scores.filter((s) => s >= b.min && s <= b.max).length);
  const max = Math.max(1, ...counts);

  return (
    <div className="mt-4 flex h-32 items-end gap-2">
      {BUCKETS.map((b, i) => (
        <div key={b.label} className="flex flex-1 flex-col items-center gap-1">
          <div className="text-xs tabular-nums" style={{ color: "var(--muted)" }}>
            {counts[i]}
          </div>
          <div
            className={`w-full rounded-t ${b.cls}`}
            style={{ height: `${Math.max(4, (counts[i] / max) * 100)}%` }}
            title={`${counts[i]} businesses scoring ${b.label}`}
          />
          <div className="text-xs" style={{ color: "var(--muted)" }}>
            {b.label}
          </div>
        </div>
      ))}
    </div>
  );
}

export function Bars({ items, total }: { items: { label: string; value: number }[]; total: number }) {
  const max = Math.max(1, total, ...items.map((i) => i.value));
  return (
    <ul className="mt-3 space-y-1.5">
      {items.map((i) => (
        <li key={i.label} className="flex items-center gap-2 text-sm">
          <span className="w-28 shrink-0 truncate text-xs" style={{ color: "var(--muted)" }} title={i.label}>
            {i.label}
          </span>
          <span className="h-2 flex-1 overflow-hidden rounded-full" style={{ background: "var(--bg)" }}>
            <span
              className="block h-full rounded-full"
              style={{ width: `${(i.value / max) * 100}%`, background: "var(--accent)" }}
            />
          </span>
          <span className="w-8 text-right text-xs tabular-nums" style={{ color: "var(--muted)" }}>
            {i.value}
          </span>
        </li>
      ))}
    </ul>
  );
}
