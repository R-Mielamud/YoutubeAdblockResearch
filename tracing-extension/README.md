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

-   Go to any page
-   Click the puzzle icon on the right of the browser search bar
-   Click YouTube Adblock Tracing
-   Wait a couple of seconds
-   Perform the action you want to record (preferably in under 11 s)
-   Wait a couple of seconds
-   Click YouTube Adblock Tracing again
-   A new tab titled 'Trace Viewer' will be opened
-   Hover the timeline to see the screenshots
-   Click to set the start of a range you are interested in
-   Click again to set the end
-   Press Esc to cancel the range after the first click to cancel the range
-   Press Backspace to remove the latest added range
-   Click the Submit button to confirm
-   The function calls captured in the selected ranges and their counts will be output to DevTools with the message `strikes`
