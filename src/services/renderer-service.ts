// ============================================
// RENDERER SERVICE — Puppeteer-based HTML → PNG screenshots
// ============================================

import puppeteer, { type Browser, type Page } from "puppeteer";
import { readFile, writeFile } from "fs/promises";
import { join } from "path";
import Handlebars from "handlebars";
import type { AssetSpec, PuppeteerServiceConfig, AssetRequest, GeneratedCopy } from "../types.js";
import type { ThemeConfig } from "../config/themes.js";
import { logger } from "../utils/logger.js";

export interface RenderResult {
  asset_id: string;
  filepath: string;
  width: number;
  height: number;
}

export class RendererService {
  private config: PuppeteerServiceConfig;
  private browser: Browser | null = null;
  private templateCache: Map<string, HandlebarsTemplateDelegate> = new Map();

  constructor(config: PuppeteerServiceConfig) {
    this.config = config;
  }

  /**
   * Initialize the browser instance
   */
  async init(): Promise<void> {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: this.config.headless,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      });
      logger.info("Puppeteer browser initialized");
    }
  }

  /**
   * Render an HTML template to a PNG image
   */
  async renderTemplate(
    asset: AssetSpec,
    request: AssetRequest,
    copy: GeneratedCopy,
    theme: ThemeConfig,
    outputDir: string,
    extraData?: Record<string, unknown>
  ): Promise<RenderResult> {
    await this.init();
    if (!this.browser) throw new Error("Browser not initialized");

    logger.info(`Rendering template: ${asset.id} (${asset.width}x${asset.height})`);

    const page = await this.browser.newPage();

    try {
      await page.setViewport({
        width: asset.width,
        height: asset.height,
        deviceScaleFactor: 2, // Retina quality
      });

      // Load and compile the template
      const html = await this.compileTemplate(asset, request, copy, theme, extraData);

      await page.setContent(html, {
        waitUntil: "networkidle0",
        timeout: this.config.timeout,
      });

      // Wait for fonts to load
      await page.evaluateHandle("document.fonts.ready");

      // Optional: wait for animations to settle
      await new Promise((r) => setTimeout(r, 500));

      const filepath = join(outputDir, `${asset.id}.png`);
      await page.screenshot({
        path: filepath,
        type: "png",
        clip: {
          x: 0,
          y: 0,
          width: asset.width,
          height: asset.height,
        },
      });

      logger.info(`Rendered: ${filepath}`);

      return {
        asset_id: asset.id,
        filepath,
        width: asset.width,
        height: asset.height,
      };
    } finally {
      await page.close();
    }
  }

  /**
   * Render multiple frames for GIF creation
   */
  async renderFrames(
    asset: AssetSpec,
    request: AssetRequest,
    copy: GeneratedCopy,
    theme: ThemeConfig,
    outputDir: string,
    frameCount: number = 10
  ): Promise<string[]> {
    await this.init();
    if (!this.browser) throw new Error("Browser not initialized");

    logger.info(`Rendering ${frameCount} frames for: ${asset.id}`);

    const framePaths: string[] = [];
    const page = await this.browser.newPage();

    try {
      await page.setViewport({
        width: asset.width,
        height: asset.height,
        deviceScaleFactor: 1,
      });

      for (let i = 0; i < frameCount; i++) {
        const html = await this.compileTemplate(asset, request, copy, theme, {
          frameIndex: i,
          frameTotal: frameCount,
          progress: i / (frameCount - 1),
        });

        await page.setContent(html, { waitUntil: "networkidle0" });
        await page.evaluateHandle("document.fonts.ready");

        const framePath = join(outputDir, `frame-${String(i).padStart(4, "0")}.png`);
        await page.screenshot({ path: framePath, type: "png" });
        framePaths.push(framePath);
      }

      return framePaths;
    } finally {
      await page.close();
    }
  }

  /**
   * Compile a Handlebars template with all context data
   */
  private async compileTemplate(
    asset: AssetSpec,
    request: AssetRequest,
    copy: GeneratedCopy,
    theme: ThemeConfig,
    extraData?: Record<string, unknown>
  ): Promise<string> {
    // Determine template file based on asset type
    const templateName = this.getTemplateName(asset);
    let template = this.templateCache.get(templateName);

    if (!template) {
      try {
        const templatePath = join(
          process.cwd(),
          "src",
          "templates",
          `${templateName}.hbs`
        );
        const templateSource = await readFile(templatePath, "utf-8");
        template = Handlebars.compile(templateSource);
        this.templateCache.set(templateName, template);
      } catch {
        // Fallback to generic template
        template = Handlebars.compile(this.getDefaultTemplate(asset));
      }
    }

    return template({
      product: request,
      copy,
      theme,
      asset,
      colors: theme.colors,
      fonts: theme.fonts,
      style: theme.style,
      width: asset.width,
      height: asset.height,
      ...extraData,
    });
  }

  private getTemplateName(asset: AssetSpec): string {
    const templateMap: Record<string, string> = {
      "og-image": "og-image",
      "instagram-square": "social-square",
      "product-card": "product-card",
      "preview-gif": "preview-frame",
    };
    return templateMap[asset.id] || asset.type;
  }

  /**
   * Fallback template when no specific .hbs file exists
   */
  private getDefaultTemplate(asset: AssetSpec): string {
    return `<!DOCTYPE html>
<html>
<head>
  <style>
    @import url('https://fonts.googleapis.com/css2?family={{fonts.heading}}:wght@{{fonts.headingWeight}}&family={{fonts.body}}:wght@{{fonts.bodyWeight}}&display=swap');
    
    * { margin: 0; padding: 0; box-sizing: border-box; }
    
    body {
      width: {{width}}px;
      height: {{height}}px;
      background: {{colors.background}};
      font-family: '{{fonts.body}}', sans-serif;
      color: {{colors.text}};
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
    }
    
    .container {
      padding: 60px;
      text-align: center;
      max-width: 80%;
    }
    
    .tagline {
      font-family: '{{fonts.heading}}', sans-serif;
      font-weight: {{fonts.headingWeight}};
      font-size: 48px;
      color: {{colors.primary}};
      margin-bottom: 20px;
    }
    
    .product-name {
      font-family: '{{fonts.heading}}', sans-serif;
      font-size: 72px;
      font-weight: {{fonts.headingWeight}};
      color: {{colors.text}};
      margin-bottom: 16px;
      line-height: 1.1;
    }
    
    .description {
      font-size: 24px;
      color: {{colors.textMuted}};
      line-height: 1.5;
      max-width: 600px;
      margin: 0 auto;
    }
    
    .accent-bar {
      width: 80px;
      height: 4px;
      background: {{colors.accent}};
      margin: 30px auto;
      border-radius: 2px;
    }
    
    .brand {
      font-family: '{{fonts.mono}}', monospace;
      font-size: 14px;
      color: {{colors.textMuted}};
      letter-spacing: 2px;
      text-transform: uppercase;
      margin-top: 40px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="tagline">{{copy.tagline}}</div>
    <h1 class="product-name">{{product.product_name}}</h1>
    <div class="accent-bar"></div>
    <p class="description">{{copy.og_description}}</p>
    <div class="brand">{{product.brand}}</div>
  </div>
</body>
</html>`;
  }

  /**
   * Cleanup browser instance
   */
  async destroy(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      logger.info("Puppeteer browser closed");
    }
  }
}
