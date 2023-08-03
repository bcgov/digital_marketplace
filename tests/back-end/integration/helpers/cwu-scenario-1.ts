import {
  createCWUOpportunity,
  CreateCWUOpportunityParams,
  createCWUProposal,
  CreateCWUProposalParams
} from "back-end/lib/db";
import {
  CWUOpportunity,
  CWUOpportunityStatus
} from "shared/lib/resources/opportunity/code-with-us";
import {
  CWUProposal,
  CWUProposalStatus
} from "shared/lib/resources/proposal/code-with-us";
import { getValidValue } from "shared/lib/validation";
import { insertUserWithActiveSession } from "./user";
import { SessionRecord } from "shared/lib/resources/session";
import { connection } from "tests/back-end/setup-server.jest";
import { UserType } from "shared/lib/resources/user";
import { buildCreateUserParams } from "tests/utils/generate/user";

export const testCreateCWUOpportunityParams: CreateCWUOpportunityParams = {
  title: "Test CWU Opportunity",
  teaser: "Sample Teaser",
  remoteOk: false,
  remoteDesc: "Sample Remote Description",
  location: "Victoria",
  reward: 70000,
  skills: ["foo", "bar"],
  description: "Sample Description Lorem Ipsum",
  proposalDeadline: new Date("2999-02-15"), // Set this far in the future for now
  assignmentDate: new Date("2021-02-15"),
  startDate: new Date("2021-02-15"),
  completionDate: new Date("2021-02-20"),
  submissionInfo: "github.com",
  acceptanceCriteria: "Sample Acceptance Criteria",
  evaluationCriteria: "Sample Evaluation Criteria",
  status: CWUOpportunityStatus.Published,
  attachments: []
};

interface CWUScenario1 {
  cwuOpportunity: CWUOpportunity;
  cwuProposal1: CWUProposal;
  cwuProposal2: CWUProposal;
  testAdminSession: SessionRecord;
  testVendorSession1: SessionRecord;
  testVendorSession2: SessionRecord;
}

/**
 * Set up a testing scenario with a CWU opportunity and two submitted vendor proposals.
 */
export async function setupCWUScenario1(): Promise<CWUScenario1> {
  // Create an admin session
  const [, testAdminSession] = await insertUserWithActiveSession(
    buildCreateUserParams({
      type: UserType.Admin
    }),
    connection
  );

  // Create two vendor sessions
  const [, testVendorSession1] = await insertUserWithActiveSession(
    buildCreateUserParams({
      type: UserType.Vendor
    }),
    connection
  );
  const [, testVendorSession2] = await insertUserWithActiveSession(
    buildCreateUserParams({
      type: UserType.Vendor
    }),
    connection
  );

  if (!testAdminSession || !testVendorSession1 || !testVendorSession2) {
    throw new Error("Failed to create test sessions");
  }

  // Create CWU opportunity using admin session
  const cwuOpportunity = getValidValue(
    await createCWUOpportunity(
      connection,
      testCreateCWUOpportunityParams,
      testAdminSession
    ),
    null
  );

  if (!cwuOpportunity) {
    throw new Error("Failed to create test CWU opportunity");
  }

  // Create two vendor proposals using vendor sessions
  const testCreateCWUProposalParams1: CreateCWUProposalParams = {
    opportunity: cwuOpportunity.id,
    proposalText: "Sample Proposal Text",
    additionalComments: "Sample Additional Comments",
    proponent: {
      tag: "individual",
      value: {
        legalName: "Jane Doe",
        email: "janedoe@email.com",
        phone: "222-222-2222",
        street1: "foo",
        street2: "bar",
        city: "Saskatoon",
        region: "SK",
        mailCode: "S7H0W2",
        country: "Canada"
      }
    },
    attachments: [],
    status: CWUProposalStatus.Submitted
  };

  const testCreateCWUProposalParams2: CreateCWUProposalParams = {
    opportunity: cwuOpportunity.id,
    proposalText: "Sample Proposal Text 2",
    additionalComments: "Sample Additional Comments 2",
    proponent: {
      tag: "individual",
      value: {
        legalName: "John Doe",
        email: "foo@bar.com",
        phone: "555-555-5555",
        street1: "bizz",
        street2: "bang",
        city: "Saskatoon",
        region: "SK",
        mailCode: "S7H0W2",
        country: "Canada"
      }
    },
    attachments: [],
    status: CWUProposalStatus.Submitted
  };

  const cwuProposal1 = getValidValue(
    await createCWUProposal(
      connection,
      testCreateCWUProposalParams1,
      testVendorSession1
    ),
    null
  );

  const cwuProposal2 = getValidValue(
    await createCWUProposal(
      connection,
      testCreateCWUProposalParams2,
      testVendorSession2
    ),
    null
  );

  if (!cwuProposal1 || !cwuProposal2) {
    throw new Error("Failed to create test CWU proposals");
  }

  return {
    cwuOpportunity,
    cwuProposal1,
    cwuProposal2,
    testAdminSession,
    testVendorSession1,
    testVendorSession2
  };
}
