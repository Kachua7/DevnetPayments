import type { UTXO } from '../types';

const BLOCKSTREAM_TESTNET_API = 'https://blockstream.info/testnet/api';
const REQUEST_TIMEOUT_MS = 8_000;

export interface AddressStats {
  funded_txo_sum: number;
  spent_txo_sum: number;
  tx_count: number;
}

export interface AddressBalance {
  balanceSats: number;
  unconfirmedSats: number;
}

function assertTestnetSegwitAddress(address: string): void {
  // This app currently derives native SegWit testnet P2WPKH addresses (tb1q...).
  if (typeof address !== 'string' || !/^tb1q[qpzry9x8gf2tvdw0s3jn54khce6mua7l]{38}$/i.test(address)) {
    throw new Error('Invalid Bitcoin testnet SegWit address');
  }
}

function isSafeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    cache: 'no-store',
  });
  if (!response.ok) {
    throw new Error(`Blockstream API request failed (${response.status})`);
  }
  return (await response.json()) as T;
}

export async function fetchTestnetAddressBalance(address: string): Promise<AddressBalance> {
  assertTestnetSegwitAddress(address);
  const data = await fetchJson<{
    chain_stats?: Partial<AddressStats>;
    mempool_stats?: Partial<AddressStats>;
  }>(`${BLOCKSTREAM_TESTNET_API}/address/${encodeURIComponent(address)}`);

  const confirmedFunded = data.chain_stats?.funded_txo_sum;
  const confirmedSpent = data.chain_stats?.spent_txo_sum;
  const mempoolFunded = data.mempool_stats?.funded_txo_sum;
  const mempoolSpent = data.mempool_stats?.spent_txo_sum;
  if (
    !isSafeInteger(confirmedFunded) ||
    !isSafeInteger(confirmedSpent) ||
    !isSafeInteger(mempoolFunded) ||
    !isSafeInteger(mempoolSpent)
  ) {
    throw new Error('Blockstream returned an invalid balance response');
  }

  const confirmed = confirmedFunded - confirmedSpent;
  const unconfirmed = mempoolFunded - mempoolSpent;
  if (confirmed < 0) throw new Error('Blockstream returned an impossible confirmed balance');
  return { balanceSats: confirmed, unconfirmedSats: unconfirmed };
}

export async function fetchTestnetUTXOs(address: string): Promise<UTXO[]> {
  assertTestnetSegwitAddress(address);
  const items = await fetchJson<unknown>(
    `${BLOCKSTREAM_TESTNET_API}/address/${encodeURIComponent(address)}/utxo`
  );
  if (!Array.isArray(items)) throw new Error('Blockstream returned an invalid UTXO response');

  return items.map((item): UTXO => {
    if (!item || typeof item !== 'object') throw new Error('Blockstream returned a malformed UTXO');
    const candidate = item as Partial<UTXO>;
    if (
      typeof candidate.txid !== 'string' ||
      !/^[0-9a-f]{64}$/i.test(candidate.txid) ||
      !isSafeInteger(candidate.vout) ||
      !isSafeInteger(candidate.value) ||
      candidate.value <= 0 ||
      !candidate.status ||
      typeof candidate.status.confirmed !== 'boolean'
    ) {
      throw new Error('Blockstream returned a malformed UTXO');
    }
    return {
      txid: candidate.txid.toLowerCase(),
      vout: candidate.vout,
      value: candidate.value,
      status: {
        confirmed: candidate.status.confirmed,
        ...(isSafeInteger(candidate.status.block_height)
          ? { block_height: candidate.status.block_height }
          : {}),
      },
    };
  });
}

