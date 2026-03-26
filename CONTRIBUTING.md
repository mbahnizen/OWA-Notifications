# Contributing to OWA Notifications

Thank you for considering contributing! This project is designed for security-conscious users, so all contributions must meet strict quality standards.

## Getting Started

### Prerequisites

- Firefox 128+
- Node.js 18+ (for linting and building)
- Git

### Setup

```bash
git clone https://github.com/mbahnizen/OWA-Notifications.git
cd OWA-Notifications
npm install
```

### Run Locally

```bash
# Launch Firefox with the extension loaded (auto-reloads on file changes)
npx web-ext run --source-dir=src/
```

### Lint

```bash
npm run lint
```

### Build

```bash
npm run build
```

## Project Structure

```
OWA-Notifications/
├── src/                        # Extension source (this is the add-on root)
│   ├── manifest.json           # Extension manifest
│   ├── background.js           # Background script (notification display)
│   ├── content-script.js       # Content script (DOM monitoring, OWA detection)
│   ├── options.html            # Settings page markup
│   ├── options.js              # Settings page logic
│   ├── options.css             # Settings page styles
│   ├── icon.png                # Extension icon (48px)
│   ├── email-alert.png         # Notification icon (email)
│   ├── calendar-alert.png      # Notification icon (calendar)
│   └── chat-alert.png          # Notification icon (chat)
├── doc/                        # Screenshots and documentation assets
├── .github/workflows/          # CI pipeline
├── SECURITY.md                 # Security policy
├── CONTRIBUTING.md             # This file
├── CHANGELOG.md                # Version history
├── LICENSE                     # MPL-2.0
└── README.md                   # Project documentation
```

## Coding Guidelines

### Security Rules (Non-Negotiable)

These rules exist to maintain trust with enterprise users. Violating them will block your PR.

| Rule | Reason |
|------|--------|
| **No `console.log`** | Use the `log()` function gated behind `DEBUG = false` |
| **No `innerHTML`** with dynamic content | Use `textContent`, `createElement`, `createTextNode` |
| **No `eval()` or `new Function()`** | Prevents code injection |
| **No `fetch()` or `XMLHttpRequest`** | The extension must make zero network calls |
| **No external libraries or CDNs** | Must remain fully self-contained |
| **No new permissions** without discussion | Every permission must be justified in an issue first |

### Code Style

- Use `"use strict";` at the top of every JS file
- Use `const` / `let`, never `var`
- Wrap `querySelectorAll` with user-provided selectors in `try/catch` (use `safeQueryAll()`)
- All DOM access should happen inside `DOMContentLoaded` or after confirmed page load
- Keep functions small and single-purpose

### Naming

- Files: `kebab-case.js`
- Functions: `camelCase`
- Constants: `UPPER_SNAKE_CASE` (only for true constants like config keys)

## Pull Request Guidelines

1. **One concern per PR** — Don't mix unrelated changes
2. **Update CHANGELOG.md** for any user-facing change
3. **Run `npm run lint`** before submitting — CI will reject unlinted code
4. **Test manually** with a live OWA/Outlook tab
5. **Explain the "why"** in your PR description, not just the "what"

## Reporting Bugs

Open a [GitHub Issue](https://github.com/mbahnizen/OWA-Notifications/issues) with:

- Firefox version
- OWA type (on-premise Exchange, Office 365, Outlook.com)
- Steps to reproduce
- Expected vs actual behavior
- Browser console errors (if any)

## Security Vulnerabilities

**Do NOT open a public issue.** See [SECURITY.md](SECURITY.md) for responsible disclosure instructions.
