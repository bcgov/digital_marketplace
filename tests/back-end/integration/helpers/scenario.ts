import { PG_CONFIG } from "back-end/config";
import { connectToDatabase } from "back-end/index";
import {
  createCWUOpportunity,
  CreateCWUOpportunityParams,
  createCWUProposal,
  CreateCWUProposalParams
} from "back-end/lib/db";
import {
  testCreateAdminUserParams,
  testCreateVendorUserParams,
  testCreateVendorUserParams2
} from "../resources/user.test";
import { CWUOpportunityStatus } from "shared/lib/resources/opportunity/code-with-us";
import { CWUProposalStatus } from "shared/lib/resources/proposal/code-with-us";
import { getValidValue } from "shared/lib/validation";
import { insertUserWithActiveSession } from "./user";

const testCreateCWUOpportunityParams: CreateCWUOpportunityParams = {
  title: "Test CWU Opportunity",
  teaser: "Sample Teaser",
  remoteOk: false,
  remoteDesc: "Sample Remote Description",
  location: "Victoria",
  reward: 70000,
  skills: ["foo", "bar"],
  description: "Sample Description Lorem Ipsum",
  proposalDeadline: new Date("2021-02-15"),
  assignmentDate: new Date("2021-02-15"),
  startDate: new Date("2021-02-15"),
  completionDate: new Date("2021-02-20"),
  submissionInfo: "github.com",
  acceptanceCriteria: "Sample Acceptance Criteria",
  evaluationCriteria: "Sample Evaluation Criteria",
  status: CWUOpportunityStatus.Draft,
  attachments: []
};

/**
 * Set up a testing scenario with a CWU opportunity and two submitted vendor proposals.
 */
export async function setupCWUScenario1() {
  const connection = await connectToDatabase(PG_CONFIG);

  // Create an admin session
  const [, testAdminSession] = await insertUserWithActiveSession(
    testCreateAdminUserParams
  );

  // Create two vendor sessions
  const [, testVendorSession1] = await insertUserWithActiveSession(
    testCreateVendorUserParams
  );
  const [, testVendorSession2] = await insertUserWithActiveSession(
    testCreateVendorUserParams2
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
}
