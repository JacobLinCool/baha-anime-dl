// @ts-expect-error no types
import { Parser } from "m3u8-parser";

export function parse(playlist: string): {
	playlists: {
		attributes: {
			BANDWIDTH: number;
			RESOLUTION: { width: number; height: number };
		};
		uri: string;
	}[];
	segments: {
		duration: number;
		uri: string;
		key: {
			method: "AES-128";
			uri: string;
			iv?: Uint32Array;
		};
		timeline: 0;
	}[];
} {
	const parser = new Parser();
	parser.push(playlist);
	parser.end();
	return parser.manifest;
}
