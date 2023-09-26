# Bahamut Anime Downloader

This tool is used to download **low quality** Anime from Bahamut.

> It serves as a component of [baha-anime-skip](https://github.com/JacobLinCool/baha-anime-skip), which detects the opening and ending songs and add `skip` button to Bahamut Anime.

## Features

By giving the `sn` of the anime, this tool can do the following things:

- **Download** the meta-m3u8 file, and **parse** it
- **Download** the m3u8 playlist, and **parse** it
- **Download** the ts files, and **decrypt** them

It does **not** merge the ts files into a single mp4 file, if you want to do so, you can use [ffmpeg](https://ffmpeg.org/).

It is platform independent, you can pass any custom `fetch` and `subtle` implementation to it.

## Example

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
