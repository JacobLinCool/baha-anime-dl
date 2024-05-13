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
		.demandCommand(1).argv;

	const sn = parseInt(argv._[0].toString());
	if (isNaN(sn)) {
		console.error("Invalid serial number");
		process.exit(1);
	}

	const output = argv.output || `${sn}.mp4`;

	console.log(`Downloading media with serial number ${sn} to ${output}`);

	const config = {
		...default_config(),
		fetcher: build({
			headers: {
				"User-Agent": "Mozilla/5.0 Baha LowRes Anime Downloader",
			},
			cookies: argv.cookie
				? Object.fromEntries(argv.cookie.map((c) => c.toString().split("=", 2)))
				: {},
		}),
	};

	const downloader = new Downloader(config);
	const download = downloader.download(sn);
	const merged = await merge(download);

	const dir = path.dirname(output);
	if (!fs.existsSync(dir)) {
		fs.mkdirSync(dir, { recursive: true });
	}
	fs.writeFileSync(output, Buffer.from(merged));
}
