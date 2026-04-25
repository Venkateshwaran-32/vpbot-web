# VPbot Netlify Demo Runbook

This demo uses Netlify for the website and your laptop for Gemma.

## 1. Local secret

Create `server/.env` and set the same token you will add to Netlify:

```text
VPBOT_BACKEND_TOKEN=replace-this-with-a-long-random-secret
```

## 2. Start LM Studio

Open LM Studio, load the Gemma model, and start the local server.

## 3. Start VPbot backend

```bash
cd /Users/taknev/Desktop/vpbot-web/server
npm start
```

Leave this terminal running.

## 4. Start ngrok

In a second terminal:

```bash
ngrok http 3000
```

Copy the HTTPS forwarding URL, for example:

```text
https://abc123.ngrok-free.app
```

## 5. Set Netlify environment variables

In Netlify, add these environment variables:

```text
VPBOT_BACKEND_URL=https://abc123.ngrok-free.app
VPBOT_BACKEND_TOKEN=the-same-token-from-server-dot-env
```

## 6. Deploy and test

Deploy the site to Netlify, open the Netlify URL, choose a quiz question, submit an answer, and check that Gemma returns feedback.

If you restart ngrok and get a new URL, update `VPBOT_BACKEND_URL` in Netlify and redeploy.
