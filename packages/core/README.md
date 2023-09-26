# Bahamut Anime Downloader

Bahamut Anime Downloader is a library designed to fetch **low-quality** anime episodes from Bahamut Anime.

> This package is used by [baha-anime-skip](https://github.com/JacobLinCool/baha-anime-skip) internally, which adds "skip" buttons for anime openings and endings on the Bahamut Anime.

## Key Features

Simply provide the `sn` (serial number) of the desired anime, and the tool will seamlessly:

- **Fetch and Parse**: Download the meta-m3u8 and m3u8 playlist files, then parse them for you.
- **Download and Decrypt**: Acquire the TS (Transport Stream) files and automatically decrypt them.

> **Note**: This tool stops short of merging the downloaded TS files into a single MP4 file. If you require this functionality, you can easily extend it with the `merge` function available in the `baha-anime-dl-ext` package.

## Platform Independence

The package is platform-agnostic. You can plug in any custom implementations for `fetch` and `subtle` as needed.

## Usage Examples

### Basic Download Example

```ts
import fs from "node:fs";
import path from "node:path";
import { Downloader } from "baha-anime-dl";

const SN = 34886;
const dir = "tmp";

if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
}

main();

async function main() {
    const downloader = new Downloader();
    const download = downloader.download(SN);

    const meta = await download.meta;
    fs.writeFileSync(path.join(dir, "meta.m3u8"), meta);

    const playlist = await download.playlist;
    fs.writeFileSync(path.join(dir, "playlist.m3u8"), playlist);

    for (let i = 0; i < download.segments.length; i++) {
        const segment = download.segments[i];
        segment.content.then((content) => {
            fs.writeFileSync(path.join(dir, segment.filename), Buffer.from(content));
        });
    }
}
```

### Integration with `baha-anime-dl-ext` for Merging

```ts
import fs from "node:fs";
import { Downloader } from "baha-anime-dl";
import { merge } from "baha-anime-dl-ext";

const SN = 34886;

main();

async function main() {
    const downloader = new Downloader();
    const download = downloader.download(SN);

    const mp4 = await merge(download);
    fs.writeFileSync(`${SN}.mp4`, mp4);
}
```

## Why Would You Need This?

My use case is for audio analysis, particularly to identify opening and ending songs in anime episodes. Here are some additional ideas:

- Conducting audio analysis for various purposes.
- Training a video upscaler model, though this could require additional authorization steps.

Feel free to dive in and explore the potential of Bahamut Anime Downloader!
