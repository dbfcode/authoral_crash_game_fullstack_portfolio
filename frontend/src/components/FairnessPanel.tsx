import { useState } from 'react';
import type { FairnessVerifications, VerificationEntry } from '../hooks/useFairnessVerifications';
import type { VerifyRoundResponse } from '../api/games';
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
  fairness: FairnessVerifications;
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
  fairness,
}: Props) {
  return (
    <section className="rounded-xl border border-white/10 bg-casino-panel p-4 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-300">
          Provably Fair
        </h2>
        <span className="rounded-full bg-casino-purple/20 px-2 py-0.5 text-xs text-casino-purple">
          {fairness.latestEntry?.data
            ? 'Rodada comprovada'
            : fairnessPhaseLabel(status)}
        </span>
      </div>

      <div className="space-y-2 rounded-lg border border-white/5 bg-black/20 p-3">
        <p className="text-xs font-medium text-gray-400">Rodada ao vivo</p>
        <div>
          <p className="text-xs text-gray-500">Hash publicado (antes das apostas)</p>
          <p
            className="break-all font-mono text-sm text-white"
            title={committedRoundHash || undefined}
          >
            {committedRoundHash ? truncateHash(committedRoundHash, 12, 8) : '—'}
          </p>
        </div>
        {nextRoundHash ? (
          <div>
            <p className="text-xs text-gray-500">Próximo compromisso (cadeia)</p>
            <p className="font-mono text-xs text-gray-300" title={nextRoundHash}>
              {truncateHash(nextRoundHash, 10, 6)}
            </p>
          </div>
        ) : null}
        {roundId ? (
          <p className="text-[10px] text-gray-600 font-mono truncate" title={roundId}>
            ID atual: {roundId.slice(0, 8)}…
          </p>
        ) : null}
      </div>

      {fairness.latestEntry ? (
        <VerificationDetail
          entry={fairness.latestEntry}
          onRetry={() => fairness.retry(fairness.latestEntry!.roundId)}
          title="Comprovação selecionada"
        />
      ) : (
        <div className="rounded-lg border border-white/5 bg-black/20 p-3">
          <p className="text-xs text-gray-500">
            Aguardando rodada encerrar para buscar comprovação em /verify…
          </p>
        </div>
      )}

      {fairness.entries.length > 0 ? (
        <div className="space-y-2 rounded-lg border border-white/5 bg-black/20 p-3">
          <p className="text-xs font-medium text-gray-400">
            Histórico comprovável ({fairness.entries.length})
          </p>
          <ul className="space-y-1">
            {fairness.entries.map((entry) => (
              <li key={entry.roundId}>
                <button
                  type="button"
                  onClick={() => fairness.selectRound(entry.roundId)}
                  className={`flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors ${
                    fairness.selectedRoundId === entry.roundId
                      ? 'bg-casino-purple/20 text-white'
                      : 'hover:bg-white/5 text-gray-300'
                  }`}
                >
                  <span className="font-mono truncate" title={entry.roundId}>
                    {entry.roundId.slice(0, 8)}…
                  </span>
                  <span className="shrink-0 tabular-nums">
                    {entry.crashPoint ?? entry.data?.crashPoint ?? '—'}x
                  </span>
                  <StatusDot entry={entry} />
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

function StatusDot({ entry }: { entry: VerificationEntry }) {
  if (entry.state === 'loading') {
    return <span className="text-gray-500">…</span>;
  }
  if (entry.state === 'ok' && entry.data?.valid) {
    return <span className="text-casino-accent">✓</span>;
  }
  return <span className="text-casino-danger">✗</span>;
}

function VerificationDetail({
  entry,
  onRetry,
  title,
}: {
  entry: VerificationEntry;
  onRetry: () => void;
  title: string;
}) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const verifyData = entry.data;
  const checks = verifyData ? buildFairnessChecks(verifyData) : [];
  const reasonPt = translateVerifyReason(verifyData?.reason);

  return (
    <div className="space-y-2 rounded-lg border border-white/5 bg-black/20 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-gray-400">{title}</p>
        {entry.state === 'loading' ? (
          <span className="text-xs text-gray-500">Verificando…</span>
        ) : null}
      </div>

      <p className="text-[10px] text-gray-500 font-mono truncate" title={entry.roundId}>
        {entry.roundId}
      </p>

      {entry.error ? (
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-xs text-casino-danger">{entry.error}</p>
          <button type="button" onClick={onRetry} className="text-xs text-casino-purple underline">
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
          {verifyData.crashPoint ? (
            <p className="text-lg font-bold tabular-nums text-white">{verifyData.crashPoint}x</p>
          ) : null}
          {verifyData.roundSeed ? (
            <div>
              <p className="text-xs text-gray-500">Seed revelada</p>
              <p className="font-mono text-xs text-casino-purple" title={verifyData.roundSeed}>
                {truncateHash(verifyData.roundSeed, 10, 6)}
              </p>
            </div>
          ) : null}
          <ul className="space-y-2">
            {checks.map((check) => (
              <li key={check.key} className="flex gap-2 text-xs">
                <CheckIcon passed={check.passed} />
                <div>
                  <p className="font-medium text-gray-300">{check.label}</p>
                  <p className="text-gray-500">{check.explanation}</p>
                  {check.selfCheckHint ? (
                    <p className="mt-1 text-[10px] leading-snug text-gray-500">{check.selfCheckHint}</p>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
          {reasonPt && !verifyData.valid ? (
            <p className="text-xs text-casino-danger">{reasonPt}</p>
          ) : null}
          <button
            type="button"
            onClick={() => setDetailsOpen((open) => !open)}
            className="text-xs text-casino-purple hover:underline"
          >
            {detailsOpen ? 'Ocultar detalhes técnicos' : 'Detalhes técnicos'}
          </button>
          {detailsOpen ? <TechnicalDetails data={verifyData} /> : null}
        </>
      ) : entry.state === 'loading' ? (
        <p className="text-xs text-gray-500">Consultando GET /games/rounds/:id/verify…</p>
      ) : null}
    </div>
  );
}

function TechnicalDetails({ data }: { data: VerifyRoundResponse }) {
  return (
    <dl className="space-y-1 border-t border-white/5 pt-2 text-xs">
      <TechRow label="Round hash" value={data.roundHash} mono />
      <TechRow label="Round seed" value={data.roundSeed || '—'} mono />
      <TechRow label="Nonce" value={String(data.nonce)} />
      <TechRow label="Algoritmo" value={data.algorithmVersion} />
      {data.nextRoundHash ? <TechRow label="Next hash" value={data.nextRoundHash} mono /> : null}
    </dl>
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
