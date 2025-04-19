import type { Download } from "baha-anime-dl";
import ffmpeg from "fluent-ffmpeg";
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { log } from "./log";

/**
 * Merges the downloaded segments into a single MP4 file using FFmpeg.
 * @param download The Download object containing the playlist and segments to merge.
 * @param onProgress Optional callback for progress updates (0-100).
 * @returns The merged MP4 file as an ArrayBuffer.
 */
export async function merge(
	download: Download,
	onProgress?: (progress: number) => void,
): Promise<ArrayBuffer> {
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

	const totalSegments = download.segments.length;
	let completedSegments = 0;

	await Promise.all(
		download.segments.map((segment) =>
			segment.content.then((content) => {
				const segment_path = path.join(tmpdir, segment.filename);
				fs.writeFileSync(segment_path, new Uint8Array(content));
				completedSegments++;

				// Report download progress (0-50%)
				if (onProgress) {
					const downloadProgress = Math.floor((completedSegments / totalSegments) * 50);
					onProgress(downloadProgress);
				}
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
		const args = command._getArguments();
		const ff = spawn("ffmpeg", args);
		ff.stdout.on("data", (data) => log(data.toString().trim()));

		// Track FFmpeg progress from stderr output
		ff.stderr.on("data", (data) => {
			const output = data.toString().trim();
			log(output);

			// Try to extract progress information
			if (onProgress && output.includes("time=")) {
				try {
					const timeMatch = output.match(/time=(\d+):(\d+):(\d+)\.\d+/);
					if (timeMatch) {
						const [, hours, minutes, seconds] = timeMatch;
						const currentTime =
							parseInt(hours) * 3600 + parseInt(minutes) * 60 + parseInt(seconds);

						// We consider FFmpeg progress as 50-95% of the total progress
						const mergeProgress = 50 + Math.min(45, Math.floor((currentTime / 3) * 5)); // Approximate scaling
						onProgress(mergeProgress);
					}
				} catch (err) {
					// Ignore parsing errors
				}
			}
		});

		ff.on("error", reject);
		ff.on("exit", (code) => {
			if (code === 0) {
				// Signal completion of FFmpeg process
				if (onProgress) {
					onProgress(95);
				}
				resolve();
			} else {
				reject(new Error(`FFmpeg process exited with code ${code}`));
			}
		});
	});
	log("merge finished");

	const output = fs.readFileSync(output_path);
	fs.rmSync(tmpdir, { recursive: true });

	// Signal complete process
	if (onProgress) {
		onProgress(100);
	}

	log("output file size", output.byteLength);
	return output.buffer as ArrayBuffer;
}
