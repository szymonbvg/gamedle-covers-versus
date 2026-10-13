import { Static, TSchema } from "@sinclair/typebox";
import { TypeCompiler } from "@sinclair/typebox/compiler";
import { WebSocketError, WSError } from "./WSError";

export class SchemaValidator<T extends TSchema> {
  private readonly schema: T;

  constructor(schema: T) {
    this.schema = schema;
  }

  public validate(data: unknown): Static<T> {
    const compile = TypeCompiler.Compile(this.schema);
    if (!compile.Check(data)) throw new WebSocketError(WSError.DEFAULT);

    return data;
  }
}
