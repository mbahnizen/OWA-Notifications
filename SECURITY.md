# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in this extension, please report it responsibly.

### How to Report

1. **Do NOT open a public GitHub issue** for security vulnerabilities
2. Send an email to: **[belajar.nizen@gmail.com]**
   — or —
   Use [GitHub Security Advisories](https://github.com/mbahnizen/OWA-Notifications/security/advisories/new) to report privately

### What to Include

- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

### Response Timeline

| Action | Timeframe |
|--------|-----------|
| Acknowledgment | Within 48 hours |
| Initial assessment | Within 7 days |
| Fix release | Within 30 days of confirmation |

## Security Design Principles

This extension follows strict security principles:

1. **Zero network calls** — The extension never makes HTTP requests, WebSocket connections, or any form of external communication
2. **No dynamic code execution** — No `eval()`, `new Function()`, or `innerHTML` with user data
3. **Minimal permissions** — Only `storage`, `notifications`, and `tabs` are requested
4. **Local-only data** — All settings stored via `browser.storage.local`, never synced externally
5. **Content Script isolation** — Runs only on OWA-pattern URLs, verified by DOM detection at runtime
6. **No third-party dependencies** — Pure vanilla JavaScript, no external libraries or CDNs

## Supported Versions

| Version | Supported |
|---------|-----------|
| 2.0.x   | ✅ Active |
| < 2.0   | ❌ End of life |

## Scope

The following are **in scope** for security reports:
- Data leaks (email content, folder names, credentials)
- Cross-site scripting (XSS) via DOM manipulation
- Privilege escalation beyond declared permissions
- Unintended network requests
- Information disclosure via browser console logging

The following are **out of scope**:
- Issues requiring physical access to the user's machine
- Social engineering attacks
- Vulnerabilities in Firefox itself
- Denial of service via CPU usage (1-second polling is by design)
