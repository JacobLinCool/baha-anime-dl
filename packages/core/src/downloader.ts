import { version } from "../package.json";
import type { DownloaderConfig } from "./config";
import { default_config } from "./config";
import { log } from "./log";
import { parse } from "./parse";
import type { Download, DownloaderContext, Segment, Token } from "./types";

/**
 * A downloader for Bahamut Anime videos.
 */
export class Downloader {
	protected config: DownloaderConfig;
	protected log: debug.Debugger;
	protected ctx: DownloaderContext;
	protected pool: Promise<void>[];
	protected initialized: Promise<boolean>;

	constructor(config: DownloaderConfig = default_config()) {
		this.config = config;
		this.log = log.extend(config.id);
		this.ctx = {};
		this.pool = Array.from({ length: config.concurrency }, () => Promise.resolve());
		this.initialized = Promise.resolve(false);
	}

	/**
	 * Initializes the downloader by getting the device ID.
	 * It is required to call this method before calling any other methods.
	 * @throws If the device ID cannot be retrieved.
	 */
	public async init(): Promise<void> {
		const initialized = await this.initialized;
		if (!initialized) {
			this.initialized = this._init();
			await this.initialized;
		}
	}

	protected async _init(): Promise<true> {
		await this.get_device();
		if (!this.ctx.device) {
			throw new Error("Cannot get device id");
		}
		this.log("device", this.ctx.device);

		this.log("init done");
		return true;
	}

	/**
	 * Downloads the media with the given serial number or ID.
	 * The `.init` method will be called internally if it has not been called before.
	 * @param sn The serial number or ID of the media to download.
	 * @returns An object containing promises for the media metadata, playlist, and segments.
	 */
	public download(sn: string | number): Download {
		let meta_resolver: (c: string) => void;
		let playlist_resolver: (c: string) => void;
		const meta = new Promise<string>((resolve) => {
			meta_resolver = resolve;
		});
		const playlist = new Promise<string>((resolve) => {
			playlist_resolver = resolve;
		});
		const segments: Segment[] = [];

		// @ts-expect-error resolver is set
		this._download(sn, meta_resolver, playlist_resolver, segments);

		return {
			meta,
			playlist,
			segments,
		};
	}

	protected async _download(
		sn: string | number,
		meta_resolver: (c: string) => void,
		playlist_resolver: (c: string) => void,
		segments: Segment[],
	): Promise<void> {
		sn = sn.toString();

		await this.init();

		const token = await this.get_token(sn);
		if (token.time !== 1) {
			this.log("wait for ad");
			await this.fetch(`https://ani.gamer.com.tw/ajax/videoCastcishu.php?sn=${sn}&s=194699`);
			await new Promise((r) => setTimeout(r, 30_000));
			await this.fetch(
				`https://ani.gamer.com.tw/ajax/videoCastcishu.php?sn=${sn}&s=194699&ad=end`,
			);
		} else {
			this.log("no ad");
		}

		const meta = await this.get_playlist(sn);
		meta_resolver(meta[1]);
		const parsed = parse(meta[1]);
		const url = new URL(parsed.playlists[0].uri, meta[0]).toString();

		const res = await this.fetch(url);
		const playlist = await res.text();
		this.log("playlist", playlist);

		const tasks = await this.download_m3u8(playlist, url, segments);
		playlist_resolver(playlist.replace(/#EXT-X-KEY:METHOD=AES-128,URI=.+/g, ""));

		await Promise.all(tasks);
	}

	protected async download_m3u8(
		m3u8: string,
		base: string,
		results: Segment[],
	): Promise<Promise<ArrayBuffer>[]> {
		const { segments } = parse(m3u8);
		this.log("segments", segments);

		const key_url = new URL(segments[0].key.uri, base).toString();
		const key = await this.fetch(key_url).then((res) => res.arrayBuffer());
		this.log("key", key);

		const iv = new Uint32Array(segments[0].key.iv);
		this.log("iv", iv);

		for (const segment of segments) {
			const url = new URL(segment.uri, base).toString();

			const filename = url.split("/").pop();
			const content = (async () => {
				const buffer = await this.fetch(url).then((res) => res.arrayBuffer());
				const decrypted = await this.decrypt(buffer, key, iv);
				return decrypted;
			})();

			if (!filename) {
				throw new Error(`Cannot get filename of ${JSON.stringify(segment)}`);
			}

			results.push({ filename, content });
		}

		return results.map((segment) => segment.content);
	}

	protected async decrypt(
		buffer: ArrayBuffer,
		key: ArrayBuffer,
		iv: Uint32Array,
	): Promise<ArrayBuffer> {
		const decryption_key = await this.config.subtle.importKey("raw", key, "AES-CBC", false, [
			"encrypt",
			"decrypt",
		]);
		const decrypted = await this.config.subtle.decrypt(
			{
				name: "AES-CBC",
				iv,
			},
			decryption_key,
			buffer,
		);
		return decrypted;
	}

	protected async get_device(): Promise<void> {
		const res = await this.fetch("https://ani.gamer.com.tw/ajax/getdeviceid.php?id=");
		const json = await res.json();
		this.log("getdeviceid", json);

		this.ctx.device = json.deviceid;
	}

	protected async get_token(sn: string): Promise<Token> {
		const res = await this.fetch(
			`https://ani.gamer.com.tw/ajax/token.php?adID=${undefined}&sn=${sn}&device=${this.ctx.device}`,
		);
		const token: Token = await res.json();
		this.log("token", token);

		return token;
	}

	protected async get_playlist(sn: string): Promise<[url: string, content: string]> {
		const res = await this.fetch(
			`https://ani.gamer.com.tw/ajax/m3u8.php?sn=${sn}&device=${this.ctx.device}`,
		);
		const json = await res.json();
		this.log("playlist json", json);

		const text = await this.fetch(json.src).then((res) => res.text());
		this.log("playlist text", text);

		return [json.src, text];
	}

	protected async fetch(...args: Parameters<typeof globalThis.fetch>): Promise<Response> {
		for (let i = 1; i <= this.config.retries; i++) {
			let unlock: () => void;
			const lock = new Promise<void>((resolve) => {
				unlock = resolve;
			});

			this.pool.push(lock);
			await this.pool.shift();

			try {
				this.log("fetch", ...args);
				const res = await this.config.fetcher(args[0], {
					...args[1],
					headers: {
						"User-Agent": `Mozilla/5.0 Baha Anime Downloader/${version}`,
						origin: "https://ani.gamer.com.tw",
						...args[1]?.headers,
					},
				});
				if (res.ok) {
					return res;
				}
			} catch (err) {
				this.log("fetch error", err);
			} finally {
				// @ts-expect-error unlock is set
				unlock();
			}

			// exponential backoff (2^i - 1 seconds)
			await new Promise((r) => setTimeout(r, 1000 * (Math.pow(2, i) - 1)));
		}

		throw new Error(
			`Cannot fetch ${args[0]} after ${this.config.retries} retries with ${JSON.stringify(
				args[1],
			)}`,
		);
	}
}
