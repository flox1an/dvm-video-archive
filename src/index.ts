#!/usr/bin/env node
import dayjs from 'dayjs';
import {
  NostrEvent,
  Filter,
  finalizeEvent,
  nip04,
  EventTemplate,
  getPublicKey,
  nip19,
  kinds,
  nip44,
} from 'nostr-tools';
import { BLOSSOM_UPLOAD_SERVER, NOSTR_PRIVATE_KEY, NOSTR_RELAYS } from './env.js';
import { getInput, getInputParam, getInputTag, getOutputType, getRelays } from './helpers/dvm.js';
import { unique } from './helpers/array.js';
import { pool } from './pool.js';
import { logger } from './debug.js';
import {
  DVM_STATUS_KIND,
  DVM_VIDEO_ARCHIVE_REQUEST_KIND,
  DVM_VIDEO_ARCHIVE_RESULT_KIND as DVM_VIDEO_ARCHIVE_RESULT_KIND,
} from './const.js';
import { listBlobs, uploadFile } from './helpers/blossom.js';
import { rmSync } from 'fs';
import { downloadYoutubeVideo } from './helpers/ytdlp.js';
import path from 'path';
import { Subscription } from 'nostr-tools/abstract-relay';
import { JobContext } from './types.js';
import { mintUrl, publishPaymentRequiredEvent } from './cashu.js';
import { CashuMint, CashuWallet, getEncodedTokenV4, PaymentRequestPayload, Token } from '@cashu/cashu-ts';

const paymentPending: { context: JobContext; requestDate: number }[] = [];

console.log(getEncodedTokenV4({
  token: [
    {
      proofs: [
        {
          amount: 1,
          C: '02e3a21d9046ebb8ad3cadb7bdee14052a9021c2d303d5577118402a3c7bcf3cd5',
          id: '9mlfd5vCzgGl',
          //id: '013747238f83',
          secret: 'f1900cadb13cb242402bf473dfeec82ca0f1088e1500ab2e1c50d722f591172b',
        },
      ],
      mint: mintUrl,
    },
  ],
}));
process.exit(0);

// wallet.checkProofsSpent()

async function shouldAcceptJob(request: NostrEvent): Promise<JobContext> {
  const input = getInput(request);
  const output = getOutputType(request) as 'mp4' | 'webm';

  // const authTokens = getInputParams(request, "authToken");
  const thumbnailCount = parseInt(getInputParam(request, 'thumbnailCount', '3'), 10);

  if (thumbnailCount < 1 || thumbnailCount > 10) {
    throw new Error(`Thumbnail count has to be between 1 and 10`);
  }

  if (input.type === 'url') {
    return { url: input.value, request, wasEncrypted: false };
  } else throw new Error(`Unknown input type ${input.type}`);
}

export async function publishStatusEvent(
  context: JobContext,
  status: string,
  data = '',
  additionalTags: string[][] = []
) {
  const tags = [
    ['status', status],
    ['e', context.request.id],
    ['p', context.request.pubkey],
  ];
  tags.push(...additionalTags);

  const statusEvent = {
    kind: DVM_STATUS_KIND, // DVM Status
    tags,
    content: data,
    created_at: dayjs().unix(),
  };
  console.log('statusEvent', statusEvent);

  // const event = await ensureEncrypted(resultEvent, context.request.pubkey, context.wasEncrypted);
  const result = finalizeEvent(statusEvent, NOSTR_PRIVATE_KEY);

  await Promise.all(
    pool.publish(unique([...getRelays(context.request), ...NOSTR_RELAYS]), result).map(p => p.catch(e => {}))
  );
}

async function doPayRequest(context: JobContext) {
  logger(`Requesting payment for ${context.request.id}`);
  await publishPaymentRequiredEvent(context);
  paymentPending.push({ context, requestDate: Date.now() });
}

