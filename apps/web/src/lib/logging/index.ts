type LogLevel = "debug" | "info" | "warn" | "error";

interface LogPayload {
  level: LogLevel;
  message: string;
  context?: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

/**
 * Redacts known sensitive strings like MongoDB URIs and bearer tokens from logs.
 */
function sanitizeMessage(str: string): string {
  return str
    .replace(/mongodb(\+srv)?:\/\/[^@]+@/gi, "mongodb$1://***:***@")
    .replace(/Bearer\s+[A-Za-z0-9-_.]+/gi, "Bearer ***")
    .replace(/(api[_-]?key|secret|token|password)=[^&\s]+/gi, "$1=***");
}

class Logger {
  private formatLog(
    level: LogLevel,
    message: string,
    context?: string,
    metadata?: Record<string, unknown>,
    err?: unknown
  ): LogPayload {
    const payload: LogPayload = {
      level,
      message: sanitizeMessage(message),
      context: context || "UMEED",
      timestamp: new Date().toISOString(),
    };

    if (metadata) {
      payload.metadata = metadata;
    }

    if (err instanceof Error) {
      payload.error = {
        name: err.name,
        message: sanitizeMessage(err.message),
        ...(process.env.NODE_ENV !== "production" ? { stack: err.stack } : {}),
      };
    }

    return payload;
  }

  info(message: string, context?: string, metadata?: Record<string, unknown>) {
    const log = this.formatLog("info", message, context, metadata);
    console.log(JSON.stringify(log));
  }

  warn(message: string, context?: string, metadata?: Record<string, unknown>) {
    const log = this.formatLog("warn", message, context, metadata);
    console.warn(JSON.stringify(log));
  }

  error(message: string, err?: unknown, context?: string, metadata?: Record<string, unknown>) {
    const log = this.formatLog("error", message, context, metadata, err);
    console.error(JSON.stringify(log));
  }

  debug(message: string, context?: string, metadata?: Record<string, unknown>) {
    if (process.env.NODE_ENV !== "production") {
      const log = this.formatLog("debug", message, context, metadata);
      console.debug(JSON.stringify(log));
    }
  }
}

export const logger = new Logger();

