import debug from "debug";
import fs from "node:fs";
import path from "node:path";
import { Downloader } from "../src";

debug.enable("baha-anime-dl*");

const dir = "tmp";
if (!fs.existsSync(dir)) {
	fs.mkdirSync(dir);
}

main();

async function main() {
	const downloader = new Downloader();
	await downloader.init();

	const download = downloader.download(34886);
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
