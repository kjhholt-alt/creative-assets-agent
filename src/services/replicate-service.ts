// ============================================
// REPLICATE SERVICE — Image generation, upscaling, background removal
// ============================================

import Replicate from "replicate";
import { writeFile } from "fs/promises";
import { join } from "path";
import type {
  GeneratedImagePrompt,
  ReplicateServiceConfig,
} from "../types.js";
import { logger } from "../utils/logger.js";

export interface GeneratedImage {
  asset_id: string;
  filepath: string;
  width: number;
  height: number;
  cost_usd: number;
}

export class ReplicateService {
  // Valid aspect ratios for Flux 1.1 Pro
  private static VALID_RATIOS = [
    "1:1", "16:9", "9:16", "3:2", "2:3", "4:5", "5:4", "3:4", "4:3",
  ] as const;

  // Map of ratio value to label for nearest-match lookup
  private static RATIO_VALUES: Record<string, number> = {
    "1:1": 1,
    "16:9": 16 / 9,
    "9:16": 9 / 16,
    "3:2": 3 / 2,
    "2:3": 2 / 3,
    "4:5": 4 / 5,
    "5:4": 5 / 4,
    "3:4": 3 / 4,
    "4:3": 4 / 3,
  };
  private client: Replicate;
  private imageModel: string;
  private upscaleModel: string;
  private maxConcurrent: number;

  constructor(config: ReplicateServiceConfig) {
    this.client = new Replicate({ auth: config.apiToken });
    this.imageModel = config.imageModel;
    this.upscaleModel = config.upscaleModel;
    this.maxConcurrent = config.maxConcurrent;
  }

  /**
   * Map an arbitrary aspect ratio string to the closest valid Flux ratio
   */
  private static toValidRatio(ratio: string): string {
    // If already valid, return as-is
    if ((ReplicateService.VALID_RATIOS as readonly string[]).includes(ratio)) {
      return ratio;
    }

    // Parse the ratio string (e.g. "3:1" -> 3.0)
    const parts = ratio.split(":");
    if (parts.length !== 2) return "16:9"; // fallback
    const value = parseFloat(parts[0]) / parseFloat(parts[1]);

    // Find the closest valid ratio by numeric distance
    let closest = "16:9";
    let minDist = Infinity;
    for (const [label, val] of Object.entries(ReplicateService.RATIO_VALUES)) {
      const dist = Math.abs(value - val);
      if (dist < minDist) {
        minDist = dist;
        closest = label;
      }
    }

    logger.info(`Mapped aspect ratio "${ratio}" → "${closest}"`);
    return closest;
  }

  /**
   * Generate images for all prompts, processing sequentially with delays to respect rate limits
   */
  async generateImages(
    prompts: GeneratedImagePrompt[],
    outputDir: string
  ): Promise<GeneratedImage[]> {
    logger.info(`Generating ${prompts.length} images via Replicate`);
    const results: GeneratedImage[] = [];

    // Process sequentially with delay to avoid rate limiting
    for (let i = 0; i < prompts.length; i++) {
      try {
        const result = await this.generateSingleImage(prompts[i], outputDir);
        results.push(result);
      } catch (err) {
        logger.error(`Image generation failed: ${err}`);
      }

      // Wait 12s between requests to respect free-tier rate limits (6/min, burst of 1)
      if (i < prompts.length - 1) {
        logger.info("Waiting 12s before next image request (rate limit)...");
        await new Promise((r) => setTimeout(r, 12000));
      }
    }

    return results;
  }

