export enum ErrorMessage {
  INVALID_USERNAME,
  LOBBY_ALREADY_EXISTS,
}

const messages: Record<ErrorMessage, string> = {
  [ErrorMessage.INVALID_USERNAME]: "Invalid username. Use only letters and numbers (1-16 chars)",
  [ErrorMessage.LOBBY_ALREADY_EXISTS]: "Lobby with your username already exists",
};

export function errPayload(type: ErrorMessage): { message: string } {
  return { message: messages[type] };
}
