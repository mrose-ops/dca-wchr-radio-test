# DCA Operations Radio - GitHub Pages

Upload the contents of this folder to a GitHub repository and enable GitHub Pages.

This hosts the phone/dispatcher radio screen over HTTPS.

## Important
GitHub Pages does **not** relay audio and does **not** replace TURN.
The architecture is:

GitHub Pages -> radio web page
Google Apps Script -> signaling
Managed TURN -> voice relay when configured

Open the Pages URL on each device, select Agent / Supervisor / Dispatcher,
enter the radio name, station access code, and Google Apps Script /exec URL.

The browser will request microphone access on first use.
