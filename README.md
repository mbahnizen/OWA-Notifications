# OWA Notifications (Modern Redesign)

A Firefox extension that brings **System Notifications** and **Unread Counts** to Outlook Web App (OWA), now with a modern interface and advanced folder monitoring.

## ✨ Key Features

*   **System Notifications**: Get native desktop notifications when new emails arrive, even if the browser is in the background.
*   **Folder Monitoring**: Monitor specific folders only (e.g., "Inbox", "Important", "Tickets") and ignore the rest.
*   **Tag Input System**: Easily add folders to monitor using a modern "chip" interface. Support for bulk copy-paste!
*   **Smart Indicators**:
    *   **Favicon Overlay**: Shows unread count directly on the OWA tab icon.
    *   **Title Update**: Updates tab title (e.g., `(2) Inbox`) for easy checking.
*   **Modern Settings Page**: A clean, card-based designs with toggle switches and instant validation.

## 🚀 Installation

### For Developers / Temporary Usage
1.  Open Firefox and go to `about:debugging`.
2.  Click **This Firefox** in the sidebar.
3.  Click **Load Temporary Add-on...**.
4.  Navigate to the extension folder and select `manifest.json`.

## ⚙️ Configuration

1.  Open the extension **Options** from the `about:addons` page or the toolbar.
2.  **General**:
    *   **Check Frequency**: How often to scan for new emails (default: 60 seconds).
    *   **Monitored Folders**: Type folder names here. Press **Enter** or **Comma** to add them as tags. Paste a comma-separated list to add multiple folders at once!
3.  **Notifications**: Toggle system popups and reminder snoozing.
4.  **Display**: specific settings for Favicon color and Title updates.

## 📁 Monitored Folders Guide

By default, the extension monitors **ALL** folders with unread counts.
To monitor specific folders:
1.  Go to Options.
2.  In "Monitored Folders", type the exact name of the folder (e.g., `Inbox`).
3.  Press Enter.
4.  Add more folders as needed (e.g., `Projects`, `Urgent`).
5.  Click **Save Settings**.

Now, notifications will only trigger for emails in these specific folders!

## 🛠️ Technical Info

*   **Manifest V2**: Built for broad compatibility with Firefox.
*   **Privacy Focused**: Does NOT store credentials. Uses existing OWA session cookies.
*   **Lightweight**: No heavy background processes; uses efficient DOM parsing.

---
*Based on the original OWA Notifier, heavily modified and redesigned by Nizen.*