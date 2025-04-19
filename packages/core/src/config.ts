import type { fetch } from "@fetch-impl/fetcher";
import type { webcrypto } from "node:crypto";
import { subtle } from "node:crypto";
import { build } from "./fetcher";

/**
 * Configuration options for the downloader.
 */
export interface DownloaderConfig {
	/**
	 * The ID of the downloader. Only used for logging.
	 */
	id: string;
	/**
	 * The fetch function to use for downloading files.
	 * It requires to be able to handle cookie states.
	 */
	fetcher: typeof fetch;
	/**
	 * The maximum number of concurrent downloads.
	 */
	concurrency: number;
	/**
	 * The number of times to retry downloading a segment.
	 */
	retries: number;

	/**
	 * The webcrypto.SubtleCrypto implementation to use for decrypting segments.
	 */
	subtle: webcrypto.SubtleCrypto;

	/**
	 * Directory to continue downloading from.
	 * If provided and files exist, will skip downloading those segments.
	 */
	continueDir: string | null;
}

export const default_config = () =>
	({
		id: Math.random().toString(36).slice(2),
		fetcher: build(),
		concurrency: 6,
		retries: 3,
		subtle: subtle,
		continueDir: null,
	}) satisfies DownloaderConfig;
