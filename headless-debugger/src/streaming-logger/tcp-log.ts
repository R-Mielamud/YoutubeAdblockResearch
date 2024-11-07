import net from "node:net";
import { ILog } from "@/abstract";

export class TcpLog implements ILog {
	#server: net.Server;
	#receiverSocket: net.Socket | null = null;

	public constructor(port: number, infoLog: ILog) {
		this.#server = net.createServer((socket) => {
			if (this.#receiverSocket) {
				socket.destroy();
				infoLog.log(`TCP log ${port}: dropped second client`);

				return;
			}

			socket.on("error", (err) => {
				this.#receiverSocket = null;
				infoLog.log(`TCP log ${port}: client error: ${err}`);
			});

			socket.on("close", () => {
				this.#receiverSocket = null;
				infoLog.log(`TCP log ${port}: client closed`);
			});

			this.#receiverSocket = socket;
			infoLog.log(`TCP log ${port}: ready`);
		});

		this.#server.on("error", (err) => {
			this.#receiverSocket = null;
			infoLog.log(`TCP log ${port}: INOP (server error: ${err})`);
		});

		this.#server.on("close", () => {
			this.#receiverSocket = null;
			infoLog.log(`TCP log ${port}: INOP (server closed)`);
		});

		this.#server.listen(port, "0.0.0.0", () => {
			infoLog.log(`TCP log ${port}: initialized`);
		});
	}

	public get isConnected() {
		return Boolean(this.#receiverSocket);
	}

	public log(message: string): void {
		this.#receiverSocket?.write(this.#formatMessage(message));
	}

	public close(): Promise<void> {
		return new Promise((resolve) => {
			if (this.#receiverSocket && !this.#receiverSocket.closed) {
				this.#receiverSocket.destroy();
			}

			this.#server.close(() => resolve());
		});
	}

	#formatMessage(message: string): string {
		return `[${new Date().toISOString()}] ${message}\n`;
	}
}
