// ============================================
// CLI — Run asset generation from the command line
// ============================================

import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import { createPipeline } from "./index.js";
import { AssetRequestSchema, type PipelineState } from "./types.js";

const program = new Command();

program
  .name("creative-assets")
  .description("Generate complete marketing asset kits for your products")
  .version("0.1.0");

program
  .command("generate")
  .description("Generate a full asset kit")
  .requiredOption("-p, --product <name>", "Product name")
  .requiredOption("-d, --description <text>", "Product description")
  .option("-t, --theme <theme>", "Visual theme", "dark")
  .option(
    "--profile <profile>",
    "Asset profile (gumroad-product, social-media, landing-page, full-kit, thumbnail-only)",
    "gumroad-product"
  )
  .option("-b, --brand <brand>", "Brand name", "buildkit")
  .option("--preview", "Preview mode — skip Replicate, use placeholders")
  .option("--tags <tags>", "Comma-separated tags")
  .option("--audience <text>", "Target audience description")
  .action(async (opts) => {
    console.log(
      chalk.bold.cyan("\n🎨 Creative Assets Agent\n")
    );

    const spinner = ora();

    try {
      const request = AssetRequestSchema.parse({
        product_name: opts.product,
        product_description: opts.description,
        theme: opts.theme,
        profile: opts.profile,
        brand: opts.brand,
        tags: opts.tags?.split(",").map((t: string) => t.trim()),
        target_audience: opts.audience,
      });

      console.log(chalk.gray(`Product:  ${request.product_name}`));
      console.log(chalk.gray(`Theme:    ${request.theme}`));
      console.log(chalk.gray(`Profile:  ${request.profile}`));
      console.log(chalk.gray(`Brand:    ${request.brand}`));
      console.log("");

      const pipeline = createPipeline();

      const manifest = await pipeline.run(request, (state: PipelineState) => {
        spinner.text = `${state.current_step} (${state.progress}%)`;
        if (!spinner.isSpinning) spinner.start();
      });

      spinner.succeed(chalk.green("Asset generation complete!\n"));

      console.log(chalk.bold("📦 Output:"));
      console.log(chalk.gray(`   Directory: ./output/${manifest.product_slug}/`));
      console.log(chalk.gray(`   Assets:    ${manifest.assets.length}`));
      console.log(chalk.gray(`   Cost:      $${manifest.total_cost_usd.toFixed(3)}`));
      console.log(
        chalk.gray(
          `   Time:      ${manifest.generation_time_seconds.toFixed(1)}s`
        )
      );

      console.log(chalk.bold("\n📄 Files:"));
      for (const asset of manifest.assets) {
        const size =
          asset.size_bytes > 1024 * 1024
            ? `${(asset.size_bytes / 1024 / 1024).toFixed(1)}MB`
            : `${(asset.size_bytes / 1024).toFixed(0)}KB`;
        console.log(chalk.gray(`   ${asset.filename} (${size})`));
      }

      console.log(
        chalk.bold.green(
          `\n✅ Done! Assets ready in ./output/${manifest.product_slug}/\n`
        )
      );
    } catch (err) {
      spinner.fail(chalk.red("Generation failed"));
      console.error(chalk.red(err instanceof Error ? err.message : String(err)));
      process.exit(1);
    }
  });

program
  .command("list-themes")
  .description("Show all available themes")
  .action(async () => {
    const { THEMES } = await import("./config/themes.js");
    console.log(chalk.bold.cyan("\n🎨 Available Themes\n"));
    for (const [key, theme] of Object.entries(THEMES)) {
      console.log(
        `  ${chalk.bold(key.padEnd(12))} ${chalk.gray(theme.name)} — ${chalk.hex(theme.colors.primary)("■")} ${chalk.hex(theme.colors.secondary)("■")} ${chalk.hex(theme.colors.accent)("■")}`
      );
    }
    console.log("");
  });

program
  .command("list-profiles")
  .description("Show all available asset profiles")
  .action(async () => {
    const { PROFILES } = await import("./config/asset-profiles.js");
    console.log(chalk.bold.cyan("\n📦 Available Profiles\n"));
    for (const [key, assets] of Object.entries(PROFILES)) {
      console.log(`  ${chalk.bold(key)}`);
      for (const asset of assets) {
        const dims =
          asset.width > 0 ? ` (${asset.width}x${asset.height})` : "";
        console.log(
          chalk.gray(`    → ${asset.name}${dims} [${asset.method}]`)
        );
      }
      console.log("");
    }
  });

program.parse();
