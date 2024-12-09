const path = require("node:path");
const CopyPlugin = require("copy-webpack-plugin");
const TsconfigPathsPlugin = require("tsconfig-paths-webpack-plugin");

module.exports = {
	entry: {
		"service-worker": "./src/service-worker/index.ts",
		"trace-viewer": "./src/trace-viewer/index.ts",
	},
	devtool: false,
	output: {
		filename: "[name]/index.js",
		path: path.resolve(__dirname, "build"),
	},
	module: {
		rules: [
			{
				test: /\.ts$/,
				use: "ts-loader",
				exclude: /node_modules/,
			},
		],
	},
	resolve: {
		extensions: [".ts", ".js"],
		plugins: [new TsconfigPathsPlugin()],
	},
	plugins: [
		new CopyPlugin({
			patterns: [{ from: "./static", to: "./" }],
		}),
	],
};
