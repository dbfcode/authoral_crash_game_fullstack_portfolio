type Props = {
  multiplier: string | null;
  crashedFlash: boolean;
  loading: boolean;
};

export function MultiplierChart({ multiplier, crashedFlash, loading }: Props) {
  const display = multiplier ?? '1.00';

  return (
    <div
      className={`relative flex h-48 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-gradient-to-b from-casino-panel to-black transition-colors ${
        crashedFlash ? 'border-casino-danger bg-red-950/40' : ''
      }`}
    >
      {loading ? (
        <div className="h-8 w-32 animate-pulse rounded bg-white/10" />
      ) : (
        <>
          <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-casino-accent/10 to-transparent" />
          <p
            className={`text-5xl font-black tabular-nums tracking-tight ${
              crashedFlash ? 'text-casino-danger' : 'text-casino-accent'
            }`}
          >
            {display}x
          </p>
        </>
      )}
    </div>
  );
}
