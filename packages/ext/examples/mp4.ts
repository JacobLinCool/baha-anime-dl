import { Downloader, default_config } from "baha-anime-dl";
import debug from "debug";
import fs from "node:fs";
import path from "node:path";
import { build, merge } from "../src";

debug.enable("baha-anime-dl*");

const dir = "tmp";
if (!fs.existsSync(dir)) {
	fs.mkdirSync(dir);
}

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
	fs.writeFileSync(path.join(dir, "output.mp4"), Buffer.from(merged));
}
