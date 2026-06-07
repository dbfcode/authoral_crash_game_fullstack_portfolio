import { truncateHash } from '../utils/money';

type Props = {
  committedRoundHash: string;
  revealedRoundSeed: string | null;
  crashPoint: string | null;
  roundId: string | null;
  onVerify: () => void;
};

export function FairnessPanel({
  committedRoundHash,
  revealedRoundSeed,
  crashPoint,
  roundId,
  onVerify,
}: Props) {
  return (
    <section className="rounded-xl border border-white/10 bg-casino-panel p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-300">
          Provably Fair
        </h2>
        <span className="rounded-full bg-casino-accent/20 px-2 py-0.5 text-xs text-casino-accent">
          Rodada verificável
        </span>
      </div>
      <div>
        <p className="text-xs text-gray-500">Hash comprometido (antes da rodada)</p>
        <p className="break-all font-mono text-sm text-white" title={committedRoundHash}>
          {committedRoundHash ? truncateHash(committedRoundHash, 12, 8) : '—'}
        </p>
      </div>
      {revealedRoundSeed ? (
        <div>
          <p className="text-xs text-gray-500">Seed revelada (após crash)</p>
          <p className="break-all font-mono text-sm text-casino-purple" title={revealedRoundSeed}>
            {truncateHash(revealedRoundSeed, 12, 8)}
          </p>
          {crashPoint ? (
            <p className="mt-1 text-sm text-gray-300">Crash: {crashPoint}x</p>
          ) : null}
        </div>
      ) : (
        <p className="text-xs text-gray-500">Seed revelada somente após o crash.</p>
      )}
      {roundId ? (
        <button
          type="button"
          onClick={onVerify}
          className="rounded-lg border border-casino-purple/50 px-3 py-1.5 text-sm text-casino-purple hover:bg-casino-purple/10"
        >
          Verificar rodada
        </button>
      ) : null}
    </section>
  );
}
