import { CWUOpportunitySlim } from 'shared/lib/resources/cwu-opportunity';
import { FileRecord } from 'shared/lib/resources/file';
import { Organization } from 'shared/lib/resources/organization';
import { User } from 'shared/lib/resources/user';
import { Id } from 'shared/lib/types';

export enum ProposalStatus {
  Draft = 'DRAFT',
  Submitted = 'SUBMITTED',
  Review = 'REVIEW',
  Awarded = 'AWARDED',
  NotAwarded = 'NOT_AWARDED',
  Disqualified = 'DISQUALIFIED',
  Withdrawn = 'WITHDRAWN'
}

export interface CWUProposal {
  id: Id;
  createdBy: User;
  createdAt: Date;
  opportunity: CWUOpportunitySlim;
  proposalText: string;
  additionalComments: string;
  proponent?: CWUProponent;
  proponentOrg?: Organization;
  score: number;
  status: ProposalStatus;
  attachments: FileRecord;
}

export type CWUProposalSlim = Omit<CWUProposal, 'attachments'>;

export interface CWUProponent {
  id: Id;
  legalName: string;
  email: string;
  phone: string;
  street1: string;
  street2: string;
  city: string;
  region: string;
  mailCode: string;
  country: string;
}
