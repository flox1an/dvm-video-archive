import { finalizeEvent } from 'nostr-tools';
import dayjs from 'dayjs';
import { createReadStream, statSync } from 'fs';
import axios from 'axios';
import debug from 'debug';
import { NOSTR_PRIVATE_KEY } from '../env.js';
import { BLOSSOM_AUTH_KIND } from '../const.js';
import { readFile } from 'fs/promises';
import { createHash } from 'crypto';

const logger = debug('dvm:blossom');

type BlobDescriptor = {
  created: number;
  type?: string;
  sha256: string;
  size: number;
  url: string;
};

const tenMinutesFromNow = () => dayjs().unix() + 10 * 60;

function createBlossemUploadAuthToken(size: number, blobHash: string, name: string, description: string): string {
  const authEvent = {
    created_at: dayjs().unix(),
    kind: BLOSSOM_AUTH_KIND,
    content: 'Upload thumbail',
    tags: [
      ['t', 'upload'],
      ['size', `${size}`],
      ['x', blobHash],
      ['name', `thumb_${Math.random().toString(36).substring(2)}.jpg`], // make sure the auth events are unique
      ['expiration', `${tenMinutesFromNow()}`],
    ],
  };
  const signedEvent = finalizeEvent(authEvent, NOSTR_PRIVATE_KEY);
  logger(JSON.stringify(signedEvent));
  return btoa(JSON.stringify(signedEvent));
}

function createBlossemListAuthToken(): string {
  const authEvent = {
    created_at: dayjs().unix(),
    kind: BLOSSOM_AUTH_KIND,
    content: 'List Blobs',
    tags: [
      ['t', 'list'],
      ['expiration', `${tenMinutesFromNow()}`],
    ],
  };
  const signedEvent = finalizeEvent(authEvent, NOSTR_PRIVATE_KEY);
  return btoa(JSON.stringify(signedEvent));
}

function createBlossemDeleteAuthToken(blobHash: string): string {
  const authEvent = {
    created_at: dayjs().unix(),
    kind: BLOSSOM_AUTH_KIND,
    content: 'Delete Blob',
    tags: [
      ['t', 'delete'],
      ['x', blobHash],
      ['expiration', `${tenMinutesFromNow()}`],
    ],
  };
  const signedEvent = finalizeEvent(authEvent, NOSTR_PRIVATE_KEY);
  return btoa(JSON.stringify(signedEvent));
}

/*
export function decodeBlossemAuthToken(encodedAuthToken: string) {
  try {
    return JSON.parse(atob(encodedAuthToken).toString()) as SignedEvent;
  } catch (e: any) {
    logger("Failed to extract auth token ", encodedAuthToken);
  }
}
*/
async function calculateSHA256(filePath: string): Promise<string> {
  try {
      const fileBuffer = await readFile(filePath);
      const hash = createHash('sha256');
      hash.update(fileBuffer);
      return hash.digest('hex');
  } catch (error: any) {
      throw new Error(`Fehler beim Berechnen des SHA-256-Hash: ${error.message}`);
  }
}

export async function uploadFile(
  filePath: string,
  server: string,
mimeType: string,
name: string, 
actionDescription: string): Promise<BlobDescriptor> {
  try {
    const stat = statSync(filePath);

    const hash = await calculateSHA256(filePath);

    const blossomAuthToken = createBlossemUploadAuthToken(stat.size, hash, name, actionDescription);

    // Create a read stream for the thumbnail file
    const thumbnailStream = createReadStream(filePath);

    // Upload thumbnail stream using axios
    const blob = await axios.put<BlobDescriptor>(`${server}/upload`, thumbnailStream, {
      headers: {
        'Content-Type': mimeType,
        Authorization: 'Nostr ' + blossomAuthToken,
      },
    });

    logger(`File ${filePath} uploaded successfully.`);
    return blob.data;
  } catch (error: any) {
    throw new Error(
      `Failed to upload thumbnail ${filePath}: ${error.message} (${JSON.stringify(error.response?.data)})`
    );
  }
}

export async function listBlobs(server: string, pubkey: string): Promise<BlobDescriptor[]> {
  const authToken = createBlossemListAuthToken();
  const blobResult = await axios.get<BlobDescriptor[]>(`${server}/list/${pubkey}`, {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      Authorization: 'Nostr ' + authToken,
    },
  });
  if (blobResult.status !== 200) {
    logger(`Failed to list blobs: ${blobResult.status} ${blobResult.statusText}`);
  }
  return blobResult.data;
}

export async function deleteBlob(server: string, blobHash: string): Promise<void> {
  const authToken = createBlossemDeleteAuthToken(blobHash);
  const blobResult = await axios.delete(`${server}/${blobHash}`, {
    headers: {
      Authorization: 'Nostr ' + authToken,
    },
  });
  if (blobResult.status !== 200) {
    logger(`Failed to delete blobs: ${blobResult.status} ${blobResult.statusText}`);
  }
}
