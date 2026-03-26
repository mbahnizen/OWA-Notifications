# OWA Notifications

[![License: MPL 2.0](https://img.shields.io/badge/License-MPL_2.0-brightgreen.svg)](LICENSE)
[![Firefox Add-on](https://img.shields.io/badge/Firefox-Add--on-FF7139?logo=firefox-browser&logoColor=white)](https://addons.mozilla.org/firefox/)
[![No External Requests](https://img.shields.io/badge/Network_Calls-ZERO-blue.svg)](#privacy--security)
[![CI](https://img.shields.io/github/actions/workflow/status/mbahnizen/OWA-Notifications/lint.yml?label=lint)](https://github.com/mbahnizen/OWA-Notifications/actions)

**Smart desktop notifications for Outlook Web App — fully offline, privacy-first.**

---

## The Problem

In many enterprise environments, users access email through **Outlook Web App (OWA)** in a browser — without a desktop email client. OWA does not reliably surface desktop notifications when new emails arrive, especially in pinned or background tabs. This leads to missed emails, delayed responses, and the habit of compulsively checking tabs.

## The Solution

OWA Notifications monitors your OWA tab and delivers **instant desktop notifications** when new emails arrive — with zero network calls, zero data collection, and zero external dependencies. Everything runs locally inside your browser.

---

## ✨ Features

- **🚀 Priority Watchlist** — Mark important folders for instant, cooldown-free alerts
- **🔔 Smart Notifications** — Cooldown system prevents spam from low-priority folders
- **📊 Periodic Summaries** — Recurring unread digest for your watchlist folders
- **🎨 Visual Indicators** — Dynamic tab icon (orange = priority, blue = other) and title badge
- **📅 Calendar Reminders** — Persistent alerts for missed meetings and tasks
- **🔇 Silent Mode** — Mute popups while keeping visual indicators active
- **⚙️ Auto-Scan** — Automatically detects your OWA folders, no manual setup
- **🔒 Zero Network Calls** — No `fetch`, no `XMLHttpRequest`, no external communication whatsoever

---

## 🔐 Privacy & Security

> **This extension does not connect to the internet under any circumstances.**

| Guarantee | Details |
|-----------|---------|
| No network requests | Zero `fetch()`, `XMLHttpRequest`, or WebSocket calls in the entire codebase |
| No data collection | No analytics, no telemetry, no tracking pixels |
| No cloud sync | Settings stored in `browser.storage.local` — never leaves your machine |
| No email reading | The extension reads **folder badge counts** only, never email subjects or bodies |
| No external scripts | Fully self-contained — no CDNs, no third-party libraries |

You can verify this yourself: the entire source code is ~600 lines across 3 JavaScript files.

---

## 🔑 Permissions Explained

Every permission is justified below. We request the **minimum** set required.

| Permission | Why It's Needed | What It Does NOT Do |
|------------|----------------|---------------------|
| `storage` | Saves your settings (watchlist, colors, intervals) to local browser storage | Does NOT sync to any server, does NOT store email data |
| `notifications` | Displays desktop notifications via Firefox's built-in notification API | Does NOT send data externally, does NOT access notification history |
| `tabs` | The settings page queries open tabs to find your OWA tab for folder scanning | Does NOT track your browsing, does NOT read non-OWA tab content |

> **Notably absent**: No `<all_urls>`, no `cookies`, no `webRequest`, no `clipboardRead`, no `history`. The extension **cannot** intercept network traffic, read cookies, or access any site other than OWA.

---

## 🛡️ Security Model

### What the extension CAN access
- DOM elements on pages matching OWA URL patterns (`*/owa/*`, `outlook.office365.com`, etc.)
- Unread count badge numbers displayed in the OWA folder tree
- Firefox's local storage API (for settings persistence)
- Firefox's notification API (for desktop alerts)

### What the extension CANNOT access
- ❌ Email content (subjects, bodies, attachments, recipients)
- ❌ Authentication tokens or session cookies
- ❌ Network traffic or API responses
- ❌ Other browser tabs or websites
- ❌ Filesystem, clipboard, or browser history
- ❌ Any external server or service

### Runtime Detection
The extension uses **DOM-based detection** (`isOWAEnvironment()`) to verify it's running on an actual OWA page before activating. It checks for Outlook-specific elements like folder trees (`[role="treeitem"]`), mail pane IDs, and notification containers — not just URL patterns.

---

## ⚡ How It Works

```
OWA Page (DOM)
    │
    ├── content-script.js reads folder badge counts via CSS selectors
    │   (querySelectorAll on [role="treeitem"], .ucount, etc.)
    │
    ├── Compares counts against previous state
    │
    ├── If count increased → sends message to background.js
    │
    └── background.js → browser.notifications.create()
         (Firefox native notification — no external call)
```

1. **Detection**: Verifies the page is an OWA environment via DOM structure
2. **Monitoring**: Every 1 second, reads unread count badges from the folder tree DOM
3. **Comparison**: Compares current counts against stored state
4. **Notification**: If counts increased, triggers a Firefox desktop notification
5. **Display**: Updates tab favicon and title with the current unread count

### Why 1-Second Polling?

| Concern | Answer |
|---------|--------|
| Why not longer? | Users expect instant notification — 1s ensures near-real-time responsiveness |
| Performance impact? | Each check runs ~5 `querySelectorAll` calls on a small DOM subtree — sub-millisecond |
| Network overhead? | **Zero** — DOM reads only, no HTTP requests |
| Battery impact? | Negligible — no reflows, no repaints, no network activity triggered |

---

## 📦 Installation

### Quick Start (Temporary)

1. Open Firefox → navigate to `about:debugging`
2. Click **This Firefox** → **Load Temporary Add-on**
3. Select `src/manifest.json` from this project

### Permanent Installation

See [INSTALL_GUIDE.md](INSTALL_GUIDE.md) for Mozilla signing and permanent `.xpi` installation.

---

## 🖼️ Screenshots

| View | Preview |
|------|---------|
| Tab with notification | ![Tab active](doc/tab-active.png) |
| Reminder notification | ![Reminder](doc/tab-active-reminder.png) |
| Pinned tab indicator | ![Pinned](doc/tab-pinned.png) |
| Taskbar badge | ![Taskbar](doc/taskbar.png) |
| Settings page | ![Settings](doc/preferences.png) |

---

## ❓ FAQ

**Q: Does it send my email data anywhere?**
A: No. The extension makes **zero network requests**. It only reads unread count numbers from the OWA page DOM. It never reads email subjects, bodies, or recipients.

**Q: Why does it need the `tabs` permission?**
A: The settings page uses `browser.tabs.query()` to find your open OWA tab and scan its folder structure. It only reads tab URLs to match OWA patterns — it does not monitor or track your browsing.

**Q: Why is the check interval fixed at 1 second?**
A: To provide near-real-time notifications. Each check is a lightweight DOM read (no network calls), so the overhead is negligible. A future version may make this configurable.

**Q: Does it work with on-premise Exchange (not Office 365)?**
A: Yes. The URL pattern `*://*/owa/*` matches any on-premise OWA deployment. The extension also performs runtime DOM detection to confirm the page is actually OWA.

**Q: Is it safe for enterprise use?**
A: Yes. No data leaves the browser. No external connections are made. The extension is fully auditable — the entire codebase is ~600 lines of vanilla JavaScript.

---

## 🧱 Compatibility

| Environment | Status |
|-------------|--------|
| On-premise OWA (Exchange 2013+) | ✅ Supported |
| Outlook 365 (outlook.office365.com) | ✅ Supported |
| Outlook.com (outlook.live.com) | ✅ Supported |
| New Outlook (outlook.office.com) | ✅ Supported |
| Firefox 128+ | ✅ Required |
| Outlook Desktop App | ❌ Not applicable (browser extension) |

---

## 🛠️ Development

```bash
# Install dependencies
npm install

# Run with auto-reload
npx web-ext run --source-dir=src/

# Lint (same as CI)
npm run lint

# Build .xpi package
npm run build
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for coding guidelines.

---

## 📄 License

[Mozilla Public License 2.0](LICENSE) — the same license used by Firefox itself.

---

## 👤 Author

**Nizen** — [github.com/mbahnizen](https://github.com/mbahnizen)

Infrastructure engineer focused on secure, privacy-respecting tooling for enterprise environments.

---

## 🙏 Credits

Based on the original [OWA Notifier](https://github.com/mihai-chezan/owa_notifications_firefox_extension) by Mihai Chezan, itself a fork of [OWA Firefox Addon](https://github.com/rockfield/owa_firefox_addon) by Phil Baranovskiy. Heavily redesigned with modern UI, priority monitoring, and security hardening.