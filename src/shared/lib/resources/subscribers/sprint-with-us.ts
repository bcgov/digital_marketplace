import { SWUOpportunitySlim } from "shared/lib/resources/opportunity/sprint-with-us";
import { UserSlim } from "shared/lib/resources/user";
import { BodyWithErrors, Id } from "shared/lib/types";
import { ErrorTypeFrom } from "shared/lib/validation";

export interface SWUOpportunitySubscriber {
  opportunity: SWUOpportunitySlim;
  user: UserSlim;
  createdAt: Date;
}

export interface CreateRequestBody {
  opportunity: Id;
}

export type CreateValidationErrors = ErrorTypeFrom<CreateRequestBody> &
  BodyWithErrors;

export type DeleteValidationErrors = BodyWithErrors;
