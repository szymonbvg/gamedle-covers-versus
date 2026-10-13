import { Logger } from "./Logger";

export const USERNAME_REGEXP = new RegExp("^[A-Za-z0-9]{1,16}$", "i");

export function getGamedleUrl(): string {
  return process.env.GAMEDLE_URL ?? "https://www.gamedle.wtf";
}

export function getIgdbAPIUrl(): string {
  return process.env.IGDB_API_URL ?? "https://api.igdb.com";
}

export function getFastifyServerPort(): number {
  return process.env.FASTIFY_PORT ? parseInt(process.env.FASTIFY_PORT) : 3000;
}

export function getWebsocketServerPort(): number {
  return process.env.WS_SERVER_PORT ? parseInt(process.env.WS_SERVER_PORT) : 1337;
}

export function getLoggingDirectory(): string {
  return process.env.LOGGING_DIR ?? "./";
}

export function getHostConfirmationTimeout(): number {
  return process.env.HOST_CONFIRMATION_TIMEOUT_SECONDS
    ? parseInt(process.env.HOST_CONFIRMATION_TIMEOUT_SECONDS)
    : 120;
}

export function getCORSWhitelistUrls(): string[] {
  const urls = process.env.CORS_WHITELIST_URLS;
  if (!urls) return [];

  try {
    const parsed = JSON.parse(urls);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch (e) {
    Logger.error(e);
    return [];
  }
}
