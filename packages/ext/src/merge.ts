import type { Download } from "baha-anime-dl";
import ffmpeg from "fluent-ffmpeg";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { log } from "./log";

/**
 * Merges the downloaded segments into a single MP4 file using FFmpeg.
 * @param download The Download object containing the playlist and segments to merge.
 * @returns The merged MP4 file as an ArrayBuffer.
 */
export async function merge(download: Download): Promise<ArrayBuffer> {
	const playlist = await download.playlist;

	const tmpdir = fs.mkdtempSync(
		path.join(
			os.tmpdir(),
			`baha-anime-dl-${Date.now()}-${Math.random().toString(36).slice(2)}`,
		),
	);
	log(`tmpdir: ${tmpdir}`);

	const playlist_path = path.join(tmpdir, "playlist.m3u8");
	fs.writeFileSync(playlist_path, playlist);

	await Promise.all(
		download.segments.map((segment) =>
			segment.content.then((content) => {
				const segment_path = path.join(tmpdir, segment.filename);
				fs.writeFileSync(segment_path, Buffer.from(content));
			}),
		),
	);
	log("all segments downloaded, start merging");

	const output_path = path.join(tmpdir, "output.mp4");

	const command = ffmpeg({
		cwd: tmpdir,
	})
		.addInput(playlist_path)
		.addOption("-c", "copy")
		.addOption("-bsf:a", "aac_adtstoasc")
		.addOption("-movflags", "faststart")
		.addOption("-y")
		.outputFormat("mp4")
		.output(output_path);
	log(`ffmpeg command: ${command._getArguments().join(" ")}`);

	await new Promise<void>((resolve, reject) => {
		command.on("end", resolve);
		command.on("error", reject);
		command.run();
	});
	log("merge finished");

	const output = fs.readFileSync(output_path);
	fs.rmSync(tmpdir, { recursive: true });

	log("output file size", output.byteLength);
	return output.buffer;
}
