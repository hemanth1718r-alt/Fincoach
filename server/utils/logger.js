/**
 * Minimal structured logger with timestamps and log levels.
 * Replaces scattered console.log calls with a consistent format.
 */
const LOG_LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };
const CURRENT_LEVEL = LOG_LEVELS[process.env.LOG_LEVEL || "info"];

function timestamp() {
  return new Date().toISOString();
}

function log(level, message, data) {
  if (LOG_LEVELS[level] < CURRENT_LEVEL) return;

  const prefix = `[${timestamp()}] [${level.toUpperCase()}]`;
  const payload = data ? ` ${JSON.stringify(data)}` : "";

  if (level === "error") {
    console.error(`${prefix} ${message}${payload}`);
  } else if (level === "warn") {
    console.warn(`${prefix} ${message}${payload}`);
  } else {
    console.log(`${prefix} ${message}${payload}`);
  }
}

module.exports = {
  debug: (msg, data) => log("debug", msg, data),
  info:  (msg, data) => log("info", msg, data),
  warn:  (msg, data) => log("warn", msg, data),
  error: (msg, data) => log("error", msg, data)
};
