// ============================================
// FFMPEG SERVICE — GIF creation, video encoding, frame stitching
// ============================================

import ffmpeg from "fluent-ffmpeg";
import { join } from "path";
import type { FFmpegServiceConfig } from "../types.js";
import { logger } from "../utils/logger.js";

export interface AnimationResult {
  asset_id: string;
  filepath: string;
  format: "gif" | "mp4";
  duration_seconds: number;
  file_size_bytes: number;
}

export class FFmpegService {
  private config: FFmpegServiceConfig;

  constructor(config: FFmpegServiceConfig) {
    this.config = config;
  }

  /**
   * Create a GIF from a sequence of PNG frames
   */
  async createGif(
    framePaths: string[],
    outputPath: string,
    options?: {
      width?: number;
      fps?: number;
      loop?: number; // 0 = infinite loop
    }
  ): Promise<AnimationResult> {
    const fps = options?.fps || this.config.framerate;
    const width = options?.width || 800;
    const loop = options?.loop ?? 0;

    logger.info(
      `Creating GIF from ${framePaths.length} frames at ${fps}fps`
    );

    return new Promise((resolve, reject) => {
      const framePattern = framePaths[0].replace(
        /frame-\d+\.png$/,
        "frame-%04d.png"
      );

      ffmpeg(framePattern)
        .inputFPS(fps)
        .complexFilter([
          `[0:v] fps=${fps},scale=${width}:-1:flags=lanczos,split [a][b]`,
          `[a] palettegen=max_colors=256:stats_mode=diff [p]`,
          `[b][p] paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle`,
        ])
        .outputOptions([`-loop ${loop}`])
        .output(outputPath)
        .on("end", async () => {
          const { stat } = await import("fs/promises");
          const stats = await stat(outputPath);
          logger.info(
            `GIF created: ${outputPath} (${(stats.size / 1024).toFixed(0)}KB)`
          );
          resolve({
            asset_id: "preview-gif",
            filepath: outputPath,
            format: "gif",
            duration_seconds: framePaths.length / fps,
            file_size_bytes: stats.size,
          });
        })
        .on("error", (err) => {
          logger.error({ err }, "GIF creation failed");
          reject(err);
        })
        .run();
    });
  }

  /**
   * Create an MP4 video from frames (for social media)
   */
  async createVideo(
    framePaths: string[],
    outputPath: string,
    options?: {
      width?: number;
      fps?: number;
    }
  ): Promise<AnimationResult> {
    const fps = options?.fps || this.config.framerate;
    const width = options?.width || 1920;

    logger.info(
      `Creating MP4 from ${framePaths.length} frames at ${fps}fps`
    );

    return new Promise((resolve, reject) => {
      const framePattern = framePaths[0].replace(
        /frame-\d+\.png$/,
        "frame-%04d.png"
      );

      ffmpeg(framePattern)
        .inputFPS(fps)
        .videoCodec("libx264")
        .outputOptions([
          `-vf scale=${width}:-2:flags=lanczos`,
          "-pix_fmt yuv420p",
          `-crf ${this.config.quality}`,
          "-preset medium",
        ])
        .output(outputPath)
        .on("end", async () => {
          const { stat } = await import("fs/promises");
          const stats = await stat(outputPath);
          logger.info(
            `MP4 created: ${outputPath} (${(stats.size / 1024 / 1024).toFixed(1)}MB)`
          );
          resolve({
            asset_id: "preview-video",
            filepath: outputPath,
            format: "mp4",
            duration_seconds: framePaths.length / fps,
            file_size_bytes: stats.size,
          });
        })
        .on("error", (err) => {
          logger.error({ err }, "Video creation failed");
          reject(err);
        })
        .run();
    });
  }

  /**
   * Resize/optimize an existing GIF
   */
  async optimizeGif(
    inputPath: string,
    outputPath: string,
    maxWidth: number = 600,
    maxSizeKB: number = 5000
  ): Promise<string> {
    logger.info(`Optimizing GIF: ${inputPath} (max ${maxWidth}px, ${maxSizeKB}KB)`);

    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .complexFilter([
          `[0:v] scale='min(${maxWidth},iw)':-1:flags=lanczos,split [a][b]`,
          `[a] palettegen=max_colors=128 [p]`,
          `[b][p] paletteuse=dither=bayer:bayer_scale=3`,
        ])
        .output(outputPath)
        .on("end", () => {
          logger.info(`GIF optimized: ${outputPath}`);
          resolve(outputPath);
        })
        .on("error", reject)
        .run();
    });
  }
}
