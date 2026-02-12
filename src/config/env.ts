// ============================================
// ENV CONFIG — Load and validate environment variables
// ============================================

import { config as dotenvConfig } from "dotenv";
dotenvConfig();

function required(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}. Copy .env.example to .env and fill in your keys.`);
  }
  return value;
}

function lazyRequired(key: string): string {
  // Returns empty string at import time, throws when actually accessed for API calls
  return process.env[key] || "";
}

function optional(key: string, defaultValue: string): string {
  return process.env[key] || defaultValue;
}

/**
 * Validate that all required API keys are set (call before running pipeline)
 */
export function validateConfig(): void {
  const missing: string[] = [];
  if (!config.ANTHROPIC_API_KEY) missing.push("ANTHROPIC_API_KEY");
  if (!config.REPLICATE_API_TOKEN) missing.push("REPLICATE_API_TOKEN");
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}.\nCopy .env.example to .env and fill in your API keys.`
    );
  }
}

export const config = {
  // AI
  ANTHROPIC_API_KEY: lazyRequired("ANTHROPIC_API_KEY"),
  CLAUDE_MODEL: optional("CLAUDE_MODEL", "claude-sonnet-4-20250514"),

  // Image Generation
  REPLICATE_API_TOKEN: lazyRequired("REPLICATE_API_TOKEN"),
  REPLICATE_IMAGE_MODEL: optional(
    "REPLICATE_IMAGE_MODEL",
    "black-forest-labs/flux-1.1-pro"
  ),
  REPLICATE_UPSCALE_MODEL: optional(
    "REPLICATE_UPSCALE_MODEL",
    "nightmareai/real-esrgan:42fed1c4974146d4d2414e2be2c5277c7fcf05fcc3a73abf41610695738c1d7b"
  ),

  // Gumroad
  GUMROAD_ACCESS_TOKEN: optional("GUMROAD_ACCESS_TOKEN", ""),

  // ClawBot Gateway
  GATEWAY_WS_URL: optional("GATEWAY_WS_URL", "ws://127.0.0.1:18789"),
  AGENT_SESSION_ID: optional("AGENT_SESSION_ID", "creative-assets"),
  AGENT_NAME: optional("AGENT_NAME", "Creative Assets Agent"),

  // Output
  OUTPUT_DIR: optional("OUTPUT_DIR", "./output"),
  TEMP_DIR: optional("TEMP_DIR", "./tmp"),
  LOG_LEVEL: optional("LOG_LEVEL", "info"),

  // Notifications
  TELEGRAM_BOT_TOKEN: optional("TELEGRAM_BOT_TOKEN", ""),
  TELEGRAM_CHAT_ID: optional("TELEGRAM_CHAT_ID", ""),
  DISCORD_WEBHOOK_URL: optional("DISCORD_WEBHOOK_URL", ""),
};
