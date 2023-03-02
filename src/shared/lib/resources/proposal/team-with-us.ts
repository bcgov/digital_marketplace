import { adt, ADT, BodyWithErrors, Id } from "shared/lib/types";
import { UserSlim } from "shared/lib/resources/user";
import { TWUOpportunitySlim } from "shared/lib/resources/opportunity/team-with-us";
import { FileRecord } from "shared/lib/resources/file";
import { Organization } from "shared/lib/resources/organization";
import { ErrorTypeFrom } from "shared/lib/validation";

export enum TWUProposalStatus {
  Draft = "DRAFT",
  Submitted = "SUBMITTED",
  UnderReviewResourceQuestions = "UNDER_REVIEW_QUESTIONS",
  EvaluatedResourceQuestions = "EVALUATED_QUESTIONS",
  UnderReviewChallenge = "UNDER_REVIEW_CHALLENGE",
  EvaluatedChallenge = "EVALUATED_CHALLENGE",
  Awarded = "AWARDED",
  NotAwarded = "NOT_AWARDED",
  Disqualified = "DISQUALIFIED",
  Withdrawn = "WITHDRAWN"
}

export type CreateTWUProposalStatus =
  | TWUProposalStatus.Draft
  | TWUProposalStatus.Submitted;

export interface TWUProposal {
  id: Id;
  createdBy: UserSlim;
  createdAt: Date;
  updatedBy?: UserSlim;
  updatedAt: Date;
  submittedAt?: Date;
  opportunity: TWUOpportunitySlim;
  proposalText: string;
  additionalComments: string;
  proponent: TWUProponent;
  score?: number;
  rank?: number;
  status: TWUProposalStatus;
  attachments: FileRecord[];
  history?: TWUProposalHistoryRecord[];
}

export type TWUProposalSlim = Omit<
  TWUProposal,
  "proposalText" | "additionalComments" | "history" | "attachments"
>;

export interface TWUIndividualProponent {
  id: Id;
  legalName: string;
  email: string;
  phone?: string;
  street1: string;
  street2?: string;
  city: string;
  region: string;
  mailCode: string;
  country: string;
}

type TWUProponent =
  | ADT<"individual", TWUIndividualProponent>
  | ADT<"organization", Organization>;

export interface TWUProposalHistoryRecord {
  id: Id;
  createdAt: Date;
  createdBy: UserSlim | null;
  type: ADT<"status", TWUProposalStatus> | ADT<"event", TWUProposalEvent>;
  note: string;
}

export enum TWUProposalEvent {
  ScoreEntered = "SCORE_ENTERED"
}

/**
 * User-defined type guard to narrow raw input to a TWUProposalStatus.
 *
 * @see {@link https://www.typescriptlang.org/docs/handbook/2/narrowing.html#using-type-predicates}
 *
 * @param raw - a string value
 * @returns boolean
 */
function isTWUProposalStatus(
  raw: string | TWUProposalStatus
): raw is TWUProposalStatus {
  return Object.values(TWUProposalStatus).includes(raw as TWUProposalStatus);
}

/**
 * Determines if a raw string is part of the enum TWUProposalStatus and returns
 * the passed value or null.
 *
 * @see {@link TWUProposalStatus}
 *
 * @param raw - a string value
 * @returns TWUProposalStatus | null
 */
export function parseTWUProposalStatus(raw: string): TWUProposalStatus | null {
  return isTWUProposalStatus(raw) ? raw : null;
}

export function createBlankIndividualProponent(): CreateProponentRequestBody {
  return adt("individual", {
    legalName: "",
    email: "",
    phone: null,
    street1: "",
    street2: null,
    city: "",
    region: "",
    mailCode: "",
    country: ""
  });
}

export type CreateProponentRequestBody =
  | ADT<"individual", CreateIndividualProponentRequestBody>
  | ADT<"organization", Id>;

export interface CreateIndividualProponentRequestBody
  extends Omit<TWUIndividualProponent, "id" | "phone" | "street2"> {
  phone: string | null;
  street2: string | null;
}

export interface UpdateValidationErrors extends BodyWithErrors {
  proposal?: UpdateADTErrors;
}

type UpdateADTErrors =
  | ADT<"edit", UpdateEditValidationErrors>
  | ADT<"submit", string[]>
  | ADT<"score", string[]>
  | ADT<"award", string[]>
  | ADT<"disqualify", string[]>
  | ADT<"withdraw", string[]>
  | ADT<"parseFailure">;

export interface CreateValidationErrors
  extends Omit<
    ErrorTypeFrom<CreateRequestBody> & BodyWithErrors,
    "proponent" | "attachments"
  > {
  proponent?: CreateProponentValidationErrors;
  attachments?: string[][];
}

export type CreateProponentValidationErrors =
  | ADT<"individual", CreateIndividualProponentValidationErrors>
  | ADT<"organization", string[]>
  | ADT<"parseFailure", string[]>;

export type CreateIndividualProponentValidationErrors =
  ErrorTypeFrom<CreateIndividualProponentRequestBody>;

export interface CreateRequestBody {
  opportunity: Id;
  proposalText: string;
  additionalComments: string;
  proponent: CreateProponentRequestBody;
  attachments: Id[];
  status: CreateTWUProposalStatus;
}

export interface UpdateEditValidationErrors
  extends ErrorTypeFrom<
    Omit<UpdateEditRequestBody, "proponent" | "attachments">
  > {
  proponent?: CreateProponentValidationErrors;
  attachments?: string[][];
}

export type UpdateRequestBody =
  | ADT<"edit", UpdateEditRequestBody>
  | ADT<"submit", string>
  | ADT<"score", number>
  | ADT<"award", string>
  | ADT<"disqualify", string>
  | ADT<"withdraw", string>;

export type UpdateEditRequestBody = Omit<
  CreateRequestBody,
  "opportunity" | "status"
>;

export interface UpdateEditValidationErrors
  extends ErrorTypeFrom<
    Omit<UpdateEditRequestBody, "proponent" | "attachments">
  > {
  proponent?: CreateProponentValidationErrors;
  attachments?: string[][];
}
