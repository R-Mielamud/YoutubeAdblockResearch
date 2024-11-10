const isHTMLElement = (node: Node): node is HTMLElement =>
	node.nodeType === Node.ELEMENT_NODE;

const observer = new MutationObserver((mutations) => {
	mutations.forEach((mutation) => {
		mutation.addedNodes.forEach((node) => {
			if (
				isHTMLElement(node) &&
				node.tagName.toLowerCase() === "script"
			) {
				if (node.textContent?.includes("function playerBootstrap()")) {
					node.textContent =
						`
							if (window.ytInitialPlayerResponse) {
								window.ytInitialPlayerResponse.adSlots = [];
								window.ytInitialPlayerResponse.adPlacements = [];
							}
						` + node.textContent;
				}
			}
		});
	});
});

observer.observe(document.documentElement, {
	childList: true,
	subtree: true,
});
