import axios from "axios";
import { getIgdbAPIUrl } from "../util/common";
import { IGDBGameInfo } from "../types/game";
import { TwitchOAuthClient } from "./TwitchOAuthClient";
import { Logger } from "../util/Logger";

export class IGDBClient {
  public static async getGameInfo(gameId: number): Promise<IGDBGameInfo | null> {
    try {
      const res = await axios.post(
        `${getIgdbAPIUrl()}/v4/games`,
        `fields
        genres.name,
        themes.name,
        franchises.name,
        collections.name,
        release_dates.y,
        involved_companies.company,
        involved_companies.developer,
        involved_companies.publisher
      ; where id = ${gameId};`,
        {
          headers: {
            "Client-ID": TwitchOAuthClient.clientId,
            Authorization: `Bearer ${TwitchOAuthClient.getAccessToken()}`,
          },
        }
      );

      if (!Array.isArray(res.data) || res.data.length <= 0) return null;

      return res.data[0] as IGDBGameInfo;
    } catch (e) {
      Logger.error(e);
      return null;
    }
  }
}
