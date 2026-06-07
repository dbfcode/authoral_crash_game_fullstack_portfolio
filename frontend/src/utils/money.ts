const MIN_BET_CENTS = 100n;
const MAX_BET_CENTS = 100_000n;

export function parseMoneyInputToCents(input: string): bigint | null {
  const normalized = input.trim().replace(',', '.');
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) {
    return null;
  }

  const [whole, fraction = ''] = normalized.split('.');
  const frac = (fraction + '00').slice(0, 2);
  const cents = BigInt(whole) * 100n + BigInt(frac);
  if (cents < MIN_BET_CENTS || cents > MAX_BET_CENTS) {
    return null;
  }
  return cents;
}

export function formatCents(cents: bigint): string {
  const negative = cents < 0n;
  const abs = negative ? -cents : cents;
  const whole = abs / 100n;
  const frac = (abs % 100n).toString().padStart(2, '0');
  return `${negative ? '-' : ''}R$ ${whole.toLocaleString('pt-BR')},${frac}`;
}

export function multiplierToHundredths(multiplier: string): bigint {
  const normalized = multiplier.trim().replace(',', '.');
  const [whole, fraction = ''] = normalized.split('.');
  const frac = (fraction + '00').slice(0, 2);
  return BigInt(whole) * 100n + BigInt(frac);
}

export function computePayoutCents(
  amountCents: bigint,
  multiplierDecimal: string,
): bigint {
  const hundredths = multiplierToHundredths(multiplierDecimal);
  return (amountCents * hundredths) / 100n;
}

export function truncateHash(hash: string, head = 8, tail = 6): string {
  if (hash.length <= head + tail + 3) {
    return hash;
  }
  return `${hash.slice(0, head)}…${hash.slice(-tail)}`;
}

export { MIN_BET_CENTS, MAX_BET_CENTS };
