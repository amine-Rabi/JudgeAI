import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { createClient, createAccount } from 'genlayer-js';
import * as chains from 'genlayer-js/chains';
import { TransactionStatus } from 'genlayer-js/types';

const NETWORK = process.env.GENLAYER_NETWORK || 'testnetBradbury';
const chain = chains[NETWORK];
if (!chain) {
  console.error(
    `Unknown network "${NETWORK}". Use one of: localnet | studionet | testnetAsimov | testnetBradbury`
  );
  process.exit(1);
}

const pk = process.env.DEPLOYER_PRIVATE_KEY;
if (!pk || !/^0x[0-9a-fA-F]{64}$/.test(pk)) {
  console.error('DEPLOYER_PRIVATE_KEY missing or malformed (expected 0x + 64 hex chars).');
  process.exit(1);
}

const account = createAccount(pk);
const client = createClient({ chain, account });

const code = readFileSync(new URL('../contracts/judge.py', import.meta.url), 'utf8');

console.log(`Deploying JudgeAI to ${NETWORK} as ${account.address} ...`);
const txHash = await client.deployContract({ account, code, args: [] });

const receipt = await client.waitForTransactionReceipt({
  hash: txHash,
  status: TransactionStatus.ACCEPTED,
});

const address = receipt?.data?.contractAddress ?? receipt?.contractAddress;
if (!address) {
  console.error('Deploy accepted but no contract address found on receipt:', receipt);
  process.exit(1);
}

console.log('Deployed at:', address);
console.log('Put this in web/.env.local as NEXT_PUBLIC_CONTRACT_ADDRESS');
