export const sleep = (timeoutMs: number): Promise<void> =>
	new Promise((resolve) => setTimeout(resolve, timeoutMs));
