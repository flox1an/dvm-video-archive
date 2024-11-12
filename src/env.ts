//import 'dotenv/config';
import { hexToBytes } from '@noble/hashes/utils';

if (!process.env.NOSTR_PRIVATE_KEY) throw new Error('Missing NOSTR_PRIVATE_KEY');
const NOSTR_PRIVATE_KEY = hexToBytes(process.env.NOSTR_PRIVATE_KEY);

// nostr
const NOSTR_RELAYS = process.env.NOSTR_RELAYS?.split(',') ?? [];
if (NOSTR_RELAYS.length === 0) throw new Error('Missing NOSTR_RELAYS');

const BLOSSOM_UPLOAD_SERVER = process.env.BLOSSOM_UPLOAD_SERVER || '';
if (BLOSSOM_UPLOAD_SERVER == '') throw new Error('Missing BLOSSOM_UPLOAD_SERVER');

const PAYMENT_MINT_URL = process.env.CASHU_MINT_URL ?? 'https://mint.minibits.cash/Bitcoin';

const PAYMENT_AMOUNT = parseInt(process.env.PAYMENT_AMOUNT ?? '1');

const DATA_DIR = process.env.DATA_DIR ?? './data';

export { NOSTR_PRIVATE_KEY, NOSTR_RELAYS, BLOSSOM_UPLOAD_SERVER, PAYMENT_MINT_URL, PAYMENT_AMOUNT, DATA_DIR };

export const BLOSSOM_BLOB_EXPIRATION_DAYS = parseInt(process.env.BLOSSOM_BLOB_EXPIRATION_DAYS || '2', 0); // TODO 2 days deletion
