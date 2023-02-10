import { ADT, Id } from "shared/lib/types";
import { UserSlim } from "shared/lib/resources/user";
import { TWUOpportunitySlim } from "shared/lib/resources/opportunity/team-with-us";
import { FileRecord } from "shared/lib/resources/file";
import { Organization } from "shared/lib/resources/organization";

export enum TWUProposalStatus {
  Draft = "DRAFT",
  Submitted = "SUBMITTED",
  UnderReview = "UNDER_REVIEW",
  Evaluated = "EVALUATED",
  Awarded = "AWARDED",
  NotAwarded = "NOT_AWARDED",
  Disqualified = "DISQUALIFIED",
  Withdrawn = "WITHDRAWN"
}

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
