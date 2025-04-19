import { useCrossFetch } from "@fetch-impl/cross-fetch";
import type { fetch } from "@fetch-impl/fetcher";
import { Fetcher } from "@fetch-impl/fetcher";
import cookielize from "fetch-cookie";
import { CookieJar } from "tough-cookie";

const fetcher = new Fetcher();

useCrossFetch(fetcher);

export function build(): typeof fetch {
	const cookiejar = new CookieJar();
	return cookielize(fetcher.fetch.bind(fetcher), cookiejar);
}
