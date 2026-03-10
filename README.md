# Monax

Monax is a Next.js 14 crypto market heatmap app that renders live CoinGecko token market data in a full-screen treemap.

## Requirements

- Node.js 18+
- npm 9+

## Local development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Build

```bash
npm run build
npm run start
```

## Data source

Monax uses live CoinGecko data only:

- `GET /api/markets` (local Next API route)
- Proxies `https://api.coingecko.com/api/v3/coins/markets`
- Auto-refreshes every 60 seconds

## Environment variables

No environment variables are required.
