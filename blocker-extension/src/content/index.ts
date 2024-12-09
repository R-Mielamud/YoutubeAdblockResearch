const isHTMLElement = (node: Node): node is HTMLElement =>
	node.nodeType === Node.ELEMENT_NODE;

const overrideScript = `
const __modifyJsonResponse = (json) => {
	if (typeof json !== "object" || json === null) {
		return json;
	}

	json = { ...json };

	if (json.adSlots) {
		json.adSlots = [];
	}

	if (json.adPlacements) {
		json.adPlacements = [];
	}

	return json;
};

const __modifyTextResponse = (text) => {
	try {
		return JSON.stringify(__modifyJsonResponse(JSON.parse(text)));
	} catch {
		return text;
	}
};

const __modifyBlobResponse = async (blob) => {
	try {
		return new Blob([__modifyTextResponse(await blob.text())]);
	} catch {
		return blob;
	}
};

const __modifyArrayBufferResponse = (buffer) => {
	try {
		const decoder = new TextDecoder();
		const encoder = new TextEncoder();
		const text = decoder.decode(new Uint8Array(arrayBuffer));
		const modifiedText = __modifyTextResponse(text);
		const modifiedBuffer = encoder.encode(modifiedText).buffer;

		return modifiedBuffer;
	} catch {
		return buffer;
	}
};

const __oldFetch = window.fetch;

window.fetch = async (urlOrRequest, ...args) => {
	const response = await __oldFetch(urlOrRequest, ...args);
	const url = typeof urlOrRequest === "string" ? urlOrRequest : urlOrRequest.url;
	const urlObject = new URL(url);

	if (
		urlObject.pathname.endsWith("/ad_break") ||
		urlObject.pathname.endsWith("/player")
	) {
		console.log("[YT adblock] intercepted a fetch to", urlObject.pathname);

		const oldJson = response.json.bind(response);
		const oldText = response.text.bind(response);
		const oldBlob = response.blob.bind(response);
		const oldArrayBuffer = response.arrayBuffer.bind(response);

		response.json = async () => __modifyJsonResponse(await oldJson());
		response.text = async () => __modifyTextResponse(await oldText());
		response.blob = async () => __modifyBlobResponse(await oldBlob());

		response.arrayBuffer = async () =>
			__modifyArrayBufferResponse(await oldArrayBuffer());
	}

	return response;
};
`;

const ytInitialPlayerResponseOverride = `
if (window.ytInitialPlayerResponse) {
	console.log("[YT adblock] intercepted ytInitialPlayerResponse");

	window.ytInitialPlayerResponse = __modifyJsonResponse(
		window.ytInitialPlayerResponse
	);
}

`;

let didInjectOverrideScript = false;

const observer = new MutationObserver((mutations) => {
	mutations.forEach((mutation) => {
		mutation.addedNodes.forEach((node) => {
			if (
				isHTMLElement(node) &&
				node.tagName.toLowerCase() === "script" &&
				typeof node.textContent === "string"
			) {
				if (!didInjectOverrideScript) {
					node.textContent = overrideScript + node.textContent;

					console.log(
						"[YT adblock] injected override utilities & fetch override"
					);

					didInjectOverrideScript = true;
				}

				if (node.textContent.includes("function playerBootstrap()")) {
					node.textContent =
						ytInitialPlayerResponseOverride + node.textContent;

					console.log(
						"[YT adblock] injected ytInitialPlayerResponse override"
					);
				}
			}
		});
	});
});

observer.observe(document.documentElement, {
	childList: true,
	subtree: true,
});
