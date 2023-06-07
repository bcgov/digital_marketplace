import { PG_CONFIG } from "back-end/config";
import { connectToDatabase } from "back-end/index";

export async function clearTestDatabase(): Promise<void> {
  if (process.env.NODE_ENV !== "test") {
    throw new Error("Attempt to call test utility in non-test environment");
  }

  const connection = await connectToDatabase(PG_CONFIG);
  await connection.raw(
    `
      DELETE FROM "digmkt-test"."cwuProponents";
      DELETE FROM "digmkt-test"."cwuProposalAttachments";
      DELETE FROM "digmkt-test"."cwuProposalStatuses";
      DELETE FROM "digmkt-test"."cwuProposals";
      DELETE FROM "digmkt-test"."cwuOpportunityAttachments";
      DELETE FROM "digmkt-test"."cwuOpportunityNoteAttachments";
      DELETE FROM "digmkt-test"."cwuOpportunityStatuses";
      DELETE FROM "digmkt-test"."cwuOpportunityVersions";
      DELETE FROM "digmkt-test"."cwuOpportunities";
      DELETE FROM "digmkt-test"."swuProposalAttachments";
      DELETE FROM "digmkt-test"."swuProposalStatuses";
      DELETE FROM "digmkt-test"."swuProposalReferences";
      DELETE FROM "digmkt-test"."swuProposalTeamMembers";
      DELETE FROM "digmkt-test"."swuProposalPhases";
      DELETE FROM "digmkt-test"."swuProposals";
      DELETE FROM "digmkt-test"."swuOpportunityAddenda";
      DELETE FROM "digmkt-test"."swuOpportunityAttachments";
      DELETE FROM "digmkt-test"."swuOpportunityNoteAttachments";
      DELETE FROM "digmkt-test"."swuOpportunityPhases";
      DELETE FROM "digmkt-test"."swuOpportunitySubscribers";
      DELETE FROM "digmkt-test"."swuOpportunityStatuses";
      DELETE FROM "digmkt-test"."swuOpportunityVersions";
      DELETE FROM "digmkt-test"."swuTeamQuestions";
      DELETE FROM "digmkt-test"."swuTeamQuestionResponses";
      DELETE FROM "digmkt-test"."swuOpportunities";
      DELETE FROM "digmkt-test"."affiliations";
      DELETE FROM "digmkt-test"."organizations";
      DELETE FROM "digmkt-test".sessions;
      DELETE FROM "digmkt-test".users;
    `
  );
}
