import { defineConfig } from "tsup";

export default defineConfig(() => ({
	entry: ["src/index.ts"],
	outDir: "dist",
	target: "node20",
	format: ["esm"],
	shims: true,
	clean: true,
	splitting: false,
	dts: false,
}));
