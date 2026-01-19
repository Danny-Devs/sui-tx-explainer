# Sui Transaction Explainer

AI-powered transaction understanding for the Sui blockchain. Paste any transaction hash and get a human-readable explanation.

**Live Demo**: [sui-tx-explainer-two.vercel.app](https://sui-tx-explainer-two.vercel.app)

## Features

- **AI-Powered Explanations**: Uses Groq's Llama 3.3 70B for fast, natural language summaries
- **Three Depth Levels**: ELI5, Normal, and Technical explanations
- **Meet Dewey**: Friendly water droplet mascot who reacts to transactions
- **Network Support**: Toggle between Mainnet and Testnet
- **URL Support**: Paste transaction hashes or Suiscan/Suivision links
- **Streaming Responses**: Real-time SSE streaming for instant feedback

## Why This Exists

Every existing Sui explorer shows *what* data changed. None explain *what it means*.

**What SuiVision shows:**
```
TransferObjects:
Object: 0xee496a0cc04d06a345982ba6697c90c619020de9e274408c7819f787ff66e1a1::suifrens::SuiFren<...>
From: 0x1a2b3c4d5e6f7890...
To: 0x9876543210fedcba...
```

**What we show:**
```
"Danny sent a SuiFren NFT (Capy #4521) to his friend!
This transfer cost 0.015 SUI in gas - pretty affordable!"
```

## Architecture

```
sui-tx-explainer/
├── app/
│   ├── pages/index.vue          # Main UI with transaction input
│   └── composables/
│       ├── useSuiClient.ts      # Sui SDK wrapper
│       └── useExplainer.ts      # LLM client with SSE streaming
└── server/
    └── api/
        └── explain.post.ts      # Server route (protects API key)
```

### Data Flow

1. User pastes transaction hash or explorer URL
2. `useSuiClient` fetches transaction from Sui RPC
3. Parsed transaction data sent to `/api/explain`
4. Server builds structured prompt and streams Groq response
5. UI displays explanation with reactive mascot

## Setup

### Prerequisites

- Node.js 18+
- pnpm
- Groq API key (FREE at [console.groq.com](https://console.groq.com/))

### Installation

```bash
# Clone the repo
git clone https://github.com/Danny-Devs/sui-tx-explainer.git
cd sui-tx-explainer

# Install dependencies
pnpm install

# Copy environment template
cp .env.example .env

# Add your Groq API key to .env
# GROQ_API_KEY=gsk_xxx
```

### Development

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000)

### Production Build

```bash
pnpm build
pnpm preview
```

## Deployment (Vercel)

1. Fork/clone this repo
2. Import project in Vercel
3. Add environment variable: `GROQ_API_KEY`
4. Deploy

The app auto-detects Vercel and uses the optimized Nitro preset.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Nuxt 4 |
| UI | Nuxt UI + Tailwind CSS |
| Blockchain | @mysten/sui SDK |
| AI | Groq API (Llama 3.3 70B) |
| Streaming | Server-Sent Events (SSE) |
| Package Manager | pnpm |

## API Costs

**Groq's free tier includes:**
- 30 requests/minute
- Llama 3.3 70B model
- ~43,000 free explanations per day

No credit card required.

## Security

- API keys are server-side only (never exposed to client)
- Rate limiting: 10 requests/minute per IP
- Input validation on all user data
- Security headers configured (XSS, clickjacking protection)

## Contributing

1. Fork the repo
2. Create a feature branch
3. Make your changes
4. Submit a PR

## License

MIT

---

Built by [Danny](https://dannydevs.com) as part of the Sui ecosystem.
