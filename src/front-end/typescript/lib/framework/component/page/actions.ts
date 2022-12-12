import * as Link from "front-end/lib/views/link";
import { ADT, adt } from "shared/lib/types";

// Actions

export type Actions =
  | ADT<"links", Link.Props[]>
  | ADT<"dropdown", Dropdown>
  | ADT<"none">;

export function links(links_: Link.Props[]): Actions {
  return adt("links", links_) as Actions;
}

export function dropdown(dropdown_: Dropdown): Actions {
  return adt("dropdown", dropdown_) as Actions;
}

export function none(): Actions {
  return adt("none") as Actions;
}

//// Dropdown

export interface Dropdown {
  text: string;
  loading?: boolean;
  linkGroups: LinkGroup[];
}

export interface LinkGroup {
  label?: string;
  links: Link.Props[];
}
