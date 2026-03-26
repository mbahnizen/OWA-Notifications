# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2026-03-26

### Added
- **Priority Watchlist**: Monitor specific folders with instant, cooldown-free notifications
- **Auto-Scan**: Automatically detects OWA folders from the active tab
- **Periodic Summaries**: Recurring unread digest for watchlist folders
- **Notification Cooldown**: Configurable cooldown for non-priority folder notifications
- **Silent Mode**: Mute all popups while keeping tab icon and title updated
- **Color-coded Tab Icon**: Orange for watchlist folders, blue for others
- **Modern Settings UI**: Redesigned options page with autosave, tag input, and folder chips
- **OWA Runtime Detection**: `isOWAEnvironment()` verifies DOM structure before activating
- **Universal OWA Support**: Works with on-premise Exchange, Office 365, and Outlook.com

### Fixed
- Removed hardcoded internal/company URL from manifest (security fix)
- Implemented missing `extractNumber()` and `getCountFromNodes()` functions (crash fix)
- Standardized add-on ID across manifest.json and updates.json
- Removed duplicate `DOMContentLoaded` handlers and function definitions in options.js

### Security
- Replaced all `console.log` with gated `log()` behind `DEBUG = false` flag
- Replaced all `innerHTML` usage with safe DOM APIs (`textContent`, `createElement`)
- Added `safeQueryAll()` wrapper to prevent crashes from invalid user CSS selectors
- Moved all DOM queries inside `DOMContentLoaded` for execution safety
- Added `SECURITY.md` with responsible disclosure policy
- Removed personal file paths and internal URLs from documentation

### Documentation
- Professional README with permissions table, security model, and FAQ
- English INSTALL_GUIDE with troubleshooting section
- CONTRIBUTING.md with security coding rules
- This CHANGELOG

## [1.0.0] - Original

### Added
- Basic OWA unread email notifications
- Favicon and document title updates
- Configurable check intervals and CSS selectors

### Credits
- Original extension by [Mihai Chezan](https://github.com/mihai-chezan/owa_notifications_firefox_extension)
- Forked from [Phil Baranovskiy](https://github.com/rockfield/owa_firefox_addon)
