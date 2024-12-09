# Puppeteer driver

**Prerequisites:**

-   Install Node.js 22
-   Install packages: `npm install`

**Development start:**

-   `npm run dev`

**Production start:**

-   Build (once): `npm run build`
-   Run the build: `npm start`

**Usage:**

-   Edit the start breakpoints, end breakpoints and the target video id in `./src/index.ts`
-   Start the HTTP proxy server on the local computer. The `:9000` endpoint should be available to Chromium (i.e. use an SSH tunnel if running on a remote server).
-   Build (optional)
-   Start
-   TCP loggers will be listening on ports `8000`, `8001`, `8002` and `8003`. Connect TCP clients to as many of them as possible.
-   The information log will be at `./info.log`.
-   If at least one TCP logger is available, the messages will be split evenly between them.
-   If all TCP loggers disconnect, the backup result log will be at `./backup-result.log` and a message will be logged to the information log. Reconnect TCP loggers as soon as possible. An attempt to switch back to TCP will be made every 10 seconds.
-   When ready to start debugging, send a newline to the script after the prompt `Press return to start`.
-   To forcefully stop debugging, send a SIGKILL to the process or press Ctrl+D until puppeteer stops.
