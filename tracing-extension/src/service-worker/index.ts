import { ChromeExtensionCDPSession } from "./cdp-session";
import { TargetWorker } from "./target-worker";
import { ManualTraceHandler } from "./trace-handler";

const workers = new Map<number, TargetWorker>();
const traceViewer = new ManualTraceHandler();

const startTabWorker = (id: number) => {
	const worker = new TargetWorker(
		new ChromeExtensionCDPSession(id),
		traceViewer
	);

	workers.set(id, worker);
	worker.start();
};

const stopTabWorker = (id: number) => {
	workers.get(id)?.stop();
	workers.delete(id);
};

chrome.tabs.onRemoved.addListener((id) => stopTabWorker(id));

chrome.action.onClicked.addListener(({ id }) => {
	if (id === undefined) {
		return;
	}

	if (workers.has(id)) {
		stopTabWorker(id);
	} else {
		startTabWorker(id);
	}
});
