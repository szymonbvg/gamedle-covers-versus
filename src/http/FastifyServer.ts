import Fastify from "fastify";
import cors from "@fastify/cors";
import { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import { Type } from "@sinclair/typebox";
import axios, { HttpStatusCode } from "axios";
import { GameRegistry } from "../managers/game/GameRegistry";
import { ErrorMessage, errPayload } from "./error-messages";
import { getFastifyServerPort, getCORSWhitelistUrls, getGamedleUrl, USERNAME_REGEXP } from "../util/common";
import { Logger } from "../util/Logger";

export class FastifyServer {
  private readonly server = Fastify().withTypeProvider<TypeBoxTypeProvider>();
  private readonly gameRegistry: GameRegistry;

  private corsWhitelist: string[];

  constructor(gameRegistry: GameRegistry) {
    this.gameRegistry = gameRegistry;
    this.corsWhitelist = [...getCORSWhitelistUrls()];
  }

  public async init() {
    this.server.get(
      "/games",
      { schema: { querystring: Type.Object({ i: Type.Optional(Type.Number()) }) } },
      (req, res) => {
        const { i } = req.query;
        res.status(HttpStatusCode.Ok).send(this.gameRegistry.getGames(i));
      }
    );

    this.server.get(
      "/autocomplete",
      { schema: { querystring: Type.Object({ q: Type.String() }) } },
      async (req, res) => {
        try {
          const { q } = req.query;
          const encodedQ = encodeURIComponent(q);

          const gamedleAutocomplete = await axios.get(
            `${getGamedleUrl()}/api/autocomplete?q=${encodedQ}&lang=en`
          );

          res.status(HttpStatusCode.Ok).send(gamedleAutocomplete.data);
        } catch (e) {
          Logger.error(e);
          res.status(HttpStatusCode.Ok).send([]);
        }
      }
    );

    this.server.post(
      "/host_game",
      {
        schema: {
          body: Type.Object({
            username: Type.String(),
            gameSettings: Type.Object({
              maxPlayers: Type.Number(),
              rounds: Type.Number(),
              roundTimeSeconds: Type.Number(),
              difficulty: Type.Number(),
              isPrivate: Type.Boolean(),
            }),
          }),
        },
      },
      (req, res) => {
        const { username, gameSettings } = req.body;

        if (!USERNAME_REGEXP.test(username)) {
          res.status(HttpStatusCode.BadRequest).send(errPayload(ErrorMessage.INVALID_USERNAME));
          return;
        }

        const session = this.gameRegistry.add(username, gameSettings);
        if (!session) {
          res.status(HttpStatusCode.BadRequest).send(errPayload(ErrorMessage.LOBBY_ALREADY_EXISTS));
          return;
        }

        res.status(HttpStatusCode.Ok).send({
          token: session.adminToken,
          lobbyCode: session.getLobbyCode(),
        });
      }
    );

    await this.server.register(cors, {
      origin: (origin, cb) => cb(null, !!origin && this.corsWhitelist.includes(origin)),
    });

    await this.server.listen({ port: getFastifyServerPort() });
  }
}
