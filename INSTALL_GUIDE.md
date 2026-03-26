# Installation Guide

## Prerequisites

- **Firefox** version 128.0 or later
- An active **Outlook Web App (OWA)** or **Outlook 365** account accessible in your browser

## Method 1: Temporary Installation (Development / Testing)

1. Open Firefox and navigate to `about:debugging`
2. Click **This Firefox** in the sidebar
3. Click **Load Temporary Add-on...**
4. Navigate to the `src/` directory of this project
5. Select the `manifest.json` file

> **Note**: Temporary add-ons are removed when Firefox is closed. This method is ideal for testing.

## Method 2: Permanent Installation (Signed .xpi)

Firefox requires add-ons to be signed by Mozilla for permanent installation.

### Step 1: Create a ZIP package

1. Navigate **inside** the `src/` directory
2. Select **all files** (`manifest.json`, `background.js`, `content-script.js`, `options.html`, `options.js`, `options.css`, icons, etc.)
3. Compress them into a ZIP file (e.g., `owa-notifications.zip`)

> **Important**: The `manifest.json` must be at the **root** of the ZIP file. Do not zip the `src/` folder itself from outside — zip its *contents*.

### Step 2: Submit to Mozilla Add-on Developer Hub

1. Go to the [Mozilla Add-on Developer Hub](https://addons.mozilla.org/en-US/developers/)
2. Sign in with your Firefox Account (or create one)
3. Click **Submit a New Add-on**
4. Choose **On your own** (self-hosted distribution)
5. Upload the ZIP file
6. Wait for automated validation. If it passes, click **Sign Add-on**

### Step 3: Download and Install

1. After signing, Mozilla provides a download link for the `.xpi` file
2. Download the `.xpi` file
3. Drag and drop it into a Firefox window
4. Click **Add** when prompted

The extension is now permanently installed.

## Alternative: Firefox Developer Edition / Nightly

If you use **Firefox Developer Edition** or **Firefox Nightly**, you can bypass signing:

1. Navigate to `about:config`
2. Search for `xpinstall.signatures.required`
3. Set it to `false`
4. You can now install unsigned `.xpi` or `.zip` files directly

> **Warning**: Disabling signature verification reduces security and is not recommended for general use.

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Extension doesn't activate | Make sure you have an OWA/Outlook tab open and are logged in |
| No notifications appearing | Check Firefox notification permissions (Settings → Privacy & Security → Notifications) |
| Folder scan returns empty | Navigate to the Mail view in OWA so the folder tree is visible |
| Extension removed after restart | You are using temporary mode — follow Method 2 for permanent installation |

## Using with `web-ext` (Developer Workflow)

If you have Node.js installed, you can use Mozilla's `web-ext` tool:

```bash
npm install -g web-ext
cd src/
web-ext run
```

This launches Firefox with the extension loaded and provides live-reload during development.
