import { Downloader, default_config } from "baha-anime-dl";
import fetch from "cross-fetch";
import { expect, it } from "vitest";
import { build, merge } from "../src";

it(
	"can use custom fetcher and merge the video",
	async (ctx) => {
		// Bahamut only allows Taiwan to access the videos.
		const geo = await fetch("http://ip-api.com/json/").then((res) => res.json());
		if (geo.countryCode !== "TW") {
			ctx.skip();
			return;
		}

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
		expect(merged.byteLength).toBeGreaterThan(0);
	},
	{ timeout: 180_000 },
);
