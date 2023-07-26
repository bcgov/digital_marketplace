import { PG_CONFIG } from "back-end/config";
import { connectToDatabase } from "back-end/index";
import {
  createAffiliation,
  createOrganization,
  CreateOrganizationParams,
  createSWUOpportunity,
  CreateSWUOpportunityParams,
  createSWUProposal,
  CreateSWUProposalParams
} from "back-end/lib/db";
import {
  testCreateAdminUserParams,
  testCreateVendorUserParams,
  testCreateVendorUserParams2
} from "../resources/user.test";
import { getValidValue } from "shared/lib/validation";
import { insertUserWithActiveSession } from "./user";
import { SessionRecord } from "shared/lib/resources/session";
import {
  SWUOpportunity,
  SWUOpportunityStatus
} from "shared/lib/resources/opportunity/sprint-with-us";
import {
  SWUProposal,
  SWUProposalStatus
} from "shared/lib/resources/proposal/sprint-with-us";
import {
  MembershipStatus,
  MembershipType
} from "shared/lib/resources/affiliation";
import { Organization } from "shared/lib/resources/organization";

export const testCreateSWUOpportunityParams: CreateSWUOpportunityParams = {
  title: "Sample Title",
  teaser: "Sample Teaser",
  remoteOk: false,
  remoteDesc: "Need you here",
  location: "Victoria",
  totalMaxBudget: 500000,
  minTeamMembers: 2,
  mandatorySkills: ["foo", "bar"],
  optionalSkills: ["yam"],
  description: "Sample Description Lorem Ipsum",
  proposalDeadline: new Date("2021-02-15"),
  assignmentDate: new Date("2021-02-15"),
  questionsWeight: 20,
  codeChallengeWeight: 20,
  scenarioWeight: 40,
  priceWeight: 20,
  status: SWUOpportunityStatus.Published,
  prototypePhase: {
    startDate: new Date("2021-02-28"),
    completionDate: new Date("2021-03-10"),
    maxBudget: 200000,
    requiredCapabilities: [
      {
        capability: "Agile Coaching",
        fullTime: false
      }
    ]
  },
  implementationPhase: {
    startDate: new Date("2021-03-11"),
    completionDate: new Date("2021-03-31"),
    maxBudget: 500000,
    requiredCapabilities: [
      {
        capability: "Agile Coaching",
        fullTime: false
      }
    ]
  },
  teamQuestions: [
    {
      question: "foo",
      guideline: "bar",
      score: 5,
      wordLimit: 300,
      order: 1
    }
  ],
  attachments: []
};

interface SWUScenario1 {
  swuOpportunity: SWUOpportunity;
  swuProposal1: SWUProposal;
  swuProposal2: SWUProposal;
  testAdminSession: SessionRecord;
  testVendorSession1: SessionRecord;
  testVendorSession2: SessionRecord;
}

interface OrgSetupResult {
  organization1: Organization;
  organization2: Organization;
  testVendorSession1: SessionRecord;
  testVendorSession2: SessionRecord;
}

/**
 * Set up a testing scenario with a SWU opportunity and two submitted vendor proposals. This requires setting up vendor organizations with an RFQ status.
 */
