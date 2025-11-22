# SMS Gateway TypeScript API

## Deploy on Render:

1. Push the `sms-gateway-project` folder (or just `ts-api` if you split repos) to GitHub.
   - If deploying the whole monorepo, you might need to configure Render to use `ts-api` as the root directory.
2. On Render: New → Web Service
3. Connect repo.
4. **Root Directory**: `ts-api` (Important if in a monorepo)
5. **Environment**: Node
6. **Build Command**: `npm install && npm run build`
7. **Start Command**: `npm start`
8. Deploy!

## Endpoints:

- `GET /health` - Health check
- `POST /queue-sms` - Queue SMS (from Google Sheets)
- `GET /get-next-sms` - Get next pending SMS (from Android)
- `POST /mark-sent` - Mark SMS as sent (from Android)
- `GET /queue-status` - Queue status (debug)
- `POST /clear-queue` - Clear queue (test)

## Local Development:

```bash
cd ts-api
npm install
npm run dev
```
