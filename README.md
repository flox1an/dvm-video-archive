# Video Archive DVM


INput
should we add the youtube channel somewhere
should we add more urls i.e. backups to other blossom servers?
should we add more resolutions?s

## TODOs

- Build a DVM with single URL, public event, upload to a predefined blossom server
  - write down limitations
  - support all video platforms that yt-dlp has (only single videos), return proper error event if URL is not recognized

- Add custom blossom server for upload (requires ecash?? or auth event!?)

- Create a video event and upload it to specified relays
  - Should we do this with the DVM nsec?
    - if yes, specify an array of relays
  - OR return a video event template to the user
  - Add r tag with the original video URL


# Known Limitations
- Playlists / mutliple videos not supported









A [Data Vending Machine](https://www.data-vending-machines.org/) that uses [ffmpeg](https://ffmpeg.org/) to extract metadata and create thumbnails for video files. [notes](https://github.com/nostr-protocol/nostr)


## Example Input

```json
{
    "kind": 5204,
    "content": "",
    "tags": [
        [ "i", "https://cdn.satellite.earth/4050ff8c96b295ded9de688fb8a06aa7e2879413281f4dd9b0b6547b4a18819d.mp4", "url", "ws://localhost:4869" ],
        [ "output", "image/jpeg" ],
        [ "relays", "ws://localhost:4869" ]
    ]
}
```

## Example Output

```json
{
  "content": "",
  "kind": 6204,
  "tags": [
    [
      "request",
      "{\"id\":\"1badb978c9e6cc67e2d1bd4949a65a4da0aaabfc2d01e7e886cd83d7683dd2de\",\"pubkey\":\"79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798\",\"created_at\":1714336010,\"kind\":5204,\"tags\":[[\"i\",\"https://cdn.satellite.earth/4050ff8c96b295ded9de688fb8a06aa7e2879413281f4dd9b0b6547b4a18819d.mp4\",\"url\",\"ws://localhost:4869\"],[\"output\",\"image/jpeg\"],[\"relays\",\"ws://localhost:4869\"]],\"content\":\"\",\"sig\":\"8d1e56f91f721d127260f4313c1fe307e790632a0c2d855bf4c02ec9f38c4cef651b7adcd2acff4f0d8719136943f55de4314f76119dbe4d119d22a4daa6e7a9\"}"
    ],
    [
      "e",
      "1badb978c9e6cc67e2d1bd4949a65a4da0aaabfc2d01e7e886cd83d7683dd2de"
    ],
    [
      "p",
      "79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798"
    ],
    [
      "i",
      "https://cdn.satellite.earth/4050ff8c96b295ded9de688fb8a06aa7e2879413281f4dd9b0b6547b4a18819d.mp4",
      "url",
      "ws://localhost:4869"
    ],
    [
      "dim",
      "1280x720"
    ],
    [
      "duration",
      "341"
    ],
    [
      "size",
      "62340416"
    ],
    [
      "thumb",
      "https://media-server.slidestr.net/9a0179ae3f604a561c571312d8ac4c41ce7ecccfea603f4fc37457849d148083"
    ],
    [
      "x",
      "9a0179ae3f604a561c571312d8ac4c41ce7ecccfea603f4fc37457849d148083"
    ],
    [
      "thumb",
      "https://media-server.slidestr.net/69aaa1e0051beff35791fe21190807e87f581817e1db1a79c8e0cf6420d935a6"
    ],
    [
      "x",
      "69aaa1e0051beff35791fe21190807e87f581817e1db1a79c8e0cf6420d935a6"
    ],
    [
      "thumb",
      "https://media-server.slidestr.net/6c31e9917b3edb95b48d56885167645f1d55ea588842bda238ca8198f3e53e67"
    ],
    [
      "x",
      "6c31e9917b3edb95b48d56885167645f1d55ea588842bda238ca8198f3e53e67"
    ]
  ]
}
```

TODO
Ideas:
- create optional http endpoint that creates just one video thumbnail
- 

# BLOSSOM IDEAS

## Expiration

PUT /upload 
X-Blossom-Expiration: <unix-timestamp> header -> blog gets an expiration tag
Blob can be deleted when the expiration time stamp is reached (but might still be need preserved for other users)

BlobDescriptor returns the expiration as additional field.

GET /<hash>
MAY return the expiration time as HEADER X-Blossom-Expiration


## Blob Organization
It might be needed to organize blobs in some way to separate different use cases, e.g. media vs. pw manager vs. cache vs...
Maybe we need tag support in blossom?
