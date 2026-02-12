// ============================================
// HELPERS — Utility functions
// ============================================

/**
 * Convert a product name to a URL-safe slug
 * "AI Prompt Templates v2" → "ai-prompt-templates-v2"
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}
