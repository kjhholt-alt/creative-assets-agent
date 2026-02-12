// ============================================
// AGENT MODE — ClawBot Gateway integration
// Listens for task assignments from ClawBot Prime
// ============================================

import WebSocket from "ws";
import { config } from "./config/env.js";
import { createPipeline } from "./index.js";
import type {
  GatewayMessage,
  TaskAssignment,
  PipelineState,
} from "./types.js";
import { AssetRequestSchema } from "./types.js";
import { logger } from "./utils/logger.js";

class CreativeAssetsAgent {
  private ws: WebSocket | null = null;
  private gatewayUrl: string;
  private sessionId: string;
  private agentName: string;
  private reconnectInterval = 5000;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private isProcessing = false;

  constructor() {
    this.gatewayUrl = config.GATEWAY_WS_URL;
    this.sessionId = config.AGENT_SESSION_ID;
    this.agentName = config.AGENT_NAME;
  }

  async connect(): Promise<void> {
    logger.info(`Connecting to Gateway: ${this.gatewayUrl}`);

    this.ws = new WebSocket(this.gatewayUrl);

    this.ws.on("open", () => {
      logger.info("Connected to ClawBot Gateway");
      this.register();
      this.startHeartbeat();
    });

    this.ws.on("message", (data: WebSocket.Data) => {
      try {
        const message: GatewayMessage = JSON.parse(data.toString());
        this.handleMessage(message);
      } catch (err) {
        logger.error({ err }, "Failed to parse gateway message");
      }
    });

    this.ws.on("close", () => {
      logger.warn("Gateway connection closed, reconnecting...");
      this.stopHeartbeat();
      setTimeout(() => this.connect(), this.reconnectInterval);
    });

    this.ws.on("error", (err) => {
      logger.error({ err }, "Gateway connection error");
    });
  }

  private register(): void {
    this.send({
      from: this.sessionId,
      to: "gateway",
      type: "heartbeat",
      priority: "low",
      payload: {
        agent_name: this.agentName,
        session_id: this.sessionId,
        capabilities: ["generate_asset_kit", "regenerate_asset", "update_listing"],
        status: "idle",
      },
      expect_reply: false,
      timestamp: new Date().toISOString(),
    });
  }

  private async handleMessage(message: GatewayMessage): Promise<void> {
    logger.info(`Received: ${message.type} from ${message.from}`);

    switch (message.type) {
      case "task_assignment":
        await this.handleTaskAssignment(message as TaskAssignment);
        break;

      case "heartbeat":
        this.send({
          from: this.sessionId,
          to: message.from,
          type: "heartbeat",
          priority: "low",
          payload: {
            status: this.isProcessing ? "busy" : "idle",
            agent_name: this.agentName,
          },
          expect_reply: false,
          timestamp: new Date().toISOString(),
        });
        break;

      default:
        logger.warn(`Unknown message type: ${message.type}`);
    }
  }

  private async handleTaskAssignment(task: TaskAssignment): Promise<void> {
    if (this.isProcessing) {
      this.sendStatus(task.from, "none", "queued", 0, "Agent busy — task queued");
      return;
    }

    this.isProcessing = true;
    const { payload } = task;

    try {
      // Validate the incoming request
      const request = AssetRequestSchema.parse({
        product_name: payload.product_name,
        product_description: payload.product_description,
        profile: payload.profile || "gumroad-product",
        theme: payload.theme || "dark",
        brand: payload.brand || "buildkit",
      });

      // Create and run the pipeline
      const pipeline = createPipeline();

      const manifest = await pipeline.run(request, (state: PipelineState) => {
        // Send real-time status updates back to Prime
        this.sendStatus(
          task.from,
          state.id,
          state.status,
          state.progress,
          `${state.current_step} (${state.assets_completed}/${state.assets_total} assets)`
        );
      });

      // Send completion message
      this.send({
        from: this.sessionId,
        to: task.from,
        type: "task_complete",
        priority: "medium",
        payload: {
          pipeline_id: manifest.product_slug,
          manifest,
          output_dir: `./output/${manifest.product_slug}`,
          summary: `Generated ${manifest.assets.length} assets for "${manifest.product_name}" in ${manifest.generation_time_seconds.toFixed(1)}s. Cost: $${manifest.total_cost_usd.toFixed(3)}`,
        },
        expect_reply: false,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      logger.error({ err }, "Task failed");

      this.send({
        from: this.sessionId,
        to: task.from,
        type: "task_failed",
        priority: "high",
        payload: {
          error: err instanceof Error ? err.message : String(err),
          task_payload: payload,
          recoverable: true,
        },
        expect_reply: false,
        timestamp: new Date().toISOString(),
      });
    } finally {
      this.isProcessing = false;
    }
  }

  private sendStatus(
    to: string,
    pipelineId: string,
    status: string,
    progress: number,
    message: string
  ): void {
    this.send({
      from: this.sessionId,
      to,
      type: "status_update",
      priority: "low",
      payload: {
        pipeline_id: pipelineId,
        status,
        progress,
        current_step: message,
        message,
      },
      expect_reply: false,
      timestamp: new Date().toISOString(),
    });
  }

  private send(message: GatewayMessage): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      logger.warn("Cannot send — Gateway not connected");
    }
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      this.send({
        from: this.sessionId,
        to: "gateway",
        type: "heartbeat",
        priority: "low",
        payload: {
          status: this.isProcessing ? "busy" : "idle",
          uptime: process.uptime(),
          memory: process.memoryUsage().heapUsed,
        },
        expect_reply: false,
        timestamp: new Date().toISOString(),
      });
    }, 60_000); // Every 60 seconds
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }
}

// --- Boot ---
const agent = new CreativeAssetsAgent();
agent.connect().catch((err) => {
  logger.error({ err }, "Agent failed to start");
  process.exit(1);
});

// Graceful shutdown
process.on("SIGINT", () => {
  logger.info("Shutting down Creative Assets Agent...");
  process.exit(0);
});

process.on("SIGTERM", () => {
  logger.info("Shutting down Creative Assets Agent...");
  process.exit(0);
});