  /**
   * Generate a single image from a prompt
   */
  private async generateSingleImage(
    prompt: GeneratedImagePrompt,
    outputDir: string
  ): Promise<GeneratedImage> {
    logger.info(`Generating image: ${prompt.asset_id}`);
    const startTime = Date.now();

    try {
      const validRatio = ReplicateService.toValidRatio(prompt.aspect_ratio);
      const output = await this.client.run(this.imageModel as `${string}/${string}`, {
        input: {
          prompt: prompt.prompt,
          negative_prompt: prompt.negative_prompt,
          aspect_ratio: validRatio,
          guidance_scale: prompt.guidance_scale,
          num_outputs: 1,
          output_format: "png",
          output_quality: 95,
        },
      });

      // Replicate SDK v1.x returns FileOutput objects — extract the URL
      const raw = Array.isArray(output) ? output[0] : output;
      const imageUrl = this.extractUrl(raw);

      if (!imageUrl) {
        throw new Error(`Could not extract URL from Replicate output (type: ${typeof raw})`);
      }

      logger.info(`Image URL extracted: ${imageUrl.slice(0, 80)}...`);

      // Download the image
      const response = await fetch(imageUrl);
      const buffer = Buffer.from(await response.arrayBuffer());
      const filepath = join(outputDir, `${prompt.asset_id}.png`);
      await writeFile(filepath, buffer);

      const elapsed = (Date.now() - startTime) / 1000;
      logger.info(
        `Generated ${prompt.asset_id} in ${elapsed.toFixed(1)}s`
      );

      // Estimated cost based on Replicate's Flux pricing
      const estimatedCost = 0.005;

      return {
        asset_id: prompt.asset_id,
        filepath,
        width: 0, // Will be updated by sharp
        height: 0,
        cost_usd: estimatedCost,
      };
    } catch (err) {
      logger.error({ err }, `Failed to generate ${prompt.asset_id}`);
      throw err;
    }
  }

  /**
   * Upscale an image using Real-ESRGAN
   */
  async upscaleImage(
    inputPath: string,
    outputPath: string,
    scale: number = 4
  ): Promise<string> {
    logger.info(`Upscaling: ${inputPath} (${scale}x)`);

    const output = await this.client.run(this.upscaleModel as `${string}/${string}`, {
      input: {
        image: inputPath,
        scale,
        face_enhance: false,
      },
    });

    const raw = Array.isArray(output) ? output[0] : output;
    const imageUrl = this.extractUrl(raw);

    if (!imageUrl) {
      throw new Error("Upscale failed: could not extract URL from output");
    }

    const response = await fetch(imageUrl);
    const buffer = Buffer.from(await response.arrayBuffer());
    await writeFile(outputPath, buffer);

    return outputPath;
  }

  /**
   * Remove background from an image
   */
  async removeBackground(
    inputPath: string,
    outputPath: string
  ): Promise<string> {
    logger.info(`Removing background: ${inputPath}`);

    const output = await this.client.run(
      "cjwbw/rembg:fb8af171cfa1616ddcf1242c093f9c46bcada5ad4cf6f2fbe8b81b330ec5c003",
      {
        input: {
          image: inputPath,
        },
      }
    );

    const raw = Array.isArray(output) ? output[0] : output;
    const imageUrl = this.extractUrl(raw);

    if (!imageUrl) {
      throw new Error("Background removal failed: could not extract URL from output");
    }

    const response = await fetch(imageUrl);
    const buffer = Buffer.from(await response.arrayBuffer());
    await writeFile(outputPath, buffer);

    return outputPath;
  }

  /**
   * Extract a URL string from Replicate SDK output.
   * The SDK v1.x returns FileOutput objects (ReadableStream subclass) instead of plain strings.
   */
  private extractUrl(raw: unknown): string | null {
    if (!raw) return null;

    // Plain string URL
    if (typeof raw === "string") return raw;

    // URL object
    if (raw instanceof URL) return raw.href;

    // FileOutput or object with url/href properties
    if (typeof raw === "object") {
      const obj = raw as Record<string, any>;

      // FileOutput.url is a URL object
      if (obj.url instanceof URL) return obj.url.href;
      if (typeof obj.url === "string") return obj.url;
      if (typeof obj.href === "string") return obj.href;
    }

    // FileOutput.toString() returns the URL — force string coercion
    const str = "" + raw;
    if (str.startsWith("http")) return str;

    return null;
  }

  private chunk<T>(arr: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < arr.length; i += size) {
      chunks.push(arr.slice(i, i + size));
    }
    return chunks;
  }
}