async function doWork(context: JobContext) {
  logger(`Starting work for ${context.request.id}`);
  const startTime = dayjs().unix();

  await publishStatusEvent(context, 'processing', 'Starting video download');

  logger(`downloading video for URL ${context.url}`);
  const videoContent = await downloadYoutubeVideo(context.url);
  logger(videoContent);
  if (!videoContent) {
    throw new Error(`Error downloading video ` + context.url);
  }

  await publishStatusEvent(context, 'partial', 'Download completed. Uploading to ' + BLOSSOM_UPLOAD_SERVER);

  const resultTags: string[][] = [];
  const videoBlob = await uploadFile(
    videoContent.videoPath,
    BLOSSOM_UPLOAD_SERVER,
    'video/mp4',
    path.basename(videoContent.videoPath),
    'Upload Video'
  );
  logger(`Uploaded video file: ${videoBlob.url}`);

  const thumbBlob = await uploadFile(
    videoContent.thumbnailPath,
    BLOSSOM_UPLOAD_SERVER,
    'image/webp',
    path.basename(videoContent.videoPath),
    'Upload Thumbnail'
  );
  logger(`Uploaded thumbnail file: ${thumbBlob.url}`);

  const videoEventTemplate = {
    created_at: dayjs().unix(), // TODO should this be today / now?
    kind: 34235,
    tags: [
      ['d', `${videoContent.infoData.extractor}-${videoContent.infoData.id}`],
      [
        'url',
        videoBlob.url.endsWith('.mp4') ? videoBlob.url : videoBlob.url + '.mp4', // TODO fix for other formats
      ],
      ['title', videoContent.infoData.title],
      ['summary', videoContent.infoData.description],
      ['published_at', `${videoContent.infoData.timestamp}`],
      ['client', 'dvm-nostr-video-archive'],
      ['m', 'video/mp4'], // TODO fix for other formats
      ['size', `${videoBlob.size}`],
      ['duration', `${videoContent.infoData.duration}`],
      [
        'thumb',
        thumbBlob.url.endsWith('.webp') ? thumbBlob.url : thumbBlob.url + '.webp', // TODO fix for other formats
      ],
      [
        'image',
        thumbBlob.url.endsWith('.webp') ? thumbBlob.url : thumbBlob.url + '.webp', // TODO fix for other formats
      ],
      ['r', videoContent.infoData.webpage_url],
      ...videoContent.infoData.tags.map(tag => ['t', tag]),
    ],
    content: videoContent.infoData.title,
  };

  //console.log(videoEventTemplate);

  const resultEvent = {
    kind: DVM_VIDEO_ARCHIVE_RESULT_KIND,
    tags: [
      ['request', JSON.stringify(context.request)],
      ['e', context.request.id],
      ['p', context.request.pubkey],
      getInputTag(context.request),
    ],
    content: JSON.stringify(videoEventTemplate),
    created_at: dayjs().unix(),

    // TODO add expiration tag when request had an expiration tag
  };

  const event = await ensureEncrypted(resultEvent, context.request.pubkey, context.wasEncrypted);
  const result = finalizeEvent(event, NOSTR_PRIVATE_KEY);

  rmSync(videoContent.tempDir, { recursive: true }); // TODO also remove this when an error occurs

  const endTime = dayjs().unix();

  // TODO add DVM error events for exeptions

  logger(`${`Finished work for ${context.request.id} in ` + (endTime - startTime)} seconds`);
  logger('Would publish event: ', result);

  await Promise.all(
    pool.publish(unique([...getRelays(context.request), ...NOSTR_RELAYS]), result).map(p => p.catch(e => {}))
  );
}

async function ensureEncrypted(event: EventTemplate, recipentPubKey: string, wasEncrypted: boolean) {
  if (!wasEncrypted) return event;

  const tagsToEncrypt = event.tags.filter(t => t[0] !== 'p' && t[0] !== 'e');
  const encText = await nip04.encrypt(NOSTR_PRIVATE_KEY, recipentPubKey, JSON.stringify(tagsToEncrypt));

  return {
    ...event,
    content: encText,
    tags: (event.tags = [...event.tags.filter(t => t[0] == 'e'), ['p', recipentPubKey], ['encrypted']]),
  };
}

async function ensureDecrypted(event: NostrEvent) {
  const encrypted = event.tags.some(t => t[0] == 'encrypted');
  if (encrypted) {
    const encryptedTags = await nip04.decrypt(NOSTR_PRIVATE_KEY, event.pubkey, event.content);
    return {
      wasEncrypted: true,
      event: {
        ...event,
        tags: event.tags.filter(t => t[0] !== 'encrypted').concat(JSON.parse(encryptedTags)),
      },
    };
  }
  return { wasEncrypted: false, event };
}

const seenEvents = new Set<string>();

