import type { GameSettings } from "../../types/game";
import { GameSession } from "./GameSession";

type AvailableGameLobbies = {
  lobbyName: string;
  isPrivate: boolean;
}[];

export class GameRegistry {
  private readonly games = new Map<string, GameSession>();

  public add(lobbyName: string, settings: GameSettings): GameSession | null {
    if (this.games.has(lobbyName)) return null;

    const game = new GameSession({ lobbyName, ...settings }, this.remove.bind(this, lobbyName));
    this.games.set(lobbyName, game);

    return game;
  }

  public remove(lobbyName: string) {
    this.games.delete(lobbyName);
  }

  public getGames(fromSegment: number = 0): AvailableGameLobbies {
    const g: AvailableGameLobbies = [];

    const iterator = this.games.values();
    for (let i = 0; i < 10 * fromSegment; i++) {
      iterator.next();
    }

    for (let i = 0; i < 10; i++) {
      const { value, done } = iterator.next();
      if (done) break;

      const { lobbyName, isPrivate } = value.properties;
      g.push({ lobbyName, isPrivate });
    }

    return g;
  }

  public get(lobbyName: string) {
    return this.games.get(lobbyName);
  }
}
