import type { VerifyRoundResponse } from '../api/games';

type Props = {
  open: boolean;
  loading: boolean;
  data: VerifyRoundResponse | null;
  error: string | null;
  onClose: () => void;
};

export function VerifyModal({ open, loading, data, error, onClose }: Props) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-white/10 bg-casino-panel p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Verificação Provably Fair</h3>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-white">
            ✕
          </button>
        </div>
        {loading ? <p className="text-gray-400">Carregando…</p> : null}
        {error ? <p className="text-casino-danger">{error}</p> : null}
        {data ? (
          <dl className="space-y-2 text-sm">
            <Row label="Válido" value={data.valid ? 'Sim' : 'Não'} />
            <Row label="Crash válido" value={data.crashValid ? 'Sim' : 'Não'} />
            <Row label="Chain válida" value={data.chainValid ? 'Sim' : 'Não'} />
            <Row label="Crash point" value={`${data.crashPoint}x`} />
            <Row label="Round hash" value={data.roundHash} mono />
            <Row label="Round seed" value={data.roundSeed || '—'} mono />
            {data.reason ? <Row label="Motivo" value={data.reason} /> : null}
          </dl>
        ) : null}
      </div>
    </div>
  );
}

function Row({
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
      <dd className={`break-all text-white ${mono ? 'font-mono text-xs' : ''}`}>{value}</dd>
    </div>
  );
}
