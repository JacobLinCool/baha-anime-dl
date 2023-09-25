import fetch from "cross-fetch";
import cookielize from "fetch-cookie";
import tough from "tough-cookie";

export function build(): typeof globalThis.fetch {
	const cookiejar = new tough.CookieJar();
	const fetcher = cookielize(fetch, cookiejar);
	return fetcher;
}
