import pino, { Level } from "pino";
import { getLoggingDirectory } from "./common";

export class Logger {
  private static pino?: pino.Logger;
  private static day?: number;

  public static initPino() {
    const date = new Date();
    this.day = date.getDate();
    const parsedDate = date.toISOString().split("T")[0];

    this.pino = pino(
      pino.transport({
        targets: [
          { level: "trace", target: "pino-pretty" },
          {
            level: "trace",
            target: "pino/file",
            options: { destination: `${getLoggingDirectory()}/${parsedDate}.log` },
          },
        ],
      })
    );
  }

  public static info(message: unknown) {
    Logger.log("info", message);
  }

  public static error(message: unknown) {
    Logger.log("error", message);
  }

  private static log(level: Level, data: unknown) {
    const date = new Date();
    if (date.getDate() !== this.day || !this.pino) {
      this.initPino();
    }

    this.pino![level](data);
  }
}
