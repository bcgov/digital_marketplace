import { ReactElement } from "react";
import { adtCurried, ADT } from "shared/lib/types";

// Toast

export type Toast =
  | ADT<"info", Content>
  | ADT<"error", Content>
  | ADT<"warning", Content>
  | ADT<"success", Content>;

export const info = adtCurried<Toast>("info");
export const error = adtCurried<Toast>("error");
export const warning = adtCurried<Toast>("warning");
export const success = adtCurried<Toast>("success");

//// Content

export interface Content {
  title: string;
  body: string | ReactElement;
}
