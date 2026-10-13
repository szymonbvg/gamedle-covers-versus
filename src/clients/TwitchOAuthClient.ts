import axios from "axios";
import { readFileSync, writeFileSync } from "node:fs";
import { Logger } from "../util/Logger";

type Secrets = {
  access_token?: string;
  token_expiration_date?: number;
};

export class TwitchOAuthClient {
  public static readonly clientId = process.env.TWITCH_CLIENT_ID ?? "CoBysZrobil";

  private static readonly OAUTH_URL = process.env.TWITCH_OAUTH_URL ?? "https://id.twitch.tv/oauth2";

  private static readonly ACCESS_TOKEN_FALLBACK = "DwochPolakowWTeamiePrawda";
  private static readonly EXPIRATION_FALLBACK = 0;

  private static readonly clientSecret = process.env.TWITCH_CLIENT_SECRET ?? "kpm_pdk";
  private static accessToken = TwitchOAuthClient.ACCESS_TOKEN_FALLBACK;
  private static tokenExpirationDate = TwitchOAuthClient.EXPIRATION_FALLBACK;

  static loadSecrets() {
    try {
      const data = JSON.parse(readFileSync("./twitch-oauth-secrets.json", "utf-8"));
      const { access_token, token_expiration_date } = data as Secrets;
      TwitchOAuthClient.accessToken = access_token ?? TwitchOAuthClient.ACCESS_TOKEN_FALLBACK;
      TwitchOAuthClient.tokenExpirationDate = token_expiration_date ?? TwitchOAuthClient.EXPIRATION_FALLBACK;
    } catch (e) {
      Logger.error(e);
    }
  }

  static async refreshToken() {
    const id = TwitchOAuthClient.clientId;
    const secret = TwitchOAuthClient.clientSecret;

    const res = await axios.post(
      `${TwitchOAuthClient.OAUTH_URL}/token?client_id=${id}&client_secret=${secret}&grant_type=client_credentials`
    );

    const { access_token, expires_in } = res.data;
    if (!access_token || !expires_in) return false;

    const token_expiration_date = Date.now() + expires_in * 1000;

    TwitchOAuthClient.accessToken = access_token;
    TwitchOAuthClient.tokenExpirationDate = token_expiration_date;

    writeFileSync("./twitch-oauth-secrets.json", JSON.stringify({ access_token, token_expiration_date }), {
      encoding: "utf-8",
      flag: "w",
    });
  }

  static hasTokenExpired(): boolean {
    return Date.now() >= TwitchOAuthClient.tokenExpirationDate;
  }

  static getAccessToken(): string {
    return TwitchOAuthClient.accessToken;
  }
}
