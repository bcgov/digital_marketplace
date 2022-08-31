import * as Resource from "shared/lib/resources/addendum";

export interface RawAddendum extends Omit<Resource.Addendum, "createdAt"> {
  createdAt: string;
}

export function rawAddendumToAddendum(raw: RawAddendum): Resource.Addendum {
  return {
    ...raw,
    createdAt: new Date(raw.createdAt)
  };
}
