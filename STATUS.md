# Creative Assets Agent — STATUS.md

## Project Status: 🟢 FULLY OPERATIONAL — Pipeline Running End-to-End

**Last Updated:** 2026-02-12
**Priority:** HIGH (feeds into ClawBot Command Center + BuildKit revenue)
**GitHub:** https://github.com/kjhholt-alt/creative-assets-agent
**Node Version:** v20.20.0 (NVM installed)

---

## Architecture Complete ✅
- [x] Project structure and directory layout
- [x] TypeScript config + package.json with all dependencies
- [x] Core types (Zod schemas, interfaces, pipeline state)
- [x] Asset profiles (gumroad-product, social-media, landing-page, full-kit, thumbnail-only)
- [x] Theme system (10 themes with colors, fonts, style modifiers, image prompt modifiers)
- [x] Claude service (copy generation, image prompt engineering, SVG generation)
- [x] Replicate service (image gen, upscale, background removal)
- [x] Puppeteer renderer (HTML templates → PNG, frame rendering for GIFs)
- [x] FFmpeg service (GIF creation, MP4 encoding, optimization)
- [x] Gumroad service (listing updates, cover uploads, full publish)
- [x] Main pipeline orchestrator (6-step generation flow with status callbacks)
- [x] ClawBot Gateway agent mode (WebSocket connection, task handling, heartbeat)
- [x] CLI interface (generate, list-themes, list-profiles commands)
- [x] HTML templates (OG image, product card, social square)
- [x] SOUL.md agent personality
- [x] Environment config with lazy validation

## Session 1 Completed ✅
- [x] Extracted zip and organized into proper src/ directory structure
- [x] Created missing utility files (logger.ts, helpers.ts)
- [x] npm install (407 packages)
- [x] Fixed 20 TypeScript errors (pino logger signatures, Gumroad type assertions)
- [x] TypeScript compiles clean (tsc --noEmit = 0 errors)
- [x] CLI works: `npx tsx src/cli.ts --help`, `list-themes`, `list-profiles`
- [x] Upgraded Node.js to v20.20.0 via NVM (required for ESM on Windows)
- [x] Lazy env validation (CLI help works without API keys)
- [x] Git initialized and pushed to GitHub
- [x] Both API keys set in .env (Anthropic + Replicate)

## Session 2 Completed ✅
- [x] Anthropic API credits resolved — Claude copy generation working
- [x] Fixed Replicate aspect ratio bug — invalid ratios (3:1, 2:1) now mapped to closest valid Flux ratio (16:9, 3:2, etc.)
- [x] Fixed Replicate SDK v1.x FileOutput handling — `extractUrl()` method handles all output types (string, URL, FileOutput object)
- [x] Added sequential image generation with 12s delays to respect rate limits
- [x] Installed FFmpeg 8.0.1 via winget — GIF creation now works
- [x] **Full pipeline runs end-to-end: 9 assets, $0.021, ~92 seconds**
- [x] All 3 Replicate images generated successfully (thumbnail, twitter banner, linkedin banner)
- [x] All 3 Puppeteer templates rendered (instagram square, OG image, product card)
- [x] GIF preview created from 12 rendered frames
- [x] All 3 copy files generated (gumroad listing, email announcement, social captions)

## How to Use

### CLI Mode (Manual — Run Yourself)
```bash
cd C:\Users\Kruz\Desktop\Projects\CreativeAgent

# Generate a full Gumroad product kit
npx tsx src/cli.ts generate -p "Product Name" -d "Product description here" -t dark

# Just social media assets
npx tsx src/cli.ts generate -p "Product Name" -d "Description" -t neon --profile social-media

# Just a thumbnail
npx tsx src/cli.ts generate -p "Product Name" -d "Description" -t gradient --profile thumbnail-only

# List available themes
npx tsx src/cli.ts list-themes

# List available profiles
npx tsx src/cli.ts list-profiles
```

Output goes to `./output/{product-slug}/`

