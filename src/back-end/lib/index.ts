import { ORIGIN } from "back-end/config";
import { prefix } from "shared/lib";
import { v4 } from "uuid";

export function generateUuid(): string {
  return v4();
}

export function prefixPath(path: string): string {
  return prefix(ORIGIN)(path);
}
