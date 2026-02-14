# OWA Notifications (Modern Redesign)

A robust Firefox extension that transforms your Outlook Web App (OWA) experience with **Smart Notifications**, **Folder Monitoring**, and **Periodic Reminders**.

## ✨ Key Features

### 🚀 Priority Monitoring
*   **Watchlist Folders**: Add specific folders (e.g., "Inbox", "IT Support", "Boss") to your **Watchlist**.
*   **Instant Alerts**: Emails in Watchlist folders trigger **IMMEDIATE** notifications, bypassing any cooldowns.
*   **Unique Visuals**: Watchlist folders turn the tab icon **Orange**, while regular folders use Blue.

### 🧠 Smart Features
*   **Seamless Auto-Scan**: Automatically detects all your email folders in the background. No manual entry needed!
*   **Autosave**: Settings are saved automatically as you type or click. No more "Save" buttons.
*   **Smart Periodic Summary**:
    *   *Empty Watchlist* = Feature Disabled (Zero noise).
    *   *Active Watchlist* = Automatically enables a **5-minute recurring summary** of unread items in your important folders.

### 🔔 Advanced Notifications
*   **Notification Cooldown**: Prevents spam from non-critical folders (e.g., "Newsletters") by limiting popups to once every 60s.
*   **Calendar Reminders**: Persistent reminders for missed meetings or tasks.
*   **Silent Mode**: Toggle to mute all popups while keeping the tab title and icon updated.

## ⚙️ How to Use

1.  **Open Options**: Click the extension icon or go to `about:addons`.
2.  **Build Your Watchlist**:
    *   The extension automatically scans your folders.
    *   Click on any **Detected Folder** to add it to your Watchlist.
    *   OR type a folder name manually and press Enter.
3.  **Customize**:
    *   Adjust **Check Frequency** (fixed to 1s for real-time updates).
    *   Set **Periodic Unread Summary** interval (default: 5m).
    *   Pick your preferred **Icon Color**.

## 🛠️ Installation (Developer Mode)

1.  Open Firefox and go to `about:debugging`.
2.  Click **This Firefox** in the sidebar.
3.  Click **Load Temporary Add-on...**.
4.  Select the `manifest.json` file from the `src` directory.

---
*Based on the original OWA Notifier, heavily modified and redesigned by Nizen.*