// ============================================
// ASSET PIPELINE — Main orchestrator that coordinates all services
// ============================================

import { mkdir, writeFile, stat } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";
import type {
  AssetRequest,
  PipelineState,
  PipelineStatus,
  AssetManifest,
  ManifestAsset,
  AssetSpec,
  PipelineError,
} from "../types.js";
import { getProfileAssets } from "../config/asset-profiles.js";
import { getTheme, mergeCustomTheme, type ThemeConfig } from "../config/themes.js";
import { ClaudeService } from "../services/claude-service.js";
import { ReplicateService } from "../services/replicate-service.js";
import { RendererService } from "../services/renderer-service.js";
import { FFmpegService } from "../services/ffmpeg-service.js";
import { logger } from "../utils/logger.js";
import { slugify } from "../utils/helpers.js";

type StatusCallback = (state: PipelineState) => void;

export class AssetPipeline {
  private claude: ClaudeService;
  private replicate: ReplicateService;
  private renderer: RendererService;
  private ffmpeg: FFmpegService;
  private outputBaseDir: string;

  constructor(
    claude: ClaudeService,
    replicate: ReplicateService,
    renderer: RendererService,
    ffmpeg: FFmpegService,
    outputBaseDir: string
  ) {
    this.claude = claude;
    this.replicate = replicate;
    this.renderer = renderer;
    this.ffmpeg = ffmpeg;
    this.outputBaseDir = outputBaseDir;
  }