async function handleEvent(event: NostrEvent) {
  if (!seenEvents.has(event.id)) {
    try {
      seenEvents.add(event.id);
      if (event.kind === DVM_VIDEO_ARCHIVE_REQUEST_KIND) {
        const { wasEncrypted, event: decryptedEvent } = await ensureDecrypted(event);
        const context = await shouldAcceptJob(decryptedEvent);
        context.wasEncrypted = wasEncrypted;
        try {
          await doPayRequest(context);
        } catch (e) {
          if (e instanceof Error) {
            logger(`Failed to process request ${decryptedEvent.id} because`, e.message);
            console.log(e);
          }
        }
      }
      if (event.kind === kinds.GiftWrap) {
        const wrapEvent = event;
        const wappedContent = nip44.v2.decrypt(
          wrapEvent.content,
          nip44.v2.utils.getConversationKey(NOSTR_PRIVATE_KEY, wrapEvent.pubkey)
        );
        const sealEvent = JSON.parse(wappedContent) as NostrEvent;
        const dmEventString = nip44.v2.decrypt(
          sealEvent.content,
          nip44.v2.utils.getConversationKey(NOSTR_PRIVATE_KEY, sealEvent.pubkey)
        );
        const dmEvent = JSON.parse(dmEventString) as NostrEvent;
        const content = dmEvent.content;
        let jobId: string | undefined;

        console.log('dm content', content);
        try {
          const payload = JSON.parse(content) as PaymentRequestPayload;
          if (payload) {
            //const receiveStore = useReceiveTokensStore();
            const { id, memo, proofs, mint, unit } = payload;
            jobId = id;
            const tokenForDisplay = {
              token: [{ proofs: proofs, mint: mint }],
              unit: unit,
            } as Token;
            console.log('encodedToken', getEncodedTokenV4(tokenForDisplay), id, memo);
            //receiveStore.showReceiveTokens = true;

            const mintService = new CashuMint(mint);
            const wallet = new CashuWallet(mintService);
            const proofsAfterSwap = await wallet.receiveTokenEntry(payload);
            console.log(JSON.stringify(proofsAfterSwap));
            const tokenAfterSwap = {
              token: [{ proofs: proofsAfterSwap, mint }],
              unit,
            } as Token;
            console.log('encodedToken-after-receive', getEncodedTokenV4(tokenAfterSwap));
          }
        } catch (e) {
          console.log('### parsing message for ecash failed', e);
          return;
        }

        //const payment
        //nip17DirectMessageEvents.add(dmEvent)
        //this.lastEventTimestamp = Math.floor(Date.now() / 1000);

        //this.parseMessageForEcash(content);        // get context from pendingpayments
        // unwrap DM
        // parse cashu token
        // swap with the mint
        const job = paymentPending.find(p => p.context.request.id == jobId);
        if (job) {
          await publishStatusEvent(job.context, 'processing', 'Payment received'); // TODO get teh correct job context

          await doWork(job.context); // TODO get teh correct job context
        }
      }
    } catch (e) {
      if (e instanceof Error) {
        logger(`Skipped request ${event.id} because`, e.message);
      }
    }
  }
}

const subscriptions: { [key: string]: Subscription } = {};
const pubkey = getPublicKey(NOSTR_PRIVATE_KEY);

const filters: Filter[] = [
  { kinds: [DVM_VIDEO_ARCHIVE_REQUEST_KIND], since: dayjs().unix() },
  { kinds: [kinds.GiftWrap], '#p': [pubkey], since: dayjs().unix() },
];

async function ensureSubscriptions() {
  logger(
    `ensureSubscriptions`,
    JSON.stringify(Object.entries(subscriptions).map(([k, v]) => ({ k, closed: v.closed })))
  );
  for (const url of NOSTR_RELAYS) {
    const existing = subscriptions[url];

    if (!existing || existing.closed) {
      if (existing?.closed) {
        logger(`Reconnecting to ${url}`);
      }
      delete subscriptions[url];
      try {
        const relay = await pool.ensureRelay(url);
        const sub = relay.subscribe(filters, {
          onevent: handleEvent,
          onclose: () => {
            logger('Subscription to', url, 'closed');
            if (subscriptions[url] === sub) delete subscriptions[url];
          },
        });

        logger('Subscribed to', url);
        subscriptions[url] = sub;

        logger(
          `subscriptions after set`,
          JSON.stringify(Object.entries(subscriptions).map(([k, v]) => ({ k, closed: v.closed })))
        );
      } catch (error: any) {
        logger('Failed to reconnect to', url, error.message);
        delete subscriptions[url];
      }
    }
  }
}

async function cleanupBlobs() {
  const pubkey = getPublicKey(NOSTR_PRIVATE_KEY);
  const blobs = await listBlobs(BLOSSOM_UPLOAD_SERVER, pubkey); // TODO add from/until to filter by timestamp

  /*
  const cutOffDate = dayjs().unix() - 60 * 60 * 24 * BLOSSOM_BLOB_EXPIRATION_DAYS;
  for (const blob of blobs) {
    if (blob.created < cutOffDate) {
      logger(`Deleting expired blob ${blob.url}`);
      await deleteBlob(BLOSSOM_UPLOAD_SERVER, blob.sha256);
    }
  }
    */
  const storedSize = blobs.reduce((prev, val) => prev + val.size, 0);
  logger(`Currently stored ${storedSize / 1024 / 1024 / 1024} GB.`);
}

await cleanupBlobs();
setInterval(cleanupBlobs, 60 * 60 * 1000); // Clean up blobs every hour

await ensureSubscriptions();
setInterval(ensureSubscriptions, 60_000); // Ensure connections every 30s

async function shutdown() {
  process.exit();
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
process.once('SIGUSR2', shutdown);

//console.log(nip19.nsecEncode(NOSTR_PRIVATE_KEY));
