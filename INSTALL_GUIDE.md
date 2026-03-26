# Installation Guide

## 🚀 Install from Firefox Add-ons (Recommended)

Users can install the extension directly from the official Mozilla Add-ons page:

[OWA Notifications on Firefox Add-ons](https://addons.mozilla.org/en-US/firefox/addon/owa-notifications-by-mbahnizen/?utm_source=addons.mozilla.org&utm_medium=referral&utm_content=search)

**Steps:**
1. Open the link above in Firefox
2. Click **"Add to Firefox"**
3. Confirm installation

That's it — the extension is ready to use!

---

## 🛠 Troubleshooting

| Issue | Solution |
|-------|----------|
| Extension doesn't activate | Make sure you have an OWA/Outlook tab open and are logged in |
| No notifications appearing | Check Firefox notification permissions (Settings → Privacy & Security → Notifications) |
| Folder scan returns empty | Navigate to the Mail view in OWA so the folder tree is visible |

---

## 🧪 Development / Testing (Optional)

These steps are intended for developers contributing to the extension or testing local changes.

### Method 1: Temporary Installation (`about:debugging`)

1. Open Firefox and navigate to `about:debugging`
2. Click **This Firefox** in the sidebar
3. Click **Load Temporary Add-on...**
4. Navigate to the `src/` directory of this project
5. Select the `manifest.json` file

> **Note**: Temporary add-ons are removed when Firefox is closed.

### Method 2: Using `web-ext`

If you have Node.js installed, you can use Mozilla's `web-ext` tool for live-reload development:

```bash
npm install
npm run start
# (Runs: web-ext run --source-dir=src/)
```
