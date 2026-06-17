import { createClient } from 'genlayer-js';
import { testnetBradbury } from 'genlayer-js/chains';
import { TransactionStatus } from 'genlayer-js/types';
import type { CalldataEncodable } from 'genlayer-js/types';

export const CONTRACT_ADDRESS = (process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || '') as `0x${string}`;
export const HAS_CONTRACT = /^0x[0-9a-fA-F]{40}$/.test(CONTRACT_ADDRESS);

export { TransactionStatus };

export type Ruling = 'PARTY_A' | 'PARTY_B' | 'SPLIT' | 'INSUFFICIENT' | '';

export interface Dispute {
  id: string;
  title: string;
  party_a: string;
  party_b: string;
  statement_a: string;
  statement_b: string;
  evidence_a: string;
  evidence_b: string;
  status: 'AWAITING_RESPONSE' | 'READY' | 'RESOLVED';
  ruling: Ruling;
  fault_a: number;
  credibility_a: number;
  credibility_b: number;
  agreed_facts: string;
  violation: string;
  resolution: string;
  reasoning: string;
}

// Read-only client (no wallet). Safe to construct anywhere on the client.
export const readClient = createClient({ chain: testnetBradbury });

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
    };
  }
}

export function getWriteClient(address: `0x${string}`) {
  return createClient({
    chain: testnetBradbury,
    account: address,
    // genlayer-js reads the injected EIP-1193 provider for signing.
  });
}

export async function connectWallet(): Promise<`0x${string}`> {
  if (typeof window === 'undefined' || !window.ethereum) {
    throw new Error('No wallet found. Install MetaMask (or a compatible wallet) to act on a case.');
  }
  const accounts = (await window.ethereum.request({ method: 'eth_requestAccounts' })) as string[];
  if (!accounts || !accounts.length) throw new Error('Wallet connection was rejected.');
  return accounts[0] as `0x${string}`;
}

export async function listDisputes(): Promise<Dispute[]> {
  if (!HAS_CONTRACT) return [];
  const raw = (await readClient.readContract({
    address: CONTRACT_ADDRESS,
    functionName: 'list_disputes',
    args: [],
  })) as unknown;
  return normalizeList(raw);
}

export async function getDispute(id: string): Promise<Dispute | null> {
  if (!HAS_CONTRACT) return null;
  const raw = (await readClient.readContract({
    address: CONTRACT_ADDRESS,
    functionName: 'get_dispute',
    args: [id],
  })) as unknown;
  const list = normalizeList([raw]);
  return list[0] && list[0].id ? list[0] : null;
}

// genlayer-js may decode dict/list as plain objects or Maps depending on version.
function asObject(v: unknown): Record<string, unknown> {
  if (v instanceof Map) return Object.fromEntries(v) as Record<string, unknown>;
  if (v && typeof v === 'object') return v as Record<string, unknown>;
  return {};
}

function normalizeList(raw: unknown): Dispute[] {
  const arr = Array.isArray(raw) ? raw : raw instanceof Map ? Array.from(raw.values()) : [];
  return arr
    .map((item) => {
      const o = asObject(item);
      const num = (k: string) => Number(o[k] ?? 0) || 0;
      const str = (k: string) => String(o[k] ?? '');
      return {
        id: str('id'),
        title: str('title'),
        party_a: str('party_a'),
        party_b: str('party_b'),
        statement_a: str('statement_a'),
        statement_b: str('statement_b'),
        evidence_a: str('evidence_a'),
        evidence_b: str('evidence_b'),
        status: (str('status') || 'AWAITING_RESPONSE') as Dispute['status'],
        ruling: str('ruling') as Ruling,
        fault_a: num('fault_a'),
        credibility_a: num('credibility_a'),
        credibility_b: num('credibility_b'),
        agreed_facts: str('agreed_facts'),
        violation: str('violation'),
        resolution: str('resolution'),
        reasoning: str('reasoning'),
      } as Dispute;
    })
    .filter((d) => d.id);
}

export function parseEvidence(json: string): string[] {
  try {
    const arr = JSON.parse(json);
    return Array.isArray(arr) ? arr.map(String) : [];
  } catch {
    return [];
  }
}

async function writeAndWait(
  address: `0x${string}`,
  functionName: string,
  args: CalldataEncodable[]
): Promise<unknown> {
  if (!HAS_CONTRACT) throw new Error('No contract configured. Set NEXT_PUBLIC_CONTRACT_ADDRESS.');
  const client = getWriteClient(address);
  const txHash = await client.writeContract({
    address: CONTRACT_ADDRESS,
    functionName,
    args,
    value: BigInt(0),
  });
  const receipt = await client.waitForTransactionReceipt({
    hash: txHash,
    status: TransactionStatus.ACCEPTED,
    interval: 5000, // poll every 5s
    retries: 120, // up to ~10 min — Bradbury consensus can take minutes
  });
  return receipt;
}

export async function fileDispute(
  address: `0x${string}`,
  title: string,
  statement: string,
  evidence: string[],
  partyB: string
): Promise<void> {
  await writeAndWait(address, 'file_dispute', [title, statement, JSON.stringify(evidence), partyB]);
}

export async function respondToDispute(
  address: `0x${string}`,
  id: string,
  statement: string,
  evidence: string[]
): Promise<void> {
  await writeAndWait(address, 'respond', [id, statement, JSON.stringify(evidence)]);
}

export async function adjudicate(address: `0x${string}`, id: string): Promise<void> {
  await writeAndWait(address, 'adjudicate', [id]);
}
