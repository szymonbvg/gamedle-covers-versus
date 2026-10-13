import { Type } from "@sinclair/typebox";
import { MessageType } from "../../../../types/websocket";
import { MessageHandler } from "../MessageHandler";
import { SchemaValidator } from "../../../../util/SchemaValidator";
import { PlayerSession } from "../../PlayerSession";
import { WebSocketError, WSError } from "../../../../util/WSError";
import { USERNAME_REGEXP } from "../../../../util/common";

export class JoinGameHandler extends MessageHandler {
  readonly messageType = MessageType.JOIN_GAME;
  readonly validator = new SchemaValidator(
    Type.Object({
      username: Type.String(),
      lobbyName: Type.String(),
      lobbyCode: Type.Optional(Type.String()),
      token: Type.Optional(Type.String()),
    })
  );

  async handle(session: PlayerSession, messageData?: unknown): Promise<void> {
    const data = this.validator.validate(messageData);

    const gameSession = session.gameRegistry.get(data.lobbyName);

    if (!gameSession) throw new WebSocketError(WSError.LOBBY_NOT_FOUND);
    if (gameSession.isLobbyFull()) throw new WebSocketError(WSError.LOBBY_IS_FULL);
    if (gameSession.hasGameStarted()) throw new WebSocketError(WSError.GAME_ALREADY_STARTED);
    if (!USERNAME_REGEXP.test(data.username)) throw new WebSocketError(WSError.INVALID_USERNAME);

    if (data.username === gameSession.properties.lobbyName) {
      if (gameSession.adminToken !== data.token) throw new WebSocketError(WSError.UNAUTHORIZED);
      session.adminToken = gameSession.adminToken;
    }

    if (!session.adminToken && !gameSession.isLobbyCodeValid(data.lobbyCode)) {
      throw new WebSocketError(WSError.INVALID_LOBBY_CODE);
    }

    const err = gameSession.joinPlayer(data.username, session);
    if (err !== undefined) throw new WebSocketError(err);

    const { lobbyName: _, ...gameSettings } = gameSession.properties;

    session.send({
      type: MessageType.JOIN_SUCCESS,
      data: {
        serverTime: Date.now(),
        lobbyName: gameSession.properties.lobbyName,
        lobbyCode: gameSession.getLobbyCode(),
        gameSettings,
        hasAdminAccess: session.hasAdminAccess(),
      },
    });
  }
}
