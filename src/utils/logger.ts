type LogLevel = "debug" | "info" | "warn" | "error";

interface LoggerConfig {
  enabled: boolean;
  minLevel: LogLevel;
}

interface ModuleLogger {
  debug: (message: string, ...details: unknown[]) => void;
  info: (message: string, ...details: unknown[]) => void;
  warn: (message: string, ...details: unknown[]) => void;
  error: (message: string, ...details: unknown[]) => void;
  child: (childModuleName: string) => ModuleLogger;
}

const DEFAULT_CONFIG: LoggerConfig = {
  enabled: true,
  minLevel: "debug",
};

const LOG_LEVEL_WEIGHT: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

let config: LoggerConfig = { ...DEFAULT_CONFIG };

const getTimestamp = (): string => {
  return new Date().toISOString();
};

const shouldLog = (level: LogLevel): boolean => {
  if (!config.enabled) return false;

  return LOG_LEVEL_WEIGHT[level] >= LOG_LEVEL_WEIGHT[config.minLevel];
};

const formatDetails = (details: unknown[]): string => {
  if (details.length === 0) return "";

  return details
    .map((detail) => {
      if (detail instanceof Error) {
        return `${detail.name}: ${detail.message}`;
      }

      if (typeof detail === "string") {
        return detail;
      }

      try {
        return JSON.stringify(detail);
      } catch {
        return String(detail);
      }
    })
    .join(" ");
};

const formatEntry = (
  level: LogLevel,
  moduleName: string,
  message: string,
  details: unknown[],
): string => {
  const detailText = formatDetails(details);

  const base = `[${getTimestamp()}]\t[${moduleName}]\t[${level.toUpperCase()}]\t${message}`;

  return detailText ? `${base}\t${detailText}` : base;
};

const write = (
  level: LogLevel,
  moduleName: string,
  message: string,
  details: unknown[],
): void => {
  if (!shouldLog(level)) return;

  const entry = formatEntry(level, moduleName, message, details);

  switch (level) {
    case "debug":
      console.debug(entry);
      return;

    case "info":
      console.info(entry);
      return;

    case "warn":
      console.warn(entry);
      return;

    case "error":
      console.error(entry);
      return;
  }
};

export const configureLogger = (nextConfig: Partial<LoggerConfig>): void => {
  config = {
    ...config,
    ...nextConfig,
  };
};

export const resetLoggerConfig = (): void => {
  config = { ...DEFAULT_CONFIG };
};

export const createLogger = (moduleName: string): ModuleLogger => {
  return {
    debug: (message, ...details) => {
      write("debug", moduleName, message, details);
    },

    info: (message, ...details) => {
      write("info", moduleName, message, details);
    },

    warn: (message, ...details) => {
      write("warn", moduleName, message, details);
    },

    error: (message, ...details) => {
      write("error", moduleName, message, details);
    },

    child: (childModuleName) => {
      return createLogger(`${moduleName}:${childModuleName}`);
    },
  };
};
