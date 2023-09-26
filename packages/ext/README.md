# Bahamut Anime Downloader Extensions

This package contains useful functions for Bahamut Anime Downloader.

## Features

- `build`: unlike the original `build` function, you can craft a new fetch function with your own options, including custom headers, cookies, and cache.
- `merge`: the `merge` function accepts a `Download` object that returned from `Downloader.download` method, it automatically waits and merges the downloaded files into a single mp4 file. (This will not work if `ffmpeg` or file system is not supported)

## Example

```ts
import { Downloader, default_config } from "baha-anime-dl";
import { build, merge } from "baha-anime-dl-ext";
import fs from "node:fs";

main();

async function main() {
    const config = {
        ...default_config(),
        fetcher: build({
            headers: {
                "User-Agent": "Mozilla/5.0 Custom User Agent",
            },
        }),
    };

    const downloader = new Downloader(config);

    const download = downloader.download(34886);
    const merged = await merge(download);
    fs.writeFileSync("output.mp4", Buffer.from(merged));
}
```
