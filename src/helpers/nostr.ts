import dayjs from 'dayjs';
import { VideoContent } from './ytdlp.js';
import { BlobDescriptor } from './blossom.js';

export function createTemplateVideoEvent(
  videoContent: VideoContent,
  videoBlob: BlobDescriptor,
  thumbBlob: BlobDescriptor
) {
  return {
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
}
