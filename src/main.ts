import "dotenv/config";
import { GameRegistry } from "./managers/game/GameRegistry";
import { readFileSync } from "node:fs";
import { Globals } from "./globals";
import { TwitchOAuthClient } from "./clients/TwitchOAuthClient";
import { FastifyServer } from "./http/FastifyServer";
import { WebSocketManager } from "./managers/ws/WSManager";
import { Logger } from "./util/Logger";
import { getFastifyServerPort, getWebsocketServerPort } from "./util/common";

async function main() {
  Logger.initPino();

  Globals.propertiesNormalizationSettings = JSON.parse(
    readFileSync("./game-properties.settings.json", "utf-8")
  );

  TwitchOAuthClient.loadSecrets();
  if (TwitchOAuthClient.hasTokenExpired()) {
    await TwitchOAuthClient.refreshToken();
    Logger.info("TwitchOAuth token refreshed");
  }

  const gameRegistry = new GameRegistry();
  const fastifyServer = new FastifyServer(gameRegistry);
  const wsManager = new WebSocketManager(gameRegistry);

  fastifyServer.init();
  wsManager.init();

  Logger.info(`Fastify server successfully launched on port ${getFastifyServerPort()}`);
  Logger.info(`WebSocket server successfully launched on port ${getWebsocketServerPort()}`);
}

main().catch((e) => {
  Logger.error(e);
  process.exit(1);
});
