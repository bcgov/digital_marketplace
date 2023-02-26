import { connectToDatabase } from "back-end/index";
import { closeCWUOpportunities } from "back-end/lib/db";
import CAPABILITY_NAMES_ONLY from "shared/lib/data/capabilities";
import { SWUOpportunityStatus } from "shared/lib/resources/opportunity/sprint-with-us";
import { AgentWithCookie, getAdminAgent, getGovAgent } from "./user";

/**
 * Create an CWU opportunity draft
 *
 * @param agent The agent session of the government user
 * @param opportunity The opportunity
 * @returns
 */
export const createCWUOpportunity = async (
  opportunity: object = validCwuOpportunity,
  agent?: AgentWithCookie
): Promise<any> => {
  return createOpportunity(
    "/api/opportunities/code-with-us",
    opportunity,
    agent
  );
};
/**
 * Create an SWU opportunity draft
 *
 * @param agent The agent session of the government user
 * @param opportunity The opportunity
 * @returns
 */
export const createSWUOpportunity = async (
  opportunity: object = validSwuOpportunity,
  agent?: AgentWithCookie
): Promise<any> => {
  return createOpportunity(
    "/api/opportunities/sprint-with-us",
    opportunity,
    agent
  );
};
/**
 * Create an CWU opportunity draft
 *
 * @param path The API endpoint
 * @param agent The agent session of the government user
 * @param opportunity The opportunity
 * @returns
 */
export const createOpportunity = async (
  path: string,
  opportunity: object,
  agent?: AgentWithCookie
): Promise<any> => {
  const response = await (agent || (await getGovAgent("usagop01")))
    .post(path)
    .send(opportunity);
  if (response.statusCode !== 201) {
    throw new Error(JSON.stringify(response, null, 2));
  }
  return response.body;
};

/**
 * Publish a CWU opportunity
 *
 * @param agent The agent session of the government user
 * @param opportunity The opportunity
 * @returns
 */
export const publishCWUOpportunity = async (
  opportunity: any,
  agent?: AgentWithCookie
): Promise<any> => {
  return publishOpportunity(
    `/api/opportunities/code-with-us`,
    opportunity,
    agent || (await getGovAgent("usagop01"))
  );
};

/**
 * Publish a SWU opportunity
 *
 * @param agent The agent session of the government user
 * @param opportunity The opportunity
 * @returns
 */
export const publishSWUOpportunity = async (
  opportunity: any,
  agent?: AgentWithCookie
): Promise<any> => {
  return publishOpportunity(
    `/api/opportunities/sprint-with-us`,
    opportunity,
    agent || (await getAdminAgent())
  );
};

/**
 * Publish an opportunity
 *
 * @param path The API endpoint
 * @param agent The agent session of the government user
 * @param opportunity The opportunity
 * @returns
 */
export const publishOpportunity = async (
  path: string,
  opportunity: any,
  agent: AgentWithCookie
): Promise<any> => {
  const response = await agent.put(`${path}/${opportunity.id}`).send({
    tag: "publish",
    value: "Published"
  });
  if (response.statusCode !== 200) {
    throw new Error(JSON.stringify(response, null, 2));
  }
  return response.body;
};

const futureDate = new Date(new Date().getTime() + 1000 * 60 * 60 * 24 * 7); // now + 1 week

/**
 * A valid code-with-us opportunity.
 */
export const validCwuOpportunity = {
  title: "Test CWU Opportunity",
  teaser: "Sample Teaser",
  remoteOk: false,
  location: "Victoria",
  reward: 70000,
  skills: ["foo", "bar"],
  description: "Sample Description Lorem Ipsum",
  proposalDeadline: futureDate,
  assignmentDate: futureDate,
  startDate: futureDate,
  completionDate: futureDate,
  submissionInfo: "github.com",
  acceptanceCriteria: "Sample Acceptance Criteria",
  evaluationCriteria: "Sample Evaluation Criteria",
  status: "DRAFT",
  attachments: []
};

/**
 * A valid code-with-us proposal.
 * Please replace Opportunity ID
 */
export const validCwuProposal = {
  opportunity: "{{cwu_opp_id}}",
  proposalText: "You should hire me",
  additionalComments: "please",
  proponent: {
    tag: "individual",
    value: {
      legalName: "Andrew S",
      email: "foo@bar.com",
      phone: "222-222-2222",
      street1: "foo",
      city: "Saskatoon",
      region: "SK",
      mailCode: "V8Z1T8",
      country: "Canada"
    }
  },
  attachments: [],
  status: "DRAFT"
};

