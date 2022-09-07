import { BodyWithErrors, Id } from "shared/lib/types";

export interface Counter {
  name: string;
  count: number;
}

export type UpdateRequestBody = null;

export interface UpdateValidationErrors extends BodyWithErrors {
  name?: string[];
}

export function getCWUOpportunityViewsCounterName(id: Id): string {
  return `opportunity.code-with-us.${id}.views`;
}

export function getSWUOpportunityViewsCounterName(id: Id): string {
  return `opportunity.sprint-with-us.${id}.views`;
}
