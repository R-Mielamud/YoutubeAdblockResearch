import readline from "node:readline/promises";
import * as puppeteer from "puppeteer";
import { loggingConstants } from "@/constants";
import { PuppeteerCDPSession } from "@/puppeteer-cdp";
import { StreamingLogger } from "@/streaming-logger";
import { TargetWorker } from "@/target-worker";

const VIDEO_ID = "pJwpSVAfej0";
const PLAYER_BASE_SCRIPT_REGEX = "player_ias\\.vflset\\/.*?\\/base\\.js";

// Line and column are zero-based

const START_BREAKPOINTS: CDP.Debugger.SetBreakpointByURL.Params[] = [
	{
		urlRegex: PLAYER_BASE_SCRIPT_REGEX,
		lineNumber: 9222,
		columnNumber: 31,
	},
	{
		urlRegex: PLAYER_BASE_SCRIPT_REGEX,
		lineNumber: 9882,
		columnNumber: 18,
	},
	{
		urlRegex: PLAYER_BASE_SCRIPT_REGEX,
		lineNumber: 9886,
		columnNumber: 18,
	},
	{
		urlRegex: PLAYER_BASE_SCRIPT_REGEX,
		lineNumber: 9890,
		columnNumber: 18,
	},
];

const FINISH_BREAKPOINTS: CDP.Debugger.SetBreakpointByURL.Params[] = [
	{
		urlRegex: PLAYER_BASE_SCRIPT_REGEX,
		lineNumber: 9229,
		columnNumber: 21,
	},
	{
		urlRegex: PLAYER_BASE_SCRIPT_REGEX,
		lineNumber: 9883,
		columnNumber: 18,
	},
	{
		urlRegex: PLAYER_BASE_SCRIPT_REGEX,
		lineNumber: 9887,
		columnNumber: 18,
	},
	{
		urlRegex: PLAYER_BASE_SCRIPT_REGEX,
		lineNumber: 9891,
		columnNumber: 18,
	},
];

const initializeYoutube = async (browser: puppeteer.Browser) => {
	const page = await browser.newPage();

	await page.setViewport({ width: 1920, height: 1080 });

	await page.goto("https://youtube.com", {
		waitUntil: "domcontentloaded",
	});

	const cookieButtonSelector = `ytd-consent-bump-v2-lightbox .eom-button-row:first-child ytd-button-renderer:first-child button`;

	try {
		await page.waitForSelector(cookieButtonSelector, {
			timeout: 8000,
		});

		await page.click(cookieButtonSelector);

		await page.waitForSelector(cookieButtonSelector, {
			hidden: true,
		});
	} catch {
		// no cookie alert detected, do nothing
	}

	return page;
};

const main = async () => {
	const scanner = readline.createInterface({
		input: process.stdin,
		output: process.stdout,
	});

	const logger = new StreamingLogger({
		infoLogPath: loggingConstants.INFO_LOG_PATH,
		backupResultLogPath: loggingConstants.BACKUP_RESULT_LOG_PATH,
		tcpPortRange: loggingConstants.TCP_LOG_PORT_RANGE,
	});

	const browser = await puppeteer.launch({
		args: ["--autoplay-policy=no-user-gesture-required", "--no-sandbox"],
	});

	const videoPage = await initializeYoutube(browser);

	const videoUrl = `https://youtube.com/watch?v=${encodeURIComponent(
		VIDEO_ID
	)}`;

	const cdpSession = new PuppeteerCDPSession(
		await videoPage.createCDPSession()
	);

	await scanner.question("Press return to start ");

	const workEnd = await new TargetWorker(cdpSession, logger).start(
		START_BREAKPOINTS,
		FINISH_BREAKPOINTS
	);

	await videoPage.goto(videoUrl, { waitUntil: [] });
	await workEnd.promise;
	await logger.close();
	await videoPage.close();
	await browser.close();
};

main();
