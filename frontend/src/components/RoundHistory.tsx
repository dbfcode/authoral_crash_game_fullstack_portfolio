import type { RoundHistoryItem } from '../api/games';

type Props = {
  items: RoundHistoryItem[];
};

function crashColor(crashPoint: string | null): string {
  if (!crashPoint) {
    return 'bg-gray-700 text-gray-300';
  }
  const value = Number.parseFloat(crashPoint);
  if (Number.isNaN(value)) {
    return 'bg-gray-700 text-gray-300';
  }
  return value >= 2 ? 'bg-green-900/60 text-green-300' : 'bg-red-900/60 text-red-300';
}

export function RoundHistory({ items }: Props) {
  return (
    <section className="rounded-xl border border-white/10 bg-casino-panel p-4">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-300">
        Histórico
      </h2>
      <div className="flex flex-wrap gap-2">
        {items.length === 0 ? (
          <p className="text-sm text-gray-500">Sem rodadas finalizadas ainda.</p>
        ) : (
          items.map((item) => (
            <span
              key={item.roundId}
              className={`rounded-md px-2 py-1 text-xs font-semibold tabular-nums ${crashColor(item.crashPoint)}`}
              title={item.roundId}
            >
              {item.crashPoint ? `${item.crashPoint}x` : '—'}
            </span>
          ))
        )}
      </div>
    </section>
  );
}
