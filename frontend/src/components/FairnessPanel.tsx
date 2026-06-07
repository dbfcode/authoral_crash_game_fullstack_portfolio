import { useState } from 'react';
import type { RoundVerification } from '../hooks/useRoundVerification';
import {
  buildFairnessChecks,
  fairnessPhaseLabel,
  translateVerifyReason,
  verificationSummary,
} from '../utils/fairness-labels';
import { truncateHash } from '../utils/money';

type Props = {
  status: string;
  roundId: string | null;
  committedRoundHash: string;
  nextRoundHash: string | null;
  revealedRoundSeed: string | null;
  crashPoint: string | null;
  verification: RoundVerification;
};

function CheckIcon({ passed }: { passed: boolean | null }) {
  if (passed === null) {
    return <span className="text-gray-500">…</span>;
  }
  return passed ? (
    <span className="text-casino-accent" aria-hidden>
      ✓
    </span>
  ) : (
    <span className="text-casino-danger" aria-hidden>
      ✗
    </span>
  );
}

export function FairnessPanel({
  status,
  roundId,
  committedRoundHash,
  nextRoundHash,
  revealedRoundSeed,
  crashPoint,
  verification,
}: Props) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const verifyData = verification.data;
  const checks = verifyData ? buildFairnessChecks(verifyData) : [];
  const reasonPt = translateVerifyReason(verifyData?.reason);

  return (
    <section className="rounded-xl border border-white/10 bg-casino-panel p-4 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-300">
          Provably Fair
        </h2>
        <span className="rounded-full bg-casino-purple/20 px-2 py-0.5 text-xs text-casino-purple">
          {fairnessPhaseLabel(status)}
        </span>
      </div>

      <div className="space-y-2 rounded-lg border border-white/5 bg-black/20 p-3">
        <p className="text-xs font-medium text-gray-400">Rodada ao vivo</p>
        <div>
          <p className="text-xs text-gray-500">Hash comprometido (antes das apostas)</p>
          <p
            className="break-all font-mono text-sm text-white"
            title={committedRoundHash || undefined}
          >
            {committedRoundHash ? truncateHash(committedRoundHash, 12, 8) : '—'}
          </p>
        </div>
        <p className="text-xs text-gray-500">
          Publicado antes das apostas; seed oculta até o crash — resultado já estava definido.
        </p>
        {nextRoundHash ? (
          <div>
            <p className="text-xs text-gray-500">Próximo compromisso (cadeia)</p>
            <p className="font-mono text-xs text-gray-300" title={nextRoundHash}>
              {truncateHash(nextRoundHash, 10, 6)}
            </p>
          </div>
        ) : null}
        {revealedRoundSeed && status === 'settled' ? (
          <div>
            <p className="text-xs text-gray-500">Seed revelada</p>
            <p className="font-mono text-xs text-casino-purple" title={revealedRoundSeed}>
              {truncateHash(revealedRoundSeed, 10, 6)}
            </p>
          </div>
        ) : null}
      </div>

      <div className="space-y-2 rounded-lg border border-white/5 bg-black/20 p-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-medium text-gray-400">Verificação automática</p>
          {verification.state === 'loading' ? (
            <span className="text-xs text-gray-500">Verificando…</span>
          ) : null}
        </div>

        {!verifyData && verification.state === 'idle' ? (
          <p className="text-xs text-gray-500">
            Após o crash, comparamos hash, seed e crash point automaticamente.
          </p>
        ) : null}

        {verification.error ? (
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs text-casino-danger">{verification.error}</p>
            <button
              type="button"
              onClick={verification.retry}
              className="text-xs text-casino-purple underline"
            >
              Recarregar
            </button>
          </div>
        ) : null}

        {verifyData ? (
          <>
            <p
              className={`text-sm font-semibold ${verifyData.valid ? 'text-casino-accent' : 'text-casino-danger'}`}
            >
              {verificationSummary(verifyData)}
            </p>
            {crashPoint || verifyData.crashPoint ? (
              <p className="text-lg font-bold tabular-nums text-white">
                {(crashPoint ?? verifyData.crashPoint)}x
              </p>
            ) : null}
            <ul className="space-y-2">
              {checks.map((check) => (
                <li key={check.key} className="flex gap-2 text-xs">
                  <CheckIcon passed={check.passed} />
                  <div>
                    <p className="font-medium text-gray-300">{check.label}</p>
                    <p className="text-gray-500">{check.explanation}</p>
                  </div>
                </li>
              ))}
            </ul>
            {reasonPt && !verifyData.valid ? (
              <p className="text-xs text-casino-danger">{reasonPt}</p>
            ) : null}
            <button
              type="button"
              onClick={() => setDetailsOpen((o) => !o)}
              className="text-xs text-casino-purple hover:underline"
            >
              {detailsOpen ? 'Ocultar detalhes técnicos' : 'Detalhes técnicos'}
            </button>
            {detailsOpen ? (
              <dl className="space-y-1 border-t border-white/5 pt-2 text-xs">
                <TechRow label="Round ID" value={verifyData.roundId} />
                <TechRow label="Round hash" value={verifyData.roundHash} mono />
                <TechRow label="Round seed" value={verifyData.roundSeed || '—'} mono />
                <TechRow label="Nonce" value={String(verifyData.nonce)} />
                <TechRow label="Algoritmo" value={verifyData.algorithmVersion} />
                {verifyData.nextRoundHash ? (
                  <TechRow label="Next hash" value={verifyData.nextRoundHash} mono />
                ) : null}
              </dl>
            ) : null}
          </>
        ) : null}
      </div>

      {roundId ? (
        <p className="text-[10px] text-gray-600 font-mono truncate" title={roundId}>
          ID atual: {roundId.slice(0, 8)}…
        </p>
      ) : null}
    </section>
  );
}

function TechRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <dt className="text-gray-500">{label}</dt>
      <dd className={`break-all text-gray-300 ${mono ? 'font-mono' : ''}`}>{value}</dd>
    </div>
  );
}
