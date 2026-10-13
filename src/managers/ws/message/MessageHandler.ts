import { TSchema } from "@sinclair/typebox";
import { MessageType } from "../../../types/websocket";
import { PlayerSession } from "../PlayerSession";
import { SchemaValidator } from "../../../util/SchemaValidator";

export abstract class MessageHandler {
  abstract readonly messageType: MessageType;
  readonly validator?: SchemaValidator<TSchema>;

  constructor() {}

  abstract handle(session: PlayerSession, messageData?: unknown): Promise<void>;
}
