import { Downloader, default_config } from "baha-anime-dl";
import { build, merge } from "baha-anime-dl-ext";
import fs from "node:fs";
import path from "node:path";
import { hideBin } from "yargs/helpers";
import yargs from "yargs/yargs";

main();

async function main() {
	const argv = await yargs(hideBin(process.argv))
		.command("<sn>", "Download media with the given serial number or ID", (yargs) => {
			yargs.positional("sn", {
				type: "string",
				describe: "The serial number or ID of the media to download",
			});
		})
		.option("output", {
			alias: "o",
			type: "string",
			describe: "Output path for the downloaded media",
		})
		.option("cookie", {
			alias: "c",
			type: "array",
			describe: "Cookie to be set. This will be set to the cookie jar at the beginning.",
		})
		.option("headers", {
			alias: "H",
			type: "array",
			describe: "Headers to be set. This will be set to the request at the beginning.",
		})
		.option("continue-dir", {
			type: "string",
			describe: "Directory with existing segment files to continue a previous download",
		})
		.demandCommand(1).argv;

	const sn = parseInt(argv._[0].toString());
	if (isNaN(sn)) {
		console.error("Invalid serial number");
		process.exit(1);
	}

	const output = argv.output || `${sn}.mp4`;

	console.log(`Downloading media with serial number ${sn} to ${output}`);

	if (argv["continue-dir"]) {
		console.log(`Continuing download from directory: ${argv["continue-dir"]}`);
		// Verify if the directory exists
		if (!fs.existsSync(argv["continue-dir"])) {
			console.warn(`Warning: Continue directory ${argv["continue-dir"]} does not exist.`);
		}
	}

	const config = {
		...default_config(),
		fetcher: build({
			headers: {
				"User-Agent": "Mozilla/5.0 Baha LowRes Anime Downloader",
				...(argv.headers
					? Object.fromEntries(argv.headers.map((h) => h.toString().split(":", 2)))
					: {}),
			},
			cookies: argv.cookie
				? Object.fromEntries(argv.cookie.map((c) => c.toString().split("=", 2)))
				: {},
		}),
		retries: 10,
		continueDir: argv["continue-dir"] || null,
	};

	const downloader = new Downloader(config);
	const download = downloader.download(sn);

	// Set up progress tracking
	let lastProgress = -1;
	const updateProgress = (progress: number) => {
		// Only update when progress changes by at least 1%
		if (Math.floor(progress) > lastProgress) {
			lastProgress = Math.floor(progress);
			// Clear the current line and write the progress
			process.stdout.write(`\r\x1b[K[${lastProgress}%] Downloading and processing...`);
		}
	};

	// Start the merge process with progress reporting
	const merged = await merge(download, updateProgress);

	// Final progress update and newline
	process.stdout.write(`\r\x1b[K[100%] Download complete.\n`);

	const dir = path.dirname(output);
	if (!fs.existsSync(dir)) {
		fs.mkdirSync(dir, { recursive: true });
	}
	fs.writeFileSync(output, new Uint8Array(merged));

	console.log(`Saved to ${output}`);
}
