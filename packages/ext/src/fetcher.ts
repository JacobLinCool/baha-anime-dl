import fetch from "cross-fetch";
import cookielize from "fetch-cookie";
import tough from "tough-cookie";
import { log } from "./log";

/**
 * Options for the fetcher.
 */
export interface FetcherOptions {
	/**
	 * Cookies to be set. Those cookies will be set to the cookie jar at the beginning.
	 */
	cookies?: Record<string, string>;
	/**
	 * Headers to be set. This will merge with the default headers.
	 * If conflict, the default headers will be overwritten.
	 */
	headers?: Record<string, string>;
	/**
	 * The Cache implementation to be used, if any.
	 * It can be partial, but must have `match` and `put` methods.
	 */
	cache?: Pick<Cache, "match" | "put">;
}

/**
 * Builds a fetch function with optional cookie and cache support.
 * @param opt - Optional configuration options for the fetch function.
 * @returns A fetch function with optional cookie and cache support.
 */
export function build(opt?: FetcherOptions): typeof globalThis.fetch {
	const cookiejar = new tough.CookieJar();
	if (opt?.cookies) {
		for (const [key, value] of Object.entries(opt.cookies)) {
			cookiejar.setCookieSync(`${key}=${value}`, "https://ani.gamer.com.tw");
			log(`set cookie: ${key}=${value}`);
		}
	}

	const fetcher = cookielize(fetch, cookiejar);

	return async (...args: Parameters<typeof globalThis.fetch>) => {
		if (opt?.cache) {
			const cached = await opt.cache.match(args[0].toString());
			if (cached) {
				log("cache hit", args[0].toString());
				return cached;
			} else {
				log("cache miss", args[0].toString());
			}
		}

		const res = await fetcher(args[0], {
			...args[1],
			headers: {
				...args[1]?.headers,
				...opt?.headers,
			},
		});

		if (opt?.cache) {
			opt.cache.put(args[0].toString(), res.clone());
		}

		return res;
	};
}