### Available Profiles
| Profile | What It Generates |
|---------|-------------------|
| `gumroad-product` (default) | Thumbnail + banners + social + OG + GIF + all copy |
| `social-media` | Twitter + LinkedIn + Instagram banners + captions |
| `landing-page` | Hero image + OG image + product card |
| `full-kit` | Everything above combined |
| `thumbnail-only` | Single Gumroad thumbnail |

### Available Themes
`dark`, `light`, `terminal`, `gradient`, `minimal`, `brutalist`, `retro`, `neon`, `organic`, `custom`

### Agent Mode (ClawBot Integration — Future)
```bash
# Start as a ClawBot agent listening for tasks via WebSocket
npx tsx src/agent-mode.ts
```
When ClawBot Prime sends a `generate_asset_kit` task, this agent picks it up, runs the pipeline, and reports back with the output manifest. This is the automated mode — no CLI needed.

### Environment Setup (After Restart)
1. FFmpeg is installed globally (winget) — should be on PATH after terminal restart
2. Node 20 required:
   ```powershell
   nvm use 20
   # or if NVM needs PATH fix:
   $env:PATH = "C:\nvm4w\nodejs;" + $env:PATH
   ```
3. FFmpeg PATH (if not auto-detected):
   ```powershell
   $env:PATH = "C:\Users\Kruz\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-8.0.1-full_build\bin;" + $env:PATH
   ```

## Known Issues
- **Replicate free tier rate limiting** — Sequential generation with 12s delays works, but adding a payment method on replicate.com would remove this bottleneck entirely and allow parallel generation (~3x faster)
- **NVM PATH not persistent** — After restart, may need `nvm use 20` in a new terminal
- **Node 18 incompatible** — ESM modules crash on Windows with Node 18. Must use Node 20+
- **Product card template** — Renders but is 0 bytes in some runs (HTML template may need content injection fix)

## Next Steps — Implementation Priority

### Phase 1: Get It Running ✅ COMPLETE
- [x] `npm install` and resolve any dependency issues
- [x] Create `.env` with real API keys
- [x] Fix Anthropic API credits
- [x] Fix Replicate image generation (aspect ratios + SDK output handling)
- [x] Test Puppeteer rendering of templates locally
- [x] Install FFmpeg and test GIF creation
- [x] Run first full pipeline end-to-end

### Phase 2: Polish & Templates (Next)
- [ ] Add Replicate payment method for faster parallel image generation
- [ ] Fix product-card template (sometimes renders empty)
- [ ] Add sharp for exact image resizing after Replicate generation
- [ ] Add ZIP packaging to bundle all output assets
- [ ] Create more HTML templates (twitter banner overlay, linkedin banner overlay, preview frames)
- [ ] Write tests for each service
- [ ] Add retry logic with exponential backoff for Replicate API failures

### Phase 3: ClawBot Integration
- [ ] Set up OpenClaw Gateway locally
- [ ] Register Creative Assets Agent as a session
- [ ] Test task dispatch from Prime → Agent → completion report
- [ ] Wire up to Command Center dashboard (agent-mission-control)

### Phase 4: Productize
- [ ] Package as standalone Gumroad product (AI Asset Factory)
- [ ] Create lighter "Gumroad Launch Kit" version
- [ ] List on buildkit.store
- [ ] Create demo video / walkthrough

---

## Cost Tracking

| Item | Cost |
|------|------|
| Replicate (Flux 1.1 Pro) | ~$0.005/image |
| Claude Sonnet (copy gen) | ~$0.003/call |
| Puppeteer | Free (local) |
| FFmpeg | Free (local) |
| **Full gumroad-product kit** | **~$0.02 actual (9 assets)** |

---

## Revenue Potential

| Product | Price | Target |
|---------|-------|--------|
| AI Asset Factory (full tool) | $59-79 | Indie hackers, solopreneurs |
| Gumroad Launch Kit (guide) | $19-29 | Beginners, high volume |
| Custom asset generation (service) | $50-100/kit | Clients who want done-for-you |
