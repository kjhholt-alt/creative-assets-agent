// ============================================
// ASSET PROFILES — What gets generated per profile
// ============================================

import type { AssetSpec, AssetProfile } from "../types.js";

// --- Individual Asset Definitions ---

const ASSETS: Record<string, AssetSpec> = {
  // Thumbnails
  gumroad_thumbnail: {
    id: "gumroad-thumbnail",
    name: "Gumroad Product Thumbnail",
    type: "thumbnail",
    width: 1280,
    height: 720,
    format: "png",
    method: "replicate",
    required: true,
    description: "Main product cover image for Gumroad listing",
  },

  // Social Banners
  twitter_banner: {
    id: "twitter-banner",
    name: "Twitter/X Banner",
    type: "banner",
    width: 1500,
    height: 500,
    format: "png",
    method: "replicate",
    required: true,
    description: "Landscape banner optimized for Twitter/X posts",
  },
  linkedin_banner: {
    id: "linkedin-banner",
    name: "LinkedIn Banner",
    type: "banner",
    width: 1200,
    height: 627,
    format: "png",
    method: "replicate",
    required: true,
    description: "Landscape banner optimized for LinkedIn posts",
  },
  instagram_square: {
    id: "instagram-square",
    name: "Instagram Square",
    type: "social-post",
    width: 1080,
    height: 1080,
    format: "png",
    method: "puppeteer",
    required: true,
    description: "Square format post for Instagram feed",
  },

  // Web / SEO
  og_image: {
    id: "og-image",
    name: "Open Graph Image",
    type: "og-image",
    width: 1200,
    height: 630,
    format: "png",
    method: "puppeteer",
    required: true,
    description: "Preview image for link sharing (Twitter, Slack, Discord, etc.)",
  },

  // Animated
  preview_gif: {
    id: "preview-gif",
    name: "Product Preview GIF",
    type: "preview-gif",
    width: 800,
    height: 600,
    format: "gif",
    method: "ffmpeg",
    required: false,
    description: "Animated preview showing product features/screenshots",
  },

  // Rendered Components
  product_card: {
    id: "product-card",
    name: "Product Card",
    type: "product-card",
    width: 600,
    height: 400,
    format: "png",
    method: "puppeteer",
    required: false,
    description: "Styled product card for embedding in websites/docs",
  },

  // Hero
  hero_image: {
    id: "hero-image",
    name: "Landing Page Hero",
    type: "hero-image",
    width: 1920,
    height: 1080,
    format: "png",
    method: "replicate",
    required: false,
    description: "Full-width hero image for landing pages",
  },

  // Copy
  gumroad_listing: {
    id: "gumroad-listing",
    name: "Gumroad Listing Copy",
    type: "copy",
    width: 0,
    height: 0,
    format: "md",
    method: "claude-copy",
    required: true,
    description: "Full Gumroad product listing: title, description, bullets",
  },
  email_announcement: {
    id: "email-announcement",
    name: "Email Announcement",
    type: "email",
    width: 0,
    height: 0,
    format: "md",
    method: "claude-copy",
    required: true,
    description: "Product launch email draft",
  },
  social_captions: {
    id: "social-captions",
    name: "Social Media Captions",
    type: "copy",
    width: 0,
    height: 0,
    format: "md",
    method: "claude-copy",
    required: true,
    description: "Platform-specific captions for Twitter, LinkedIn, Instagram",
  },
};

// --- Profile Definitions ---

export const PROFILES: Record<AssetProfile, AssetSpec[]> = {
  "gumroad-product": [
    ASSETS.gumroad_thumbnail,
    ASSETS.twitter_banner,
    ASSETS.linkedin_banner,
    ASSETS.instagram_square,
    ASSETS.og_image,
    ASSETS.preview_gif,
    ASSETS.product_card,
    ASSETS.gumroad_listing,
    ASSETS.email_announcement,
    ASSETS.social_captions,
  ],

  "social-media": [
    ASSETS.twitter_banner,
    ASSETS.linkedin_banner,
    ASSETS.instagram_square,
    ASSETS.social_captions,
  ],

  "landing-page": [
    ASSETS.hero_image,
    ASSETS.og_image,
    ASSETS.product_card,
  ],

  "full-kit": Object.values(ASSETS),

  "thumbnail-only": [ASSETS.gumroad_thumbnail],
};

export function getProfileAssets(profile: AssetProfile): AssetSpec[] {
  return PROFILES[profile] || PROFILES["gumroad-product"];
}

export function getAssetById(id: string): AssetSpec | undefined {
  return Object.values(ASSETS).find((a) => a.id === id);
}