  /**
   * Run the full asset generation pipeline
   */
  async run(
    request: AssetRequest,
    onStatusUpdate?: StatusCallback
  ): Promise<AssetManifest> {
    const pipelineId = randomUUID().slice(0, 8);
    const productSlug = slugify(request.product_name);
    const outputDir = join(this.outputBaseDir, productSlug);
    const tempDir = join(outputDir, ".tmp");
    const startTime = Date.now();

    // Resolve theme
    const baseTheme = getTheme(request.theme);
    const theme = mergeCustomTheme(
      baseTheme,
      request.custom_colors as any,
      request.custom_fonts as any
    );

    // Get assets for the selected profile
    const assets = getProfileAssets(request.profile);

    // Initialize pipeline state
    const state: PipelineState = {
      id: pipelineId,
      request,
      status: "queued",
      progress: 0,
      assets_completed: 0,
      assets_total: assets.length,
      current_step: "Initializing",
      errors: [],
      output_dir: outputDir,
      started_at: new Date().toISOString(),
    };

    const updateStatus = (
      status: PipelineStatus,
      step: string,
      progress: number
    ) => {
      state.status = status;
      state.current_step = step;
      state.progress = progress;
      logger.info(`[${pipelineId}] ${step} (${progress}%)`);
      onStatusUpdate?.(state);
    };

    try {
      // --- Setup ---
      await mkdir(outputDir, { recursive: true });
      await mkdir(tempDir, { recursive: true });

      const manifestAssets: ManifestAsset[] = [];
      let totalCost = 0;

      // --- STEP 1: Generate Copy ---
      updateStatus("generating_copy", "Generating marketing copy with Claude", 5);
      const copy = await this.claude.generateCopy(request, theme);

      // Save copy files
      const copyAssets = assets.filter((a) => a.method === "claude-copy");
      for (const asset of copyAssets) {
        const content = this.formatCopyAsset(asset, copy, request);
        const filepath = join(outputDir, `${asset.id}.md`);
        await writeFile(filepath, content);

        const stats = await stat(filepath);
        manifestAssets.push({
          id: asset.id,
          name: asset.name,
          type: asset.type,
          filename: `${asset.id}.md`,
          path: filepath,
          width: 0,
          height: 0,
          format: "md",
          size_bytes: stats.size,
          method: "claude-copy",
          cost_usd: 0.002, // Estimated Claude cost per copy block
        });
        totalCost += 0.002;
        state.assets_completed++;
      }

      // --- STEP 2: Generate Image Prompts ---
      updateStatus(
        "generating_prompts",
        "Engineering image prompts with Claude",
        20
      );
      const imagePrompts = await this.claude.generateImagePrompts(
        request,
        theme,
        assets
      );

      // --- STEP 3: Generate Images via Replicate ---
      updateStatus(
        "generating_images",
        `Generating ${imagePrompts.length} images via Replicate`,
        30
      );
      const generatedImages = await this.replicate.generateImages(
        imagePrompts,
        tempDir
      );

      for (const img of generatedImages) {
        // TODO: Use sharp to resize to exact dimensions if needed
        const finalPath = join(outputDir, `${img.asset_id}.png`);
        const { copyFile } = await import("fs/promises");
        await copyFile(img.filepath, finalPath);

        const asset = assets.find((a) => a.id === img.asset_id);
        if (asset) {
          const stats = await stat(finalPath);
          manifestAssets.push({
            id: asset.id,
            name: asset.name,
            type: asset.type,
            filename: `${asset.id}.png`,
            path: finalPath,
            width: asset.width,
            height: asset.height,
            format: "png",
            size_bytes: stats.size,
            method: "replicate",
            cost_usd: img.cost_usd,
          });
          totalCost += img.cost_usd;
          state.assets_completed++;
        }
      }

      // --- STEP 4: Render HTML Templates via Puppeteer ---
      updateStatus(
        "rendering_templates",
        "Rendering HTML templates to images",
        60
      );
      const puppeteerAssets = assets.filter((a) => a.method === "puppeteer");

      for (const asset of puppeteerAssets) {
        try {
          const result = await this.renderer.renderTemplate(
            asset,
            request,
            copy,
            theme,
            outputDir
          );

          const stats = await stat(result.filepath);
          manifestAssets.push({
            id: asset.id,
            name: asset.name,
            type: asset.type,
            filename: `${asset.id}.png`,
            path: result.filepath,
            width: result.width,
            height: result.height,
            format: "png",
            size_bytes: stats.size,
            method: "puppeteer",
            cost_usd: 0,
          });
          state.assets_completed++;
        } catch (err) {
          state.errors.push({
            step: "rendering",
            asset_id: asset.id,
            message: err instanceof Error ? err.message : String(err),
            recoverable: true,
            timestamp: new Date().toISOString(),
          });
        }
      }

      // --- STEP 5: Create Animations ---
      updateStatus("creating_animations", "Creating animated previews", 80);
      const gifAssets = assets.filter((a) => a.method === "ffmpeg");

      for (const asset of gifAssets) {
        try {
          // Render frames first
          const framePaths = await this.renderer.renderFrames(
            asset,
            request,
            copy,
            theme,
            tempDir,
            12 // 12 frames
          );

          const gifPath = join(outputDir, `${asset.id}.gif`);
          const result = await this.ffmpeg.createGif(framePaths, gifPath, {
            width: asset.width,
            fps: 4,
          });

          manifestAssets.push({
            id: asset.id,
            name: asset.name,
            type: asset.type,
            filename: `${asset.id}.gif`,
            path: result.filepath,
            width: asset.width,
            height: asset.height,
            format: "gif",
            size_bytes: result.file_size_bytes,
            method: "ffmpeg",
            cost_usd: 0,
          });
          state.assets_completed++;
        } catch (err) {
          state.errors.push({
            step: "animation",
            asset_id: asset.id,
            message: err instanceof Error ? err.message : String(err),
            recoverable: true,
            timestamp: new Date().toISOString(),
          });
        }
      }

      // --- STEP 6: Package ---
      updateStatus("packaging", "Creating asset manifest", 95);

      const manifest: AssetManifest = {
        product_name: request.product_name,
        product_slug: productSlug,
        generated_at: new Date().toISOString(),
        profile: request.profile,
        theme: request.theme,
        assets: manifestAssets,
        copy,
        total_cost_usd: totalCost,
        generation_time_seconds: (Date.now() - startTime) / 1000,
      };

      // Write manifest
      await writeFile(
        join(outputDir, "asset-manifest.json"),
        JSON.stringify(manifest, null, 2)
      );

      // Cleanup temp dir
      const { rm } = await import("fs/promises");
      await rm(tempDir, { recursive: true, force: true });

      // --- Done ---
      updateStatus("complete", "All assets generated", 100);
      state.completed_at = new Date().toISOString();
      state.manifest = manifest;

      logger.info(
        `Pipeline complete: ${manifestAssets.length} assets, $${totalCost.toFixed(3)}, ${manifest.generation_time_seconds.toFixed(1)}s`
      );

      return manifest;
    } catch (err) {
      updateStatus("failed", `Pipeline failed: ${err}`, state.progress);
      throw err;
    } finally {
      await this.renderer.destroy();
    }
  }

  /**
   * Format copy assets into markdown files
   */
  private formatCopyAsset(
    asset: AssetSpec,
    copy: any,
    request: AssetRequest
  ): string {
    switch (asset.id) {
      case "gumroad-listing":
        return `# ${copy.gumroad_title}

${copy.gumroad_description}

## What You Get

${copy.gumroad_bullet_points.map((bp: string) => `- ${bp}`).join("\n")}

**${copy.call_to_action}**
`;

      case "email-announcement":
        return `Subject: ${copy.email_subject}

${copy.email_body}
`;

      case "social-captions":
        return `# Social Media Captions — ${request.product_name}

## Twitter/X
${copy.twitter_caption}

## LinkedIn
${copy.linkedin_caption}

## Instagram
${copy.instagram_caption}
`;

      default:
        return `# ${asset.name}\n\nGenerated for ${request.product_name}`;
    }
  }
}
