# 🎨 Creative Assets Agent

**A ClawBot specialist agent that generates complete marketing asset kits on demand.**

Part of the [Agent Mission Control](https://github.com/kjhholt-alt/agent-mission-control) ecosystem. Triggered by ClawBot Prime, this agent takes a product name + description and outputs production-ready marketing assets — thumbnails, banners, GIFs, copy, and more.

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   CLAWBOT PRIME                         │
│              (Chief Orchestrator)                       │
│                                                         │
│  "generate launch assets for AI Prompt Templates v2"    │
└──────────────────────┬──────────────────────────────────┘
                       │ sessions_send (JSON task)
                       ▼
┌─────────────────────────────────────────────────────────┐
│              CREATIVE ASSETS AGENT                      │
│                                                         │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │  Orchestrator │  │  Asset Queue  │  │  Review Queue │  │
│  │  Pipeline     │  │  Manager      │  │  & Approval   │  │
│  └──────┬────────┘  └──────┬───────┘  └──────┬────────┘  │
│         │                  │                  │           │
│  ┌──────▼──────────────────▼──────────────────▼────────┐ │
│  │              SERVICE LAYER                          │ │
│  │                                                     │ │
│  │  ┌───────────┐ ┌────────────┐ ┌──────────────────┐  │ │
│  │  │ Claude API│ │ Replicate  │ │ Puppeteer/       │  │ │
│  │  │ Service   │ │ Service    │ │ Playwright       │  │ │
│  │  │           │ │            │ │ Renderer         │  │ │
│  │  │ • Copy    │ │ • Flux/SDXL│ │ • HTML → PNG     │  │ │
│  │  │ • Prompts │ │ • Upscale  │ │ • Component Shot │  │ │
│  │  │ • SVGs    │ │ • BG Remove│ │ • PDF Export     │  │ │
│  │  └───────────┘ └────────────┘ └──────────────────┘  │ │
│  │                                                     │ │
│  │  ┌───────────┐ ┌────────────┐ ┌──────────────────┐  │ │
│  │  │ FFmpeg    │ │ Gumroad    │ │ GitHub           │  │ │
│  │  │ Service   │ │ API        │ │ Integration      │  │ │
│  │  │           │ │            │ │                  │  │ │
│  │  │ • GIF Gen │ │ • Upload   │ │ • Asset Storage  │  │ │
│  │  │ • Video   │ │ • Listings │ │ • Version Control│  │ │
│  │  │ • Resize  │ │ • Covers   │ │ • PR Creation    │  │ │
│  │  └───────────┘ └────────────┘ └──────────────────┘  │ │
│  └─────────────────────────────────────────────────────┘ │
│                                                         │
│  ┌─────────────────────────────────────────────────────┐ │
│  │              OUTPUT                                 │ │
│  │                                                     │ │
│  │  📦 /output/{product-slug}/                         │ │
│  │  ├── thumbnail-1280x720.png                         │ │
│  │  ├── banner-twitter-1500x500.png                    │ │
│  │  ├── banner-linkedin-1200x627.png                   │ │
│  │  ├── banner-instagram-1080x1080.png                 │ │
│  │  ├── og-image-1200x630.png                          │ │
│  │  ├── preview.gif                                    │ │
│  │  ├── gumroad-listing.md                             │ │
│  │  ├── email-announcement.md                          │ │
│  │  ├── social-captions.md                             │ │
│  │  └── asset-manifest.json                            │ │
│  └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

---

## Quick Start

```bash
# Clone into your agent workspaces
cd ~/agent-workspaces
git clone https://github.com/kjhholt-alt/creative-assets-agent.git
cd creative-assets-agent

# Install dependencies
npm install

# Copy environment config
cp .env.example .env
# Fill in: ANTHROPIC_API_KEY, REPLICATE_API_TOKEN, GUMROAD_ACCESS_TOKEN

# Run a test generation
npm run generate -- --product "AI Prompt Templates" --description "50 battle-tested prompts for developers" --theme dark

# Start in agent mode (listens for ClawBot Prime commands)
npm run agent
```

---

## Stack

| Layer | Tool | Purpose |
|-------|------|---------|
| Brain | Claude API (claude-sonnet-4-20250514) | Copy, prompts, SVGs, orchestration |
| Image Gen | Replicate API (Flux 1.1 Pro) | Thumbnails, banners, hero images |
| Rendering | Puppeteer | HTML templates → PNG screenshots |
| Animation | FFmpeg | Frame stitching → GIF/MP4 |
| Upscale | Replicate (Real-ESRGAN) | 4x upscale for print/retina |
| Distribution | Gumroad API | Auto-upload covers + update listings |
| Storage | Local FS + GitHub | Version-controlled asset history |

---

## Configuration

See `src/config/asset-profiles.ts` for predefined output profiles:

- `gumroad-product` — Full Gumroad launch kit
- `social-media` — Platform-optimized social banners only
- `landing-page` — Hero images + OG images for web
- `full-kit` — Everything combined

---

## ClawBot Integration

This agent registers as a specialist in the ClawBot Gateway. Prime dispatches tasks using the standardized message protocol:

```json
{
  "from": "prime",
  "to": "creative-assets",
  "type": "task_assignment",
  "priority": "high",
  "payload": {
    "task": "generate_asset_kit",
    "product_name": "AI Prompt Templates v2",
    "product_description": "50 battle-tested prompts for developers building with Claude",
    "profile": "gumroad-product",
    "theme": "dark",
    "brand": "buildkit"
  },
  "expect_reply": true,
  "timeout_minutes": 15
}
```

---

## Productization

This tool is also available as a standalone product on [buildkit.store](https://buildkit.store):

- **AI Asset Factory** ($59-79) — Self-hosted, config-driven asset generation
- **Gumroad Launch Kit** ($19-29) — Prompt templates + guide (lighter version)
