import { CWUOpportunitySlim } from "shared/lib/resources/opportunity/code-with-us";
import { UserSlim } from "shared/lib/resources/user";
import { BodyWithErrors, Id } from "shared/lib/types";
import { ErrorTypeFrom } from "shared/lib/validation";

export interface CWUOpportunitySubscriber {
  opportunity: CWUOpportunitySlim;
  user: UserSlim;
  createdAt: Date;
}

export interface CreateRequestBody {
  opportunity: Id;
}

export type CreateValidationErrors = ErrorTypeFrom<CreateRequestBody> &
  BodyWithErrors;

export type DeleteValidationErrors = BodyWithErrors;
