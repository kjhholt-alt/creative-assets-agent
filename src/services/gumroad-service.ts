// ============================================
// GUMROAD SERVICE — Product listing management, cover uploads
// ============================================

import { readFile } from "fs/promises";
import type { GeneratedCopy, AssetManifest } from "../types.js";
import { logger } from "../utils/logger.js";

interface GumroadProduct {
  id: string;
  name: string;
  description: string;
  published: boolean;
  url: string;
  price: number;
  thumbnail_url?: string;
}

export class GumroadService {
  private accessToken: string;
  private baseUrl = "https://api.gumroad.com/v2";

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  /**
   * List all products for the authenticated seller
   */
  async listProducts(): Promise<GumroadProduct[]> {
    const response = await fetch(`${this.baseUrl}/products`, {
      headers: { Authorization: `Bearer ${this.accessToken}` },
    });

    const data = (await response.json()) as any;
    if (!data.success) throw new Error(`Gumroad API error: ${data.message}`);

    return data.products;
  }

  /**
   * Get a specific product by ID
   */
  async getProduct(productId: string): Promise<GumroadProduct> {
    const response = await fetch(`${this.baseUrl}/products/${productId}`, {
      headers: { Authorization: `Bearer ${this.accessToken}` },
    });

    const data = (await response.json()) as any;
    if (!data.success) throw new Error(`Gumroad API error: ${data.message}`);

    return data.product;
  }

  /**
   * Update a product's description and metadata from generated copy
   */
  async updateProductCopy(
    productId: string,
    copy: GeneratedCopy
  ): Promise<GumroadProduct> {
    logger.info(`Updating Gumroad product copy: ${productId}`);

    // Format description with bullet points
    const fullDescription = [
      copy.gumroad_description,
      "",
      "What you get:",
      ...copy.gumroad_bullet_points.map((bp) => `• ${bp}`),
    ].join("\n");

    const response = await fetch(`${this.baseUrl}/products/${productId}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        name: copy.gumroad_title,
        description: fullDescription,
      }),
    });

    const data = (await response.json()) as any;
    if (!data.success) throw new Error(`Gumroad update failed: ${data.message}`);

    logger.info(`Product updated: ${copy.gumroad_title}`);
    return data.product;
  }

  /**
   * Upload a cover image to a product
   */
  async uploadCoverImage(
    productId: string,
    imagePath: string
  ): Promise<void> {
    logger.info(`Uploading cover image to product: ${productId}`);

    const imageBuffer = await readFile(imagePath);
    const formData = new FormData();
    formData.append("access_token", this.accessToken);
    formData.append(
      "cover_image",
      new Blob([imageBuffer], { type: "image/png" }),
      "cover.png"
    );

    const response = await fetch(`${this.baseUrl}/products/${productId}`, {
      method: "PUT",
      body: formData,
    });

    const data = (await response.json()) as any;
    if (!data.success) throw new Error(`Cover upload failed: ${data.message}`);

    logger.info("Cover image uploaded successfully");
  }

  /**
   * Full product update: copy + cover image
   */
  async publishAssets(
    productId: string,
    manifest: AssetManifest
  ): Promise<void> {
    logger.info(`Publishing full asset kit to Gumroad product: ${productId}`);

    // 1. Update copy
    await this.updateProductCopy(productId, manifest.copy);

    // 2. Upload thumbnail as cover
    const thumbnail = manifest.assets.find((a) => a.type === "thumbnail");
    if (thumbnail) {
      await this.uploadCoverImage(productId, thumbnail.path);
    }

    logger.info(`Full publish complete for: ${manifest.product_name}`);
  }
}
