import { defineConfig, type Plugin } from "vitest/config";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

function mdTextLoader(): Plugin {
	return {
		name: "md-text-loader",
		transform(_code: string, id: string) {
			if (!id.endsWith(".md")) return undefined;
			return `export default ${JSON.stringify(fs.readFileSync(id, "utf8"))}`;
		},
	};
}

export default defineConfig({
	plugins: [mdTextLoader()],
	test: {
		environment: "jsdom",
		coverage: {
			provider: "v8",
			include: ["src/**/*.ts"],
			exclude: ["src/main.ts"],
			thresholds: {
				lines: 80,
				functions: 80,
				branches: 80,
				statements: 80,
			},
		},
	},
	resolve: {
		alias: {
			obsidian: path.resolve(__dirname, "__mocks__/obsidian.ts"),
		},
	},
});
