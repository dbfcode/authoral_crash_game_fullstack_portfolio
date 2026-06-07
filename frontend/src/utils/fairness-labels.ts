import type { VerifyRoundResponse } from '../api/games';

export type FairnessCheckKey = 'commitment' | 'crash' | 'chain';

export type FairnessCheckItem = {
  key: FairnessCheckKey;
  label: string;
  explanation: string;
  selfCheckHint?: string;
  passed: boolean | null;
};

const REASON_PT: Record<string, string> = {
  'roundSeed does not match roundHash':
    'A seed revelada não corresponde ao hash publicado antes das apostas.',
  'crashPoint does not match recomputed value':
    'O crash point não bate com o recálculo a partir da seed.',
  'nextRoundHash does not match next round commitment':
    'O encadeamento com a próxima rodada não confere.',
  'nextRoundSeed does not match nextRoundHash':
    'A seed da próxima rodada não confere com o hash encadeado.',
  'previousRoundSeed does not match previousRoundHash':
    'A seed da rodada anterior não confere com o hash encadeado.',
  'Round fairness data not yet revealed':
    'Dados ainda não revelados — aguarde o fim da rodada.',
};

export function fairnessPhaseLabel(status: string): string {
  switch (status) {
    case 'betting':
      return 'Apostas abertas';
    case 'running':
      return 'Multiplicador subindo';
    case 'settled':
      return 'Rodada encerrada';
    default:
      return 'Aguardando rodada';
  }
}

export function translateVerifyReason(reason: string | undefined): string | null {
  if (!reason) {
    return null;
  }
  return REASON_PT[reason] ?? reason;
}

function commitmentPassed(data: VerifyRoundResponse): boolean {
  return data.reason !== 'roundSeed does not match roundHash';
}

export function buildFairnessChecks(data: VerifyRoundResponse): FairnessCheckItem[] {
  const hasSeed = data.roundSeed.length > 0;

  return [
    {
      key: 'commitment',
      label: 'Compromisso',
      explanation:
        'SHA-256(seed) deve ser igual ao hash publicado antes das apostas — prova que o resultado já estava fixado.',
      selfCheckHint:
        'Confira você: após o crash, calcule SHA-256 da seed (hex, em detalhes técnicos) e compare com o hash que apareceu em "Rodada ao vivo" — devem ser idênticos.',
      passed: hasSeed ? commitmentPassed(data) : null,
    },
    {
      key: 'crash',
      label: 'Crash point',
      explanation: data.crashPoint
        ? `HMAC(seed, nonce) recalculado deve bater com ${data.crashPoint}x exibido no crash.`
        : 'HMAC(seed, nonce) recalculado deve bater com o multiplicador do crash.',
      passed: hasSeed ? data.crashValid : null,
    },
    {
      key: 'chain',
      label: 'Cadeia',
      explanation:
        'O hash desta rodada deve encadear com o compromisso (nextRoundHash) da rodada seguinte.',
      passed: hasSeed ? data.chainValid : null,
    },
  ];
}

export function verificationSummary(data: VerifyRoundResponse): string {
  if (!data.roundSeed) {
    return 'Aguardando revelação da seed';
  }
  if (data.valid) {
    return `Rodada verificada — crash ${data.crashPoint}x`;
  }
  return 'Verificação com falhas';
}
