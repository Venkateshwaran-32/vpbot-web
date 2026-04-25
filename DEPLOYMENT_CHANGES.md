# Deployment Changes

This file tracks the changes made to prepare VPbot for GitHub-to-Netlify deployment.

## Netlify Hosting

- Added `netlify.toml`.
- Configured Netlify to publish the prebuilt mdBook site from:

```text
client/Voice Procedure/book
```

- Configured Netlify Functions to load from:

```text
netlify/functions
```

## Netlify Function Proxy

- Added `netlify/functions/verify.js`.
- The browser now calls:

```text
/.netlify/functions/verify
```

- The Netlify Function forwards quiz verification requests to the local VPbot backend through:

```text
VPBOT_BACKEND_URL
```

- The function sends a shared secret header:

```text
x-vpbot-token
```

## Frontend API URL

- Updated the chatbot source file:

```text
client/Voice Procedure/chatbot.js
```

- Updated the already-built mdBook chatbot asset:

```text
client/Voice Procedure/book/chatbot-32698408.js
```

- The default verification URL changed from:

```text
http://localhost:3000/api/verify
```

to:

```text
/.netlify/functions/verify
```

## Backend Protection

- Updated `server/server.js`.
- Added token checking for:

```text
/api/verify
/api/chat
```

- The backend now reads the token from:

```text
VPBOT_BACKEND_TOKEN
```

- The root health check endpoint remains open:

```text
/
```

## Environment Files

- Added `server/.env.example`.
- Updated `.gitignore` so the real local secret file is not committed:

```text
server/.env
```

## Cleanup

- Removed the empty root `package-lock.json`.
- Left the pre-existing `server/package-lock.json` change untouched.

## Files Added

```text
DEPLOYMENT_CHANGES.md
NETLIFY_DEMO.md
netlify.toml
netlify/functions/verify.js
server/.env.example
```

## Files Modified

```text
.gitignore
client/Voice Procedure/chatbot.js
client/Voice Procedure/book/chatbot-32698408.js
server/server.js
```

## Files Removed

```text
package-lock.json
```

## Verification Run

These checks passed:

```bash
node --check server/server.js
node --check netlify/functions/verify.js
```
