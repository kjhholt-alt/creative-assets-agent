// ============================================
// LOGGER — Pino-based structured logging
// ============================================

import pino from "pino";

export const logger = pino({
  level: process.env.LOG_LEVEL || "info",
});