export const validSwuOpportunity = {
  title: "SWU Title",
  teaser: "",
  remoteOk: true,
  remoteDesc: "Mars",
  location: "Location",
  totalMaxBudget: 2000000,
  minTeamMembers: 3,
  mandatorySkills: ["Mandatory Skill"],
  optionalSkills: [],
  description: "Description",
  proposalDeadline: futureDate,
  assignmentDate: futureDate,
  questionsWeight: 20,
  codeChallengeWeight: 30,
  scenarioWeight: 30,
  priceWeight: 20,
  status: SWUOpportunityStatus.Draft,
  implementationPhase: {
    phase: "IMPLEMENTATION",
    startDate: futureDate,
    completionDate: futureDate,
    maxBudget: 1500000,
    createdAt: futureDate,
    requiredCapabilities: [
      { capability: CAPABILITY_NAMES_ONLY[0], fullTime: true }
    ]
  },
  teamQuestions: [
    {
      question: "What is the answer ?",
      guideline: "no",
      score: 100,
      wordLimit: 1
    }
  ]
};

export const invalidSwuOpportunity = {
  title: "", // Title should be filled
  teaser: "",
  remoteOk: true,
  remoteDesc: "",
  location: "Location",
  totalMaxBudget: 2000000,
  minTeamMembers: 3,
  mandatorySkills: ["Mandatory Skill"],
  optionalSkills: [],
  description: "Description",
  proposalDeadline: new Date("1929-11-29"), // Deadline should be in the future
  assignmentDate: futureDate,
  questionsWeight: 20,
  codeChallengeWeight: 30,
  scenarioWeight: 30,
  priceWeight: 20,
  status: SWUOpportunityStatus.Draft,
  implementationPhase: {
    phase: "IMPLEMENTATION",
    startDate: futureDate,
    completionDate: futureDate,
    maxBudget: 1500000,
    createdAt: futureDate
  }
};

/**
 * Create a SWU opportunity draft with the API
 *
 * @returns SWU opportunity
 */
export async function createSWUDraft() {
  const govAgent = await getGovAgent("usagop01");
  const response = await govAgent
    .post("/api/opportunities/sprint-with-us")
    .send(validSwuOpportunity)
    .expect(201);
  return response.body;
}

/**
 * Create and submit a proposal draft for the given opportunity
 *
 * @param agent The session agent
 * @param opportunity The opportunity
 * @param proposal The proposal. If empty, create a valid default proposal
 * @returns The proposal
 */
export async function submitProposal(
  agent: AgentWithCookie,
  opportunity: any,
  proposal: any | undefined = validCwuProposal
) {
  const vendorProposal = await createProposalDraft(
    agent,
    opportunity,
    proposal
  );
  // Submit it
  const response = await agent
    .put(`/api/proposals/code-with-us/${vendorProposal.id}`)
    .send({
      tag: "submit",
      value: "NoOp"
    });
  if (response.statusCode !== 200) {
    throw new Error(JSON.stringify(response.body, null, 2));
  }
  return response.body;
}

/**
 * Create a proposal draft for the given opportunity
 *
 * @param agent The session agent
 * @param opportunity The opportunity
 * @param proposal The proposal. If empty, create a valid default proposal
 * @returns The proposal
 */
export async function createProposalDraft(
  agent: AgentWithCookie,
  opportunity: any,
  proposal: any | undefined = validCwuProposal
) {
  const response = await agent.post(`/api/proposals/code-with-us`).send({
    ...proposal,
    opportunity: opportunity.id
  });
  if (response.statusCode !== 201) {
    throw new Error(JSON.stringify(response.body, null, 2));
  }
  return response.body;
}

/**
 * Make opportunity evaluatable by changing its status
 *
 * @param opportunity The opportunity to update
 * @returns Opportunity's new status
 */
export async function makeOpportunityEvaluatable(opportunity: any) {
  const dbConnection = connectToDatabase("");
  const status = await dbConnection("cwuOpportunityVersions")
    .where({ opportunity: opportunity.id })
    .update({ proposalDeadline: new Date(new Date().getTime() - 1000 * 60) })
    .returning("*");
  await closeCWUOpportunities(dbConnection);
  return status;
}
