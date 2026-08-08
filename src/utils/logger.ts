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

// In dev/RC builds every level is captured; production only keeps info and above.
const DEFAULT_CONFIG: LoggerConfig = {
  enabled: true,
  minLevel: __DEV__ ? "debug" : "info",
};

const LOG_LEVEL_WEIGHT: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

let config: LoggerConfig = { ...DEFAULT_CONFIG };

// Ring buffer — keeps the most recent BUFFER_MAX entries across all modules.
const BUFFER_MAX = 500;
const buffer: string[] = [];

const getTimestamp = (): string => new Date().toISOString();

const shouldLog = (level: LogLevel): boolean => {
  if (!config.enabled) return false;
  return LOG_LEVEL_WEIGHT[level] >= LOG_LEVEL_WEIGHT[config.minLevel];
};

const formatDetails = (details: unknown[]): string => {
  if (details.length === 0) return "";

  return details
    .map((detail) => {
      if (detail instanceof Error) {
        return detail.stack ?? `${detail.name}: ${detail.message}`;
      }
      if (typeof detail === "string") return detail;
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

  // Always buffer at the active minLevel, regardless of console routing.
  if (buffer.length >= BUFFER_MAX) buffer.shift();
  buffer.push(entry);

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
  config = { ...config, ...nextConfig };
};

export const resetLoggerConfig = (): void => {
  config = { ...DEFAULT_CONFIG };
};

// Returns all buffered log entries as a single newline-separated string.
// Safe to call at any time; never throws.
export const exportLogs = (): string => {
  const header = [
    `# Sous Chef diagnostic log`,
    `# Exported: ${getTimestamp()}`,
    `# Entries: ${buffer.length} (max ${BUFFER_MAX})`,
    `# Min level: ${config.minLevel}`,
    "",
  ].join("\n");
  return header + buffer.join("\n");
};

// Clears the in-memory buffer. Useful after sharing the log.
export const clearLogBuffer = (): void => {
  buffer.length = 0;
};

export const createLogger = (moduleName: string): ModuleLogger => ({
  debug: (message, ...details) => write("debug", moduleName, message, details),
  info: (message, ...details) => write("info", moduleName, message, details),
  warn: (message, ...details) => write("warn", moduleName, message, details),
  error: (message, ...details) => write("error", moduleName, message, details),
  child: (childModuleName) => createLogger(`${moduleName}:${childModuleName}`),
});
