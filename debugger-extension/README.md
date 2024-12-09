# Tracing extension

**Prerequisites:**

-   Install Node.js 22
-   Install packages: `npm install`

**Build:**

-   Development mode: `npm run build`
-   Production mode: `npm run build:prod`
-   Development mode with live updates: `npm run watch`

**Adding to Chrome:**

-   Go to `chrome://extensions`
-   Enable `Developer Mode`
-   Build the extension
-   Click `Load unpacked extension` and select the `./build` folder
-   To apply changes after a rebuild, go to `chrome://extensions` and click the reload button on the extension card

**Usage:**

-   Put the needed finish location into the `finishLocation` variable in `./src/service-worker/index.ts`
-   Build the extension and reload it in Chrome
-   Open the service worker DevTools
-   Go to the tab you want to debug
-   Open the DevTools and set a breakpoint at the start location
-   Click the puzzle icon on the right of the browser search bar
-   Click YouTube Adblock Debugger
-   The automation will take over as soon as the start breakpoint is hit. DO NOT leave the DevTools open on the target page, or Chrome will run out of memory!
-   The output will be in the service worker DevTools
-   To stop the debugging, click YouTube Adblock Debugger again
