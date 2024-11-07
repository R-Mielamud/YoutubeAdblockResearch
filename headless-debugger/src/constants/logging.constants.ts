import path from "node:path";

export const BACKUP_RESULT_LOG_PATH = path.resolve(
	process.cwd(),
	"./backup-result.log"
);

export const INFO_LOG_PATH = path.resolve(process.cwd(), "./info.log");
export const TCP_LOG_PORT_RANGE = [8000, 8003] as const;
export const DEFAULT_TCP_LOGGING_RETRY_DELAY_MS = 10000;