export async function setupSWUScenario1(): Promise<SWUScenario1> {
  const connection = await connectToDatabase(PG_CONFIG);

  // Create an admin session
  const [, testAdminSession] = await insertUserWithActiveSession(
    testCreateAdminUserParams
  );

  if (!testAdminSession) {
    throw new Error("Failed to create test sessions");
  }

  // Create SWU opportunity using admin session
  const swuOpportunity = getValidValue(
    await createSWUOpportunity(
      connection,
      testCreateSWUOpportunityParams,
      testAdminSession
    ),
    null
  );

  if (!swuOpportunity) {
    throw new Error("Failed to create test SWU opportunity");
  }

  // Setup organizations
  const {
    organization1,
    organization2,
    testVendorSession1,
    testVendorSession2
  } = await setupOrgsWithRFQ();

  // Create two vendor proposals
  const testSWUProposal1: CreateSWUProposalParams = {
    opportunity: swuOpportunity.id,
    organization: organization1.id,
    prototypePhase: {
      members: [
        {
          member: testVendorSession1.user.id,
          scrumMaster: true
        },
        {
          member: testVendorSession2.user.id,
          scrumMaster: false
        }
      ],
      proposedCost: 1
    },
    implementationPhase: {
      members: [
        {
          member: testVendorSession1.user.id,
          scrumMaster: true
        },
        {
          member: testVendorSession2.user.id,
          scrumMaster: false
        }
      ],
      proposedCost: 2
    },
    references: [
      {
        name: "Bob Loblaw",
        company: "Bob Loblaw Law Firm",
        phone: "250-415-3480",
        email: "bobloblawlaw@bobloblawlawfirm.com",
        order: 1
      }
    ],
    teamQuestionResponses: [
      {
        response: "We are the best",
        order: 1
      }
    ],
    attachments: [],
    status: SWUProposalStatus.Submitted
  };

  const testSWUProposal2: CreateSWUProposalParams = {
    ...testSWUProposal1,
    organization: organization2.id
  };

  const proposal1 = getValidValue(
    await createSWUProposal(connection, testSWUProposal1, testVendorSession1),
    null
  );

  const proposal2 = getValidValue(
    await createSWUProposal(connection, testSWUProposal2, testVendorSession2),
    null
  );

  if (!proposal1 || !proposal2) {
    throw new Error("Failed to create test SWU proposals");
  }

  return {
    swuOpportunity,
    swuProposal1: proposal1,
    swuProposal2: proposal2,
    testAdminSession,
    testVendorSession1,
    testVendorSession2
  };
}

async function setupOrgsWithRFQ(): Promise<OrgSetupResult> {
  const connection = await connectToDatabase(PG_CONFIG);

  // Create two vendor sessions
  const [, testVendorSession1] = await insertUserWithActiveSession(
    testCreateVendorUserParams
  );
  const [, testVendorSession2] = await insertUserWithActiveSession(
    testCreateVendorUserParams2
  );

  if (!testVendorSession1 || !testVendorSession2) {
    throw new Error("Failed to create test sessions");
  }

  // Create two vendor organizations (one for each vendor)
  const testOrgParams: CreateOrganizationParams = {
    legalName: "Company",
    websiteUrl: "https://www.google.ca",
    streetAddress1: "555 Johnson",
    city: "Victoria",
    region: "BC",
    mailCode: "V8Z 1T8",
    country: "Canada",
    contactName: "First Last",
    contactEmail: "digitalmarketplace@gov.bc.ca",
    acceptedSWUTerms: new Date()
  };

  const org1 = getValidValue(
    await createOrganization(
      connection,
      testVendorSession1.user.id,
      { ...testOrgParams, legalName: "Company 1" },
      testVendorSession1
    ),
    null
  );

  const org2 = getValidValue(
    await createOrganization(
      connection,
      testVendorSession2.user.id,
      { ...testOrgParams, legalName: "Company 2" },
      testVendorSession2
    ),
    null
  );

  if (!org1 || !org2) {
    throw new Error("Failed to create test organizations");
  }

  // Create affiliations within each org using other vendor
  await createAffiliation(connection, {
    user: testVendorSession2.user.id,
    organization: org1.id,
    membershipType: MembershipType.Member,
    membershipStatus: MembershipStatus.Active
  });

  await createAffiliation(connection, {
    user: testVendorSession1.user.id,
    organization: org2.id,
    membershipType: MembershipType.Member,
    membershipStatus: MembershipStatus.Active
  });

  return {
    organization1: org1,
    organization2: org2,
    testVendorSession1,
    testVendorSession2
  };
}
