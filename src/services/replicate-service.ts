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
   * Generate images for all prompts, respecting concurrency limits
   */
  async generateImages(
    prompts: GeneratedImagePrompt[],
    outputDir: string
  ): Promise<GeneratedImage[]> {
    logger.info(`Generating ${prompts.length} images via Replicate`);
    const results: GeneratedImage[] = [];

    // Process in batches to respect rate limits
    const batches = this.chunk(prompts, this.maxConcurrent);

    for (const batch of batches) {
      const batchResults = await Promise.allSettled(
        batch.map((prompt) => this.generateSingleImage(prompt, outputDir))
      );

      for (const result of batchResults) {
        if (result.status === "fulfilled") {
          results.push(result.value);
        } else {
          logger.error(`Image generation failed: ${result.reason}`);
        }
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
      const output = await this.client.run(this.imageModel as `${string}/${string}`, {
        input: {
          prompt: prompt.prompt,
          negative_prompt: prompt.negative_prompt,
          aspect_ratio: prompt.aspect_ratio,
          guidance_scale: prompt.guidance_scale,
          num_outputs: 1,
          output_format: "png",
          output_quality: 95,
        },
      });

      // Replicate returns a URL or array of URLs
      const imageUrl = Array.isArray(output) ? output[0] : output;

      if (typeof imageUrl !== "string") {
        throw new Error(`Unexpected Replicate output type: ${typeof imageUrl}`);
      }

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

    const imageUrl = Array.isArray(output) ? output[0] : output;

    if (typeof imageUrl !== "string") {
      throw new Error("Upscale failed: unexpected output");
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

    const imageUrl = Array.isArray(output) ? output[0] : output;

    if (typeof imageUrl !== "string") {
      throw new Error("Background removal failed: unexpected output");
    }

    const response = await fetch(imageUrl);
    const buffer = Buffer.from(await response.arrayBuffer());
    await writeFile(outputPath, buffer);

    return outputPath;
  }

  private chunk<T>(arr: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < arr.length; i += size) {
      chunks.push(arr.slice(i, i + size));
    }
    return chunks;
  }
}
