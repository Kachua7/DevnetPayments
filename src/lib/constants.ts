export const BTC_INR_RATE = 8350000; // Illustrative fallback only; never use for transaction decisions.
export const SATS_PER_BTC = 100000000;

export function satsToInr(sats: number): number {
  return (sats / SATS_PER_BTC) * BTC_INR_RATE;
}

export function inrToSats(inr: number): number {
  return Math.round((inr / BTC_INR_RATE) * SATS_PER_BTC);
}

export function formatInr(sats: number): string {
  const inr = satsToInr(sats);
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(inr);
}

export function formatInrRaw(inr: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(inr);
}

export function formatBtc(sats: number): string {
  const btc = sats / SATS_PER_BTC;
  if (btc === 0) return '0.00000000';
  return btc.toFixed(8);
}

export function formatSats(sats: number): string {
  return new Intl.NumberFormat('en-IN').format(sats);
}

export function shortAddress(addr: string, prefixLen = 8, suffixLen = 6): string {
  if (!addr || addr.length <= prefixLen + suffixLen) return addr || '';
  return `${addr.slice(0, prefixLen)}...${addr.slice(-suffixLen)}`;
}

export function formatDate(timestamp: number): string {
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(timestamp));
}
