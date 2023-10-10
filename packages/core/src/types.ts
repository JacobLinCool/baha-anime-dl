export interface Token {
	src: string;
	animeSn: number;
	r18: number;
	vip: boolean;
	time: number;
	login: number;
	promote: unknown[];
}

export interface ErrorToken {
	error: {
		code: number;
		message: string;
		status: string;
		details: unknown[];
	};
}

export interface Segment {
	/** The filename of the ts segment */
	filename: string;
	/** The content of the ts segment */
	content: Promise<ArrayBuffer>;
}

export interface Download {
	/** The meta m3u8 playlist */
	meta: Promise<string>;
	/** The m3u8 playlist */
	playlist: Promise<string>;
	/** The ts segments */
	segments: Segment[];
}

export interface DownloaderContext {
	device?: string;
}
