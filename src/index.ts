// ============================================
// CREATIVE ASSETS AGENT — Main entry point
// ============================================

import { config, validateConfig } from "./config/env.js";
import { ClaudeService } from "./services/claude-service.js";
import { ReplicateService } from "./services/replicate-service.js";
import { RendererService } from "./services/renderer-service.js";
import { FFmpegService } from "./services/ffmpeg-service.js";
import { GumroadService } from "./services/gumroad-service.js";
import { AssetPipeline } from "./pipelines/asset-pipeline.js";

/**
 * Create a fully configured asset pipeline instance
 */
export function createPipeline(): AssetPipeline {
  validateConfig(); // Fail fast if API keys are missing

  const claude = new ClaudeService({
    apiKey: config.ANTHROPIC_API_KEY,
    model: config.CLAUDE_MODEL,
    maxTokens: 4096,
  });

  const replicate = new ReplicateService({
    apiToken: config.REPLICATE_API_TOKEN,
    imageModel: config.REPLICATE_IMAGE_MODEL,
    upscaleModel: config.REPLICATE_UPSCALE_MODEL,
    maxConcurrent: 3,
  });

  const renderer = new RendererService({
    headless: true,
    defaultViewport: { width: 1920, height: 1080 },
    timeout: 30000,
  });

  const ffmpeg = new FFmpegService({
    framerate: 4,
    quality: 23,
    maxDuration: 10,
  });

  return new AssetPipeline(
    claude,
    replicate,
    renderer,
    ffmpeg,
    config.OUTPUT_DIR
  );
}

/**
 * Create a Gumroad service for publishing
 */
export function createGumroadService(): GumroadService {
  return new GumroadService(config.GUMROAD_ACCESS_TOKEN);
}

// Re-export all types
export * from "./types.js";
export { ClaudeService } from "./services/claude-service.js";
export { ReplicateService } from "./services/replicate-service.js";
export { RendererService } from "./services/renderer-service.js";
export { FFmpegService } from "./services/ffmpeg-service.js";
export { GumroadService } from "./services/gumroad-service.js";
export { AssetPipeline } from "./pipelines/asset-pipeline.js";
