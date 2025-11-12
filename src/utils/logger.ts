import { Page } from "puppeteer";

type LogLevel = "debug" | "info" | "warn" | "error";

/**
 * Интерфейс для конфигурации логгера
 */
interface LoggerConfig {
  logLevel: LogLevel;
  showTimestamp: boolean;
  showHeaders: boolean;
}

const DEFAULT_LOGGER_CONFIG: LoggerConfig = {
  logLevel: "info",
  showTimestamp: true,
  showHeaders: false,
};

/**
 * Сервис для логирования событий краулера
 */
export class Logger {
  private readonly config: LoggerConfig;

  private readonly logLevels: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
  };

  constructor(customConfig: Partial<LoggerConfig> = {}) {
    this.config = {
      ...DEFAULT_LOGGER_CONFIG,
      ...customConfig,
    };
  }

  debug(message: string): void {
    if (this.shouldLog("debug")) {
      console.log(`${this.getTimestamp()}DEBUG: ${message}`);
    }
  }

  info(message: string): void {
    if (this.shouldLog("info")) {
      console.log(`${this.getTimestamp()}INFO: ${message}`);
    }
  }

  warn(message: string): void {
    if (this.shouldLog("warn")) {
      console.warn(`${this.getTimestamp()}WARN: ${message}`);
    }
  }

  error(message: string, error?: Error): void {
    if (this.shouldLog("error")) {
      const errorDetails = error
        ? {
            name: error.name,
            message: error.message,
            stack: error.stack,
          }
        : undefined;

      console.error(`${this.getTimestamp()}ERROR: ${message}`, errorDetails);
    }
  }

  setupPageLogging(page: Page): void {
    this.logRequests(page);
    this.logResponses(page);
    //this.logConsole(page);
  }

  private logRequests(page: Page): void {
    page.on("request", (req) => {
      if (this.config.logLevel === "debug") {
        this.debug(`→ REQUEST: ${req.method()} ${req.url()}`);

        if (this.config.showHeaders) {
          this.debug(`  headers: ${JSON.stringify(req.headers())}`);
        }
      }
    });
  }

  private logResponses(page: Page): void {
    page.on("response", async (res) => {
      try {
        const status = res.status();
        const url = res.url();

        if (status >= 400) {
          this.error(`← RESPONSE ERROR: ${status} ${url}`);
        } else if (this.config.logLevel === "debug") {
          this.debug(`← RESPONSE: ${status} ${url}`);

          if (this.config.showHeaders) {
            this.debug(`  headers: ${JSON.stringify(await res.headers())}`);
          }
        }
      } catch (err) {
        this.error("Failed to read response", err as Error);
      }
    });
  }

  private logConsole(page: Page): void {
    page.on("console", (msg) => {
      const type = msg.type();
      const text = msg.text();

      switch (type) {
        case "error":
          this.error(`Browser: ${text}`);
          break;
        case "warn":
          this.warn(`Browser: ${text}`);
          break;
        default:
          this.debug(`Browser: ${text}`);
      }
    });
  }

  private getTimestamp(): string {
    if (!this.config.showTimestamp) return "";
    return `[${new Date().toISOString()}] `;
  }

  private shouldLog(level: LogLevel): boolean {
    return this.logLevels[level] >= this.logLevels[this.config.logLevel];
  }
}
