import { ILog, ILogger } from "@/abstract";
import { loggingConstants } from "@/constants";
import { FileLog } from "./file-log";
import { TcpLog } from "./tcp-log";

export class StreamingLogger implements ILogger {
	#tcpRetryDelayMs;
	#infoLog: ILog;
	#backupResultLog: ILog;
	#tcpLogs: TcpLog[];
	#intermediateResultCounter = 0;
	#nextTcpLogIndex = 0;
	#useBackupResultLog = false;
	#nextTcpLoggingRetryTime = 0;

	public constructor({
		infoLogPath,
		backupResultLogPath,
		tcpPortRange,
		tcpRetryDelayMs = loggingConstants.DEFAULT_TCP_LOGGING_RETRY_DELAY_MS,
	}: {
		infoLogPath: string;
		backupResultLogPath: string;
		tcpPortRange: readonly [number, number];
		tcpRetryDelayMs?: number;
	}) {
		this.#tcpRetryDelayMs = tcpRetryDelayMs;
		this.#infoLog = new FileLog(infoLogPath);
		this.#backupResultLog = new FileLog(backupResultLogPath);
		this.#tcpLogs = [];

		for (let port = tcpPortRange[0]; port <= tcpPortRange[1]; port++) {
			this.#tcpLogs.push(new TcpLog(port, this.#infoLog));
		}
	}

	public logInfoMessage(message: string): void {
		this.#infoLog.log(message);
	}

	public logIntermediateResult(data: any): void {
		const stringified = `${
			this.#intermediateResultCounter
		} ${JSON.stringify(data)}`;

		this.#intermediateResultCounter++;
		this.#getResultLog().log(stringified);
	}

	public async close(): Promise<void> {
		await Promise.all(this.#tcpLogs.map((log) => log.close()));
		await this.#backupResultLog.close();
		await this.#infoLog.close();
	}

	#getResultLog(): ILog {
		if (
			this.#useBackupResultLog &&
			performance.now() < this.#nextTcpLoggingRetryTime
		) {
			return this.#backupResultLog;
		}

		this.#useBackupResultLog = false;

		for (let attempt = 0; attempt < this.#tcpLogs.length; attempt++) {
			const tcpLog: TcpLog = this.#tcpLogs[
				this.#nextTcpLogIndex
			] as TcpLog;

			this.#nextTcpLogIndex =
				(this.#nextTcpLogIndex + 1) % this.#tcpLogs.length;

			if (tcpLog.isConnected) {
				return tcpLog;
			}
		}

		this.#infoLog.log("All TCP logs INOP, switching to backup result log");
		this.#useBackupResultLog = true;

		this.#nextTcpLoggingRetryTime =
			performance.now() + this.#tcpRetryDelayMs;

		return this.#backupResultLog;
	}
}
