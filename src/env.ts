import 'dotenv/config';
import { hexToBytes } from '@noble/hashes/utils';

if (!process.env.NOSTR_PRIVATE_KEY) throw new Error('Missing NOSTR_PRIVATE_KEY');
const NOSTR_PRIVATE_KEY = hexToBytes(process.env.NOSTR_PRIVATE_KEY);

// lnbits
const LNBITS_URL = process.env.LNBITS_URL;
const LNBITS_ADMIN_KEY = process.env.LNBITS_ADMIN_KEY;

// nostr
const NOSTR_RELAYS = process.env.NOSTR_RELAYS?.split(',') ?? [];
if (NOSTR_RELAYS.length === 0) throw new Error('Missing NOSTR_RELAYS');

const BLOSSOM_UPLOAD_SERVER = process.env.BLOSSOM_UPLOAD_SERVER || '';
if (BLOSSOM_UPLOAD_SERVER == '') throw new Error('Missing BLOSSOM_UPLOAD_SERVER');

export { NOSTR_PRIVATE_KEY, LNBITS_URL, LNBITS_ADMIN_KEY, NOSTR_RELAYS, BLOSSOM_UPLOAD_SERVER };

export const BLOSSOM_BLOB_EXPIRATION_DAYS = parseInt(process.env.BLOSSOM_BLOB_EXPIRATION_DAYS || '20', 0); // TODO 2 days deletion
