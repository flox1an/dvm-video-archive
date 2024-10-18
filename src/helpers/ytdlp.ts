import { exec } from 'child_process';
import { mkdirSync, readFileSync, readdirSync } from 'fs';
import path from 'path';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface YoutubeVideoInfo {
  id: string;
  title: string;
  thumbnail: string;
  description: string;
  channel_id: string;
  channel_url: string;
  duration: number;
  view_count: number;
  age_limit: number;
  webpage_url: string;
  categories: string[];
  tags: string[];
  playable_in_embed: boolean;
  live_status: string;
  release_timestamp: number;
  _format_sort_fields: string[];
  comment_count: number;
  like_count: number;
  channel: string;
  channel_follower_count: number;
  channel_is_verified: boolean;
  uploader: string;
  uploader_id: string;
  uploader_url: string;
  upload_date: string;
  timestamp: number;
  availability: string;
  webpage_url_basename: string;
  webpage_url_domain: string;
  extractor: string;
  extractor_key: string;
  display_id: string;
  fulltitle: string;
  duration_string: string;
  release_date: string;
  release_year: number;
  is_live: boolean;
  was_live: boolean;
  epoch: number;
  format: string;
  format_id: string;
  ext: string;
  protocol: string;
  language: string;
  format_note: string;
  filesize_approx: number;
  tbr: number;
  width: number;
  height: number;
  resolution: string;
  fps: number;
  dynamic_range: string;
  vcodec: string;
  vbr: number;
  aspect_ratio: number;
  acodec: string;
  abr: number;
  asr: number;
  audio_channels: number;
  _type: string;
  _version: {
    version: string;
    release_git_head: string;
    repository: string;
  };
}

type VideoContent = {
  tempDir: string;
  videoPath: string;
  infoData: YoutubeVideoInfo;
  thumbnailPath: string;
};

export async function downloadYoutubeVideo(videoUrl: string): Promise<VideoContent> {
  try {
    // Create a temporary directory with a random name
    const tempDir = path.join(process.cwd(), 'temp' + Math.random().toString(36).substring(2));
    mkdirSync(tempDir);

    // Construct the command to extract thumbnails using ffmpeg
//     const command = `yt-dlp -f "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best" -S vcodec:h264,res,acodec:m4a --write-info-json --write-thumbnail --write-description "${videoUrl}"`;
// BEST 
    const command = `yt-dlp -f "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best" --write-info-json --write-thumbnail --write-description "${videoUrl}"`;
    // 720p x264 const command = `yt-dlp -f "bestvideo[height<=720][ext=mp4]+bestaudio[ext=m4a]/best[height<=720][ext=mp4]/best" -S vcodec:h264,res,acodec:m4a "${videoUrl}"`;
    // Execute the command
    const { stdout, stderr } = await execAsync(command, { cwd: tempDir });

    // Check for any errors
    if (stderr) {
      throw new Error(stderr);
    }

    // Read the temp directory to find the first .mp4, .json, and .webp files
    const files = readdirSync(tempDir);

    const videoPath = files.find(file => file.endsWith('.mp4'));
    const infoPath = files.find(file => file.endsWith('.info.json'));
    const thumbnailPath = files.find(file => file.endsWith('.webp'));

    if (!videoPath || !infoPath || !thumbnailPath) {
      throw new Error('Required files not found in the temporary directory.');
    }

    // Read the JSON data from the info file
    const infoData = JSON.parse(readFileSync(path.join(tempDir, infoPath), 'utf-8')) as YoutubeVideoInfo;

    return {
      tempDir,
      videoPath: path.join(tempDir, videoPath),
      infoData,
      thumbnailPath: path.join(tempDir, thumbnailPath),
    };
  } catch (error: any) {
    throw new Error(`Failed to download video ${error.message}`);
  }
}
