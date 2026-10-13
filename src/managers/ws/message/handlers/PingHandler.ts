import { MessageType } from "../../../../types/websocket";
import { PlayerSession } from "../../PlayerSession";
import { MessageHandler } from "../MessageHandler";

export class PingHandler implements MessageHandler {
  readonly messageType = MessageType.PING;

  async handle(session: PlayerSession, _messageData?: unknown): Promise<void> {
    session.send({ type: MessageType.PONG, data: { serverTime: Date.now() } });
  }
}
