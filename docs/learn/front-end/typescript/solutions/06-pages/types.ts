import { ADT } from "shared/lib/types";

export type SharedState = Record<string, never>;

export type Route =
  | ADT<"hello", string>
  | ADT<"singleCounter">
  | ADT<"notFound", string>;
