import { IGDBClient } from "../../clients/IGDBClient";
import {
  BaseGameInfo,
  GuessCategory,
  IdWithName,
  IGDBGameInfo,
  InvolvedCompany,
  RoundData,
} from "../../types/game";
import { PlayerSession } from "../ws/PlayerSession";

export type EvaluationResult = {
  totalScore: number;
  categories: number[];
  categoryValues?: Record<number, unknown>;
};

export class GuessEvaluator {
  static readonly CATEGORY_SCORING_RULES: Record<
    GuessCategory,
    {
      points: number;
      validate?: (roundData: RoundData, igdbGameInfo: IGDBGameInfo) => unknown;
    }
  > = {
    [GuessCategory.GAME]: { points: 100 },
    [GuessCategory.FRANCHISE]: { points: 28, validate: GuessEvaluator.validateFranchises },
    [GuessCategory.DEVELOPER]: {
      points: 16,
      validate: (a, b) => GuessEvaluator.validateInvolvedCompanies(a, b, "developer"),
    },
    [GuessCategory.PUBLISHER]: {
      points: 8,
      validate: (a, b) => GuessEvaluator.validateInvolvedCompanies(a, b, "publisher"),
    },
    [GuessCategory.RELEASE_YEAR]: { points: 12, validate: GuessEvaluator.validateReleaseYear },
    [GuessCategory.THEME]: {
      points: 8,
      validate: (a, b) => GuessEvaluator.validateBaseInfo(a, b, "id", "themes"),
    },
    [GuessCategory.GENRE]: {
      points: 8,
      validate: (a, b) => GuessEvaluator.validateBaseInfo(a, b, "id", "genres"),
    },
  };

  public async evaluate(playerSession: PlayerSession, gameId: number): Promise<EvaluationResult> {
    const roundData = playerSession.currentGame!.getRoundData()!;

    let result: EvaluationResult = { totalScore: 0, categories: [] };

    if (!playerSession.guessedCategories.has(GuessCategory.GAME) && gameId === roundData?.value) {
      result.categoryValues = { [GuessCategory.GAME]: roundData.label ?? null };
      result = this.getUpdatedResult(playerSession, result, GuessCategory.GAME);

      playerSession.guessedCategories.add(GuessCategory.GAME);

      return result;
    }

    const gameInfo = await IGDBClient.getGameInfo(gameId);
    if (!gameInfo) return result;

    Object.entries(GuessEvaluator.CATEGORY_SCORING_RULES).forEach(([key, rule]) => {
      if (!rule.validate) return;

      const category = Number(key);

      if (playerSession.guessedCategories.has(category)) return;

      const guessedValues = rule.validate(roundData, gameInfo);
      if (guessedValues === null) return;

      if (!result.categoryValues) {
        result.categoryValues = {};
      }
      result.categoryValues[category] = guessedValues;
      result = this.getUpdatedResult(playerSession, result, category);

      playerSession.guessedCategories.add(category);
    });

    return result;
  }

  private static validateReleaseYear(roundData: RoundData, igdbGameInfo: IGDBGameInfo): unknown {
    const releases = igdbGameInfo.release_dates;
    if (!releases) return null;

    const releaseYear = Number(roundData.releaseYear) || 0;
    const igdbRelease = releases[0].y;

    if (igdbRelease !== releaseYear) return null;
    return releaseYear;
  }

  private static validateFranchises(roundData: RoundData, igdbGameInfo: IGDBGameInfo): unknown {
    const result = GuessEvaluator.validateBaseInfo(roundData, igdbGameInfo, "id", "franchises");
    if (result !== null || !igdbGameInfo.collections) return result;

    const series = igdbGameInfo.collections.find((e) => e.id === (roundData.collection ?? 0));
    if (!series) return result;
    return [series];
  }

  private static validateInvolvedCompanies(
    roundData: RoundData,
    igdbGameInfo: IGDBGameInfo,
    type: "developer" | "publisher"
  ): unknown {
    const result = GuessEvaluator.validateBaseInfo<InvolvedCompany>(
      roundData,
      igdbGameInfo,
      "company",
      "involved_companies"
    ) as InvolvedCompany[] | null;
    if (!result || !igdbGameInfo.involved_companies) return null;

    const companiesByType = result.filter((e) => e[type] === true);
    if (companiesByType.length <= 0) return null;
    return companiesByType;
  }

  private static validateBaseInfo<T = IdWithName>(
    roundData: RoundData,
    igdbGameInfo: IGDBGameInfo,
    validateBy: keyof NoInfer<T>,
    key1: keyof BaseGameInfo,
    key2?: keyof BaseGameInfo
  ): unknown {
    const roundDataProperty = roundData[key1] as T[] | undefined;
    const igdbInfoProperty = igdbGameInfo[key2 ?? key1] as T[] | undefined;

    const ids = new Set(igdbInfoProperty?.map((e) => e[validateBy]));
    const arr = roundDataProperty?.filter((e) => ids.has(e[validateBy])) ?? [];

    if (arr.length <= 0) return null;
    return arr;
  }

  private getUpdatedResult(
    playerSession: PlayerSession,
    prevResult: EvaluationResult,
    category: GuessCategory
  ): EvaluationResult {
    let points = GuessEvaluator.CATEGORY_SCORING_RULES[category].points;
    points -= playerSession.getCurrentAttempt() * 2;
    const result = prevResult;
    result.categories.push(category);
    result.totalScore += points;
    return result;
  }
}
