import { createServer, IncomingMessage, Server } from "http";
import { Duplex } from "stream";
import { WebSocketServer, WebSocket } from "ws";
import { PlayerSession } from "./PlayerSession";
import { GameRegistry } from "../game/GameRegistry";
import { WSMessage } from "../../types/websocket";
import { WSError, WebSocketError } from "../../util/WSError";
import { MessageRouter } from "./message/MessageRouter";
import { getWebsocketServerPort } from "../../util/common";
import { Logger } from "../../util/Logger";

export class WebSocketManager {
  private wss?: WebSocketServer;
  private server?: Server;
  private readonly gameRegistry: GameRegistry;

  private readonly messageRouter = new MessageRouter();

  constructor(gameRegistry: GameRegistry) {
    this.gameRegistry = gameRegistry;
  }

  private upgrade(req: IncomingMessage, socket: Duplex, head: Buffer) {
    try {
      this.wss?.handleUpgrade(req, socket, head, (ws) => {
        this.wss?.emit("connection", ws, req, new PlayerSession(ws, this.gameRegistry));
      });
    } catch (e) {
      Logger.error(e);
    }
  }

  public init() {
    this.wss = new WebSocketServer({ noServer: true });

    this.server = createServer();
    this.server.on("upgrade", this.upgrade.bind(this));
    this.server.listen(getWebsocketServerPort(), "127.0.0.1");

    this.wss.on("connection", (ws: WebSocket, _req: IncomingMessage, session: PlayerSession) => {
      ws.on("message", async (data) => {
        try {
          const message = JSON.parse(data.toString()) as Partial<WSMessage>;
          await this.messageRouter.route(session, message);
        } catch (err) {
          if (err instanceof WebSocketError) {
            session.sendError(err.code, err.additionalData);
            return;
          }
          session.sendError(WSError.DEFAULT);
          Logger.error(err);
        }
      });
      ws.on("close", () => {
        session.cleanup();
      });
    });
  }
}
