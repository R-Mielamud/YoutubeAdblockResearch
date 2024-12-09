# Adblock extension

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
-   To apply changes after a rebuild, go to `chrome://extensions` and click the reload button on the extension card.

**Usage:**

-   Go to any YouTube video
-   There should be no ads
