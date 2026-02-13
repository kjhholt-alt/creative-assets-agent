// ============================================
// CLAUDE SERVICE — Copy generation, prompt engineering, SVG creation
// ============================================

import Anthropic from "@anthropic-ai/sdk";
import type {
  AssetRequest,
  GeneratedCopy,
  GeneratedImagePrompt,
  AssetSpec,
  ClaudeServiceConfig,
} from "../types.js";
import type { ThemeConfig } from "../config/themes.js";
import { logger } from "../utils/logger.js";

export class ClaudeService {
  private client: Anthropic;
  private model: string;
  private maxTokens: number;

  constructor(config: ClaudeServiceConfig) {
    this.client = new Anthropic({ apiKey: config.apiKey });
    this.model = config.model;
    this.maxTokens = config.maxTokens;
  }

  /**
   * Generate all marketing copy for a product in one shot
   */
  async generateCopy(
    request: AssetRequest,
    theme: ThemeConfig
  ): Promise<GeneratedCopy> {
    logger.info(`Generating copy for: ${request.product_name}`);

    const systemPrompt = `You are a world-class product copywriter specializing in digital products and developer tools. 
You write punchy, benefit-driven copy that converts. Never use fluff, clichés, or generic marketing speak.
Your copy is specific, concrete, and makes the reader feel like they NEED this product.

Brand voice: ${request.brand === "buildkit" ? "Technical but approachable. Confident without being arrogant. Think Stripe's documentation meets indie hacker energy." : "Professional and clear."}

Target audience: ${request.target_audience || "Developers, indie hackers, and technical creators"}`;

    const userPrompt = `Generate a complete marketing copy kit for this product:

PRODUCT: ${request.product_name}
DESCRIPTION: ${request.product_description}
THEME/VIBE: ${theme.name}
TAGS: ${request.tags?.join(", ") || "none specified"}

Return ONLY valid JSON with this exact structure (no markdown, no backticks):
{
  "gumroad_title": "Product title (max 80 chars, include a power word)",
  "gumroad_description": "2-3 paragraph product description for the Gumroad listing. First paragraph is the hook. Second is features/benefits. Third is social proof or urgency.",
  "gumroad_bullet_points": ["Bullet 1 — benefit focused", "Bullet 2", "Bullet 3", "Bullet 4", "Bullet 5"],
  "email_subject": "Email subject line (A/B test worthy, max 60 chars)",
  "email_body": "Full email announcement (3-4 paragraphs, casual but professional)",
  "twitter_caption": "Twitter post (max 280 chars, include a hook + CTA)",
  "linkedin_caption": "LinkedIn post (2-3 paragraphs, more professional tone, include emojis sparingly)",
  "instagram_caption": "Instagram caption (punchy, use line breaks, 3-5 relevant hashtags at end)",
  "og_title": "Open Graph title (max 60 chars)",
  "og_description": "Open Graph description (max 155 chars)",
  "tagline": "One-line tagline (max 10 words)",
  "call_to_action": "CTA button text (max 4 words)"
}`;

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: this.maxTokens,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";
    const cleaned = text.replace(/```json|```/g, "").trim();

    try {
      return JSON.parse(cleaned) as GeneratedCopy;
    } catch (err) {
      logger.error({ text }, "Failed to parse Claude copy response");
      throw new Error(`Copy generation failed: invalid JSON response`);
    }
  }

  /**
   * Generate optimized image prompts for each asset that needs Replicate
   */
  async generateImagePrompts(
    request: AssetRequest,
    theme: ThemeConfig,
    assets: AssetSpec[]
  ): Promise<GeneratedImagePrompt[]> {
    logger.info(
      `Generating image prompts for ${assets.length} assets`
    );

    const replicateAssets = assets.filter((a) => a.method === "replicate");
    if (replicateAssets.length === 0) return [];

    const systemPrompt = `You are an expert at writing prompts for Flux and Stable Diffusion image generation models.
You understand how to write prompts that produce professional, polished results suitable for product marketing.
Your prompts are specific about composition, lighting, style, and mood. You NEVER write vague prompts.`;

    const assetDescriptions = replicateAssets
      .map(
        (a) =>
          `- ${a.id}: ${a.description} (${a.width}x${a.height}, aspect ${a.width / Math.min(a.width, a.height)}:${a.height / Math.min(a.width, a.height)})`
      )
      .join("\n");

    const userPrompt = `Generate image prompts for these marketing assets:

PRODUCT: ${request.product_name}
DESCRIPTION: ${request.product_description}
VISUAL THEME: ${theme.name}
THEME MODIFIERS: ${theme.imagePromptModifiers}
BRAND: ${request.brand}

ASSETS NEEDED:
${assetDescriptions}

Return ONLY valid JSON array (no markdown, no backticks):
[
  {
    "asset_id": "the-asset-id",
    "prompt": "Detailed generation prompt, be very specific about composition, colors, lighting, style. Include the theme modifiers naturally. DO NOT include any text/words in the image — we add text via templates.",
    "negative_prompt": "blurry, low quality, text, watermark, logo, words, letters, distorted",
    "aspect_ratio": "MUST be one of: 1:1, 16:9, 9:16, 3:2, 2:3, 4:5, 5:4, 3:4, 4:3. Pick the closest match to the asset dimensions.",
    "guidance_scale": 7.5
  }
]`;

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: this.maxTokens,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";
    const cleaned = text.replace(/```json|```/g, "").trim();

    try {
      return JSON.parse(cleaned) as GeneratedImagePrompt[];
    } catch (err) {
      logger.error({ text }, "Failed to parse Claude image prompt response");
      throw new Error(`Image prompt generation failed: invalid JSON response`);
    }
  }

  /**
   * Generate an SVG illustration (for icons, diagrams, simple graphics)
   */
  async generateSVG(
    description: string,
    width: number,
    height: number,
    theme: ThemeConfig
  ): Promise<string> {
    logger.info(`Generating SVG: ${description}`);

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: this.maxTokens,
      system:
        "You are an SVG artist. Generate clean, production-quality SVG code. Return ONLY the SVG markup, nothing else.",
      messages: [
        {
          role: "user",
          content: `Create an SVG illustration (${width}x${height}):
Description: ${description}
Colors: primary=${theme.colors.primary}, secondary=${theme.colors.secondary}, accent=${theme.colors.accent}, bg=${theme.colors.background}
Style: ${theme.name} aesthetic

Return ONLY the <svg>...</svg> markup.`,
        },
      ],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";
    const svgMatch = text.match(/<svg[\s\S]*?<\/svg>/);

    if (!svgMatch) {
      throw new Error("Claude did not return valid SVG markup");
    }

    return svgMatch[0];
  }
}
