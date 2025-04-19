import fetch from "@fetch-impl/fetcher";
import { expect, it } from "vitest";
import { Downloader } from "../src";

it("can download", { timeout: 120_000 }, async (ctx) => {
	// Bahamut only allows Taiwan to access the videos.
	const geo = await fetch("http://ip-api.com/json/").then((res) => res.json());
	if (geo.countryCode !== "TW") {
		ctx.skip();
		return;
	}

	const downloader = new Downloader();

	const download = downloader.download(34886);
	const meta = await download.meta;
	expect(meta).toMatch(/#EXTM3U/);

	const playlist = await download.playlist;
	expect(playlist).toMatch(/#EXTM3U/);

	expect(download.segments.length).toBeGreaterThan(0);
	for (let i = 0; i < download.segments.length; i++) {
		const segment = download.segments[i];
		expect(segment.filename).toMatch(/\.ts$/);
		segment.content.then((content) => {
			expect(content.byteLength).toBeGreaterThan(0);
		});
	}
});

it("can't download if bad token", { timeout: 120_000 }, async (ctx) => {
	// Bahamut only allows Taiwan to access the videos.
	const geo = await fetch("http://ip-api.com/json/").then((res) => res.json());
	if (geo.countryCode !== "TW") {
		ctx.skip();
		return;
	}

	const downloader = new Downloader();

	const download = downloader.download(35252);
	expect(download.meta).rejects.toThrow();
	expect(download.playlist).rejects.toThrow();
});
