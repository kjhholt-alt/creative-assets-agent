// ============================================
// CREATIVE ASSETS AGENT — CORE TYPES
// ============================================

import { z } from "zod";

// --- Asset Generation Request (from ClawBot Prime or CLI) ---

export const AssetThemeSchema = z.enum([
  "dark",
  "light",
  "terminal",
  "gradient",
  "minimal",
  "brutalist",
  "retro",
  "neon",
  "organic",
  "custom",
]);
export type AssetTheme = z.infer<typeof AssetThemeSchema>;

export const AssetProfileSchema = z.enum([
  "gumroad-product", // Full Gumroad launch kit
  "social-media", // Platform-optimized social banners only
  "landing-page", // Hero images + OG images for web
  "full-kit", // Everything combined
  "thumbnail-only", // Quick single thumbnail
]);
export type AssetProfile = z.infer<typeof AssetProfileSchema>;

export const BrandSchema = z.enum(["buildkit", "custom"]);
export type Brand = z.infer<typeof BrandSchema>;

export const AssetRequestSchema = z.object({
  product_name: z.string().min(1),
  product_description: z.string().min(10),
  profile: AssetProfileSchema.default("gumroad-product"),
  theme: AssetThemeSchema.default("dark"),
  brand: BrandSchema.default("buildkit"),
  custom_colors: z
    .object({
      primary: z.string().optional(),
      secondary: z.string().optional(),
      accent: z.string().optional(),
      background: z.string().optional(),
      text: z.string().optional(),
    })
    .optional(),
  custom_fonts: z
    .object({
      heading: z.string().optional(),
      body: z.string().optional(),
    })
    .optional(),
  tags: z.array(z.string()).optional(),
  target_audience: z.string().optional(),
  style_references: z.array(z.string()).optional(), // URLs to reference designs
  existing_logo_path: z.string().optional(),
});
export type AssetRequest = z.infer<typeof AssetRequestSchema>;

// --- Asset Specifications (what we generate) ---

export interface AssetSpec {
  id: string;
  name: string;
  type: AssetType;
  width: number;
  height: number;
  format: "png" | "jpg" | "gif" | "mp4" | "svg" | "md";
  method: GenerationMethod;
  required: boolean;
  description: string;
}

export type AssetType =
  | "thumbnail"
  | "banner"
  | "og-image"
  | "preview-gif"
  | "product-card"
  | "social-post"
  | "hero-image"
  | "icon"
  | "copy"
  | "email";

export type GenerationMethod =
  | "replicate" // AI image generation
  | "puppeteer" // HTML template → screenshot
  | "ffmpeg" // Frame stitching → GIF/video
  | "claude-svg" // Claude generates SVG code
  | "claude-copy" // Claude generates text/markdown
  | "composite"; // Combine multiple methods

// --- Pipeline State ---

export type PipelineStatus =
  | "queued"
  | "generating_copy"
  | "generating_prompts"
  | "generating_images"
  | "rendering_templates"
  | "creating_animations"
  | "compositing"
  | "packaging"
  | "review_pending"
  | "approved"
  | "publishing"
  | "complete"
  | "failed";

export interface PipelineState {
  id: string;
  request: AssetRequest;
  status: PipelineStatus;
  progress: number; // 0-100
  assets_completed: number;
  assets_total: number;
  current_step: string;
  errors: PipelineError[];
  output_dir: string;
  started_at: string;
  completed_at?: string;
  manifest?: AssetManifest;
}

export interface PipelineError {
  step: string;
  asset_id?: string;
  message: string;
  recoverable: boolean;
  timestamp: string;
}

// --- Generated Content (from Claude) ---

export interface GeneratedCopy {
  gumroad_title: string;
  gumroad_description: string;
  gumroad_bullet_points: string[];
  email_subject: string;
  email_body: string;
  twitter_caption: string;
  linkedin_caption: string;
  instagram_caption: string;
  og_title: string;
  og_description: string;
  tagline: string;
  call_to_action: string;
}

export interface GeneratedImagePrompt {
  asset_id: string;
  prompt: string;
  negative_prompt: string;
  style_preset?: string;
  aspect_ratio: string;
  guidance_scale: number;
}

// --- Output Manifest ---

export interface AssetManifest {
  product_name: string;
  product_slug: string;
  generated_at: string;
  profile: AssetProfile;
  theme: AssetTheme;
  assets: ManifestAsset[];
  copy: GeneratedCopy;
  total_cost_usd: number;
  generation_time_seconds: number;
}

export interface ManifestAsset {
  id: string;
  name: string;
  type: AssetType;
  filename: string;
  path: string;
  width: number;
  height: number;
  format: string;
  size_bytes: number;
  method: GenerationMethod;
  cost_usd: number;
}

// --- ClawBot Gateway Integration ---

export interface GatewayMessage {
  from: string;
  to: string;
  type:
    | "task_assignment"
    | "status_update"
    | "task_complete"
    | "task_failed"
    | "heartbeat"
    | "escalation";
  priority: "low" | "medium" | "high" | "critical";
  payload: Record<string, unknown>;
  expect_reply: boolean;
  timeout_minutes?: number;
  timestamp: string;
}

export interface TaskAssignment extends GatewayMessage {
  type: "task_assignment";
  payload: {
    task: "generate_asset_kit" | "regenerate_asset" | "update_listing";
    product_name: string;
    product_description: string;
    profile: AssetProfile;
    theme: AssetTheme;
    brand: Brand;
    deadline?: string;
    specs?: Record<string, unknown>;
  };
}

export interface StatusUpdate extends GatewayMessage {
  type: "status_update";
  payload: {
    pipeline_id: string;
    status: PipelineStatus;
    progress: number;
    current_step: string;
    message: string;
  };
}

export interface TaskComplete extends GatewayMessage {
  type: "task_complete";
  payload: {
    pipeline_id: string;
    manifest: AssetManifest;
    output_dir: string;
    review_url?: string;
  };
}

// --- Service Configs ---

export interface ClaudeServiceConfig {
  apiKey: string;
  model: string;
  maxTokens: number;
}

export interface ReplicateServiceConfig {
  apiToken: string;
  imageModel: string;
  upscaleModel: string;
  maxConcurrent: number;
}

export interface PuppeteerServiceConfig {
  headless: boolean;
  defaultViewport: {
    width: number;
    height: number;
  };
  timeout: number;
}

export interface FFmpegServiceConfig {
  framerate: number;
  quality: number;
  maxDuration: number;
}
