import { MAILER_BATCH_SIZE, MAILER_REPLY } from "back-end/config";
import * as db from "back-end/lib/db";
import { Emails } from "back-end/lib/mailer";
import * as templates from "back-end/lib/mailer/templates";
import { makeSend } from "back-end/lib/mailer/transport";
import { unionBy } from "lodash";
import React from "react";
import { CONTACT_EMAIL } from "shared/config";
import { formatAmount, formatDate, formatTime } from "shared/lib";
import {
  SWUOpportunity,
  SWUOpportunityStatus
} from "shared/lib/resources/opportunity/sprint-with-us";
import { User, UserType } from "shared/lib/resources/user";
import { getValidValue } from "shared/lib/validation";

export async function handleSWUSubmittedForReview(
  connection: db.Connection,
  opportunity: SWUOpportunity
): Promise<void> {
  // Notify all admin users of the submitted SWU
  const adminUsers =
    getValidValue(
      await db.readManyUsersByRole(connection, UserType.Admin),
      null
    ) || [];
  await Promise.all(
    adminUsers.map(
      async (admin) =>
        await newSWUOpportunitySubmittedForReview(admin, opportunity)
    )
  );

  // Notify the authoring gov user of the submission
  const author =
    opportunity.createdBy &&
    getValidValue(
      await db.readOneUser(connection, opportunity.createdBy.id),
      null
    );
  if (author) {
    await newSWUOpportunitySubmittedForReviewAuthor(author, opportunity);
  }
}

export async function handleSWUPublished(
  connection: db.Connection,
  opportunity: SWUOpportunity
): Promise<void> {
  // Notify all users with notifications on
  const subscribedUsers =
    getValidValue(await db.readManyUsersNotificationsOn(connection), null) ||
    [];
  await newSWUOpportunityPublished(subscribedUsers, opportunity);

  // Notify authoring gov user of successful publish
  const author =
    opportunity?.createdBy &&
    getValidValue(
      await db.readOneUser(connection, opportunity.createdBy.id),
      null
    );
  if (author) {
    await successfulSWUPublication(author, opportunity);
  }

  const panel =
    opportunity.evaluationPanel &&
    (
      await Promise.all(
        opportunity.evaluationPanel.map(({ user }) =>
          db.readOneUser(connection, user.id)
        )
      )
    )
      .map((user) => getValidValue(user, null))
      .filter((user): user is User => !!user);

  if (panel?.length) {
    await newSWUPanel(panel, opportunity);
  }
}

export async function handleSWUUpdated(
  connection: db.Connection,
  opportunity: SWUOpportunity
): Promise<void> {
  // Notify all subscribed users on this opportunity, as well as users with proposals (we union so we don't notify anyone twice)
  const author =
    (opportunity.createdBy &&
      getValidValue(
        await db.readOneUser(connection, opportunity.createdBy.id),
        null
      )) ||
    null;
  const subscribedUsers =
    getValidValue(
      await db.readManySWUSubscribedUsers(connection, opportunity.id),
      null
    ) || [];
  const usersWithProposals =
    getValidValue(
      await db.readManyCWUProposalAuthors(connection, opportunity.id),
      null
    ) || [];
  const unionedUsers = unionBy(subscribedUsers, usersWithProposals, "id");
  if (author) {
    unionedUsers.push(author);
  }
  await updatedSWUOpportunity(unionedUsers, opportunity);
}

export async function handleSWUCancelled(
  connection: db.Connection,
  opportunity: SWUOpportunity
): Promise<void> {
  // Notify all subscribed users on this opportunity, as well as users with proposals (we union so we don't notify anyone twice)
  const subscribedUsers =
    getValidValue(
      await db.readManySWUSubscribedUsers(connection, opportunity.id),
      null
    ) || [];
  const usersWithProposals =
    getValidValue(
      await db.readManySWUProposalAuthors(connection, opportunity.id),
      null
    ) || [];
  const unionedUsers = unionBy(subscribedUsers, usersWithProposals, "id");
  await Promise.all(
    unionedUsers.map(
      async (user) => await cancelledSWUOpportunitySubscribed(user, opportunity)
    )
  );

  // Notify authoring gov user of cancellation
  const author =
    opportunity.createdBy &&
    getValidValue(
      await db.readOneUser(connection, opportunity.createdBy.id),
      null
    );
  if (author) {
    await cancelledSWUOpportunityActioned(author, opportunity);
  }
}

export async function handleSWUPanelChange(
  connection: db.Connection,
  opportunity: SWUOpportunity,
  existingOpportunity: SWUOpportunity | null
) {
  // Notify new users on the evaluation panel
  const existingOpportunityPanelIds =
    existingOpportunity?.evaluationPanel?.map(({ user }) => user.id) ?? [];
  const newPanelIds =
    opportunity.evaluationPanel?.map(({ user }) => user.id) ?? [];
  const newPanelists = newPanelIds.filter(
    (id) => !existingOpportunityPanelIds.includes(id)
  );

  const panel = (
    await Promise.all(newPanelists.map((id) => db.readOneUser(connection, id)))
  )
    .map((user) => getValidValue(user, null))
    .filter((member): member is User => !!member);

  if (panel?.length && opportunity.status !== SWUOpportunityStatus.Draft) {
    await editSWUPanel(panel, opportunity);
  }
}

export async function handleSWUReadyForEvaluation(
  connection: db.Connection,
  opportunity: SWUOpportunity
): Promise<void> {
  // Notify panel user that the opportunity is ready
  const panel =
    opportunity.evaluationPanel &&
    (
      await Promise.all(
        opportunity.evaluationPanel
          .filter(({ evaluator }) => evaluator) // Only notify evaluators
          .map(({ user }) => db.readOneUser(connection, user.id))
      )
    )
      .map((user) => getValidValue(user, null))
      .filter((member): member is User => !!member);
  if (panel?.length) {
    await readyForEvalSWUOpportunity(panel, opportunity);
  }
}

export async function handleSWUReadyForQuestionConsensus(
  connection: db.Connection,
  opportunity: SWUOpportunity
): Promise<void> {
  // Notify chair that they can begin consensuses and author of evaluation progress
  const chairMember = opportunity.evaluationPanel?.find(({ chair }) => chair);

  const recipients = (
    await Promise.all([
      ...(chairMember ? [db.readOneUser(connection, chairMember.user.id)] : []),
      ...(opportunity.createdBy
        ? [db.readOneUser(connection, opportunity.createdBy.id)]
        : [])
    ])
  )
    .map((user) => getValidValue(user, null))
    .filter((user): user is User => !!user);
  if (recipients.length) {
    await readyForQuestionConsensusSWUOpportunity(recipients, opportunity);
  }
}

export async function handleSWUQuestionConsensusSubmitted(
  connection: db.Connection,
  opportunity: SWUOpportunity
): Promise<void> {
  // Notify author and admins that consensus has been submitted.
  const author =
    opportunity.createdBy &&
    getValidValue(
      await db.readOneUser(connection, opportunity.createdBy.id),
      null
    );
  // Notify all admin users of the submitted SWU
  const adminUsers =
    getValidValue(
      await db.readManyUsersByRole(connection, UserType.Admin),
      null
    ) || [];
  const recipients = [author, ...adminUsers].filter(
    (user): user is User => !!user
  );
  if (recipients.length) {
    await questionConsensusSWUOpportunitySubmitted(recipients, opportunity);
  }
}

export async function handleSWUQuestionConsensusFinalized(
  connection: db.Connection,
  opportunity: SWUOpportunity
): Promise<void> {
  // Notify chair and author that consensus has been finalized
  const chairMember = opportunity.evaluationPanel?.find(({ chair }) => chair);

  const recipients = (
    await Promise.all([
      ...(chairMember ? [db.readOneUser(connection, chairMember.user.id)] : []),
      ...(opportunity.createdBy
        ? [db.readOneUser(connection, opportunity.createdBy.id)]
        : [])
    ])
  )
    .map((user) => getValidValue(user, null))
    .filter((user): user is User => !!user);

  if (recipients.length) {
    questionConsensusSWUOpportunityFinalized(recipients, opportunity);
  }
}

export const newSWUOpportunityPublished = makeSend(newSWUOpportunityPublishedT);

export async function newSWUOpportunityPublishedT(
  recipients: User[],
  opportunity: SWUOpportunity
): Promise<Emails> {
  const title = `A New Sprint With Us Opportunity Has Been Posted`;
  const description = `A new opportunity has been posted to the Digital Marketplace:`;
  const emails: Emails = [];
  for (let i = 0; i < recipients.length; i += MAILER_BATCH_SIZE) {
    const batch = recipients.slice(i, i + MAILER_BATCH_SIZE);
    emails.push({
      summary: `New SWU opportunity published; sent to user with notifications turned on.`,
      to: MAILER_REPLY,
      bcc: batch.map((r) => r.email || ""),
      subject: title,
      html: templates.simple({
        title,
        description,
        descriptionLists: [makeSWUOpportunityInformation(opportunity)],
        body: (
          <div>
            <p>
              Please note that you must be a{" "}
              <templates.Link
                text="Qualified Supplier"
                url={templates.makeUrl("/learn-more/sprint-with-us")}
              />{" "}
              in order to submit a proposal to a Sprint With Us opportunity.
            </p>
          </div>
        ),
        callsToAction: [viewSWUOpportunityCallToAction(opportunity)]
      })
    });
  }
  return emails;
}

export const updatedSWUOpportunity = makeSend(updatedSWUOpportunityT);

export async function updatedSWUOpportunityT(
  recipients: User[],
  opportunity: SWUOpportunity
): Promise<Emails> {
  const title = "A Sprint With Us Opportunity Has Been Updated";
  const description =
    "The following Digital Marketplace opportunity has been updated:";
  const emails: Emails = [];
  for (let i = 0; i < recipients.length; i += MAILER_BATCH_SIZE) {
    const batch = recipients.slice(i, i + MAILER_BATCH_SIZE);
    emails.push({
      to: MAILER_REPLY,
      bcc: batch.map((r) => r.email || ""),
      subject: title,
      html: templates.simple({
        title,
        description,
        descriptionLists: [makeSWUOpportunityInformation(opportunity)],
        callsToAction: [viewSWUOpportunityCallToAction(opportunity)]
      })
    });
  }
  return emails;
}

export const newSWUOpportunitySubmittedForReview = makeSend(
  newSWUOpportunitySubmittedForReviewT
);

export async function newSWUOpportunitySubmittedForReviewT(
  recipient: User,
  opportunity: SWUOpportunity
): Promise<Emails> {
  const title = "A Sprint With Us Opportunity Has Been Submitted For Review";
  const description =
    "The following Digital Marketplace opportunity has been submitted for review:";
  return [
    {
      summary:
        "SWU opportunity submitted for review; sent to all administrators for the system.",
      to: recipient.email || [],
      subject: title,
      html: templates.simple({
        title,
        description,
        descriptionLists: [makeSWUOpportunityInformation(opportunity)],
        body: (
          <div>
            <p>
              You can review and publish this opportunity by{" "}
              <templates.Link
                text="signing in"
                url={templates.makeUrl("sign-in")}
              />{" "}
              and accessing it from the opportunity list.
            </p>
            <p>
              You can also edit the opportunity prior to publishing. The
              opportunity author will be notified when you publish, and the
              opportunity will made visible to the public.
            </p>
          </div>
        ),
        callsToAction: [viewSWUOpportunityCallToAction(opportunity)]
      })
    }
  ];
}

export const newSWUOpportunitySubmittedForReviewAuthor = makeSend(
  newSWUOpportunitySubmittedForReviewAuthorT
);

export async function newSWUOpportunitySubmittedForReviewAuthorT(
  recipient: User,
  opportunity: SWUOpportunity
): Promise<Emails> {
  const title = "Your Sprint With Us Opportunity Has Been Submitted For Review"; // Used for subject line and heading
  const description =
    "You have submitted the following Digital Marketplace opportunity for review:";
  return [
    {
      summary:
        "SWU opportunity submitted for review; sent to the submitting government user.",
      to: recipient.email || "",
      subject: title,
      html: templates.simple({
        title,
        description,
        descriptionLists: [makeSWUOpportunityInformation(opportunity)],
        body: (
          <div>
            <p>
              An administrator will review your opportunity. You will be
              notified once the opportunity has been posted.
            </p>
            <p>
              If you have any questions, please send an email to{" "}
              <templates.Link text={CONTACT_EMAIL} url={CONTACT_EMAIL} />.
            </p>
          </div>
        ),
        callsToAction: [viewSWUOpportunityCallToAction(opportunity)]
      })
    }
  ];
}

export const newSWUPanel = makeSend(newSWUPanelT);

export async function newSWUPanelT(
  recipients: User[],
  opportunity: SWUOpportunity
): Promise<Emails> {
  const title =
    "You Have Been Added to the Evaluation Panel for a Sprint With Us Opportunity";
  const description =
    "You have been added as an evaluation panelist for the following Digital Marketplace opportunity";
  const emails: Emails = [];
  for (let i = 0; i < recipients.length; i += MAILER_BATCH_SIZE) {
    const batch = recipients.slice(i, i + MAILER_BATCH_SIZE);
    emails.push({
      summary: "SWU opportunity published; sent to evaluation panelists.",
      to: MAILER_REPLY,
      bcc: batch.map((r) => r.email || ""),
      subject: title,
      html: templates.simple({
        title,
        description,
        descriptionLists: [makeSWUOpportunityInformation(opportunity)],
        callsToAction: [viewSWUOpportunityCallToAction(opportunity)]
      })
    });
  }
  return emails;
}

export const successfulSWUPublication = makeSend(successfulSWUPublicationT);

export async function successfulSWUPublicationT(
  recipient: User,
  opportunity: SWUOpportunity
): Promise<Emails> {
  const title = `Your Sprint With Us Opportunity Has Been Posted`;
  const description = `You have successfully posted the following Digital Marketplace opportunity`;
  return [
    {
      summary: `SWU successfully published; sent to publishing government user.`,
      to: recipient.email || [],
      subject: title,
      html: templates.simple({
        title,
        description,
        descriptionLists: [makeSWUOpportunityInformation(opportunity)],
        body: (
          <div>
            <p style={{ ...templates.styles.utilities.font.italic }}>
              What Happens Next?
            </p>
            <p>
              Sit back and relax as Vendors submit proposals to your
              opportunity. You will not be able to view these proposals until
              the opportunity has reached its closing date and time.
            </p>
            <p>
              Once the opportunity has closed, you will be notified that the
              proposal submissions are ready for your review.
            </p>
            <p>
              If you would like to make a change to your opportunity, such as
              adding an addendum, simply{" "}
              <templates.Link
                text="sign in"
                url={templates.makeUrl("sign-in")}
              />{" "}
              and access the opportunity via your dashboard.
            </p>
          </div>
        ),
        callsToAction: [viewSWUOpportunityCallToAction(opportunity)]
      })
    }
  ];
}

export const cancelledSWUOpportunitySubscribed = makeSend(
  cancelledSWUOpportunitySubscribedT
);

export async function cancelledSWUOpportunitySubscribedT(
  recipient: User,
  opportunity: SWUOpportunity
): Promise<Emails> {
  const title = "A Sprint With Us Opportunity Has Been Cancelled";
  const description =
    "The following Digital Marketplace opportunity has been cancelled:";
  return [
    {
      summary:
        "SWU opportunity cancelled; sent to subscribed users and vendors with proposals.",
      to: recipient.email || [],
      subject: title,
      html: templates.simple({
        title,
        description,
        descriptionLists: [makeSWUOpportunityInformation(opportunity)],
        body: (
          <div>
            <p>
              If you have any questions, please send an email to{" "}
              <templates.Link text={CONTACT_EMAIL} url={CONTACT_EMAIL} />.
            </p>
          </div>
        )
      })
    }
  ];
}

export const cancelledSWUOpportunityActioned = makeSend(
  cancelledSWUOpportunityActionedT
);

export async function cancelledSWUOpportunityActionedT(
  recipient: User,
  opportunity: SWUOpportunity
): Promise<Emails> {
  const title = "A Sprint With Us Opportunity Has Been Cancelled";
  const description =
    "You have cancelled the following opportunity on the Digital Marketplace:";
  return [
    {
      summary:
        "SWU opportunity cancelled; sent to the administrator who actioned.",
      to: recipient.email || [],
      subject: title,
      html: templates.simple({
        title,
        description,
        descriptionLists: [makeSWUOpportunityInformation(opportunity)]
      })
    }
  ];
}

export const readyForEvalSWUOpportunity = makeSend(readyForEvalSWUOpportunityT);

export async function readyForEvalSWUOpportunityT(
  recipients: User[],
  opportunity: SWUOpportunity
): Promise<Emails> {
  const title = "A Sprint With Us Opportunity is Ready to Be Evaluated";
  const description =
    "A Digital Marketplace opportunity has reached its proposal deadline.";
  const emails: Emails = [];
  for (let i = 0; i < recipients.length; i += MAILER_BATCH_SIZE) {
    const batch = recipients.slice(i, i + MAILER_BATCH_SIZE);
    emails.push({
      summary:
        "SWU opportunity proposal deadline reached; sent to evaluation panel.",
      to: batch.map((r) => r.email || ""),
      subject: title,
      html: templates.simple({
        title,
        description,
        descriptionLists: [makeSWUOpportunityInformation(opportunity)],
        body: (
          <div>
            <p>
              You may now view proposals submitted by vendors and assign scores
              to each submission. Please note that each vendor with a submitted
              proposal will remain anonymous until the next phase of the
              opportunity has begun.
            </p>
          </div>
        ),
        callsToAction: [viewSWUOpportunityCallToAction(opportunity)]
      })
    });
  }
  return emails;
}

export const editSWUPanel = makeSend(editSWUPanelT);

export async function editSWUPanelT(
  recipients: User[],
  opportunity: SWUOpportunity
): Promise<Emails> {
  const title =
    "You Have Been Added to the Evaluation Panel for a Sprint With Us Opportunity";
  const description =
    "You have been added as an evaluation panelist for the following Digital Marketplace opportunity";
  const emails: Emails = [];
  for (let i = 0; i < recipients.length; i += MAILER_BATCH_SIZE) {
    const batch = recipients.slice(i, i + MAILER_BATCH_SIZE);
    emails.push({
      summary:
        "SWU opportunity evaluation panel updated; sent to evaluation panelists.",
      to: MAILER_REPLY,
      bcc: batch.map((r) => r.email || ""),
      subject: title,
      html: templates.simple({
        title,
        description,
        descriptionLists: [makeSWUOpportunityInformation(opportunity)],
        callsToAction: [viewSWUOpportunityCallToAction(opportunity)]
      })
    });
  }
  return emails;
}

export const readyForQuestionConsensusSWUOpportunity = makeSend(
  readyForQuestionConsensusSWUOpportunityT
);

export async function readyForQuestionConsensusSWUOpportunityT(
  recipients: User[],
  opportunity: SWUOpportunity
): Promise<Emails> {
  const title = "A Sprint With Us Opportunity Is Ready for Question Consensus";
  const description =
    "All evaluators have submitted their scores and you may now begin question consensuses " +
    "for the following Digital Marketplace opportunity:";
  const emails: Emails = [];
  for (let i = 0; i < recipients.length; i += MAILER_BATCH_SIZE) {
    const batch = recipients.slice(i, i + MAILER_BATCH_SIZE);
    emails.push({
      summary:
        "SWU opportunity ready for question consensus; sent to evaluation panel chair and opportunity author.",
      to: batch.map((r) => r.email || ""),
      subject: title,
      html: templates.simple({
        title,
        description,
        descriptionLists: [makeSWUOpportunityInformation(opportunity)],
        callsToAction: [viewSWUOpportunityCallToAction(opportunity)]
      })
    });
  }
  return emails;
}

export const questionConsensusSWUOpportunitySubmitted = makeSend(
  questionConsensusSWUOpportunitySubmittedT
);

export async function questionConsensusSWUOpportunitySubmittedT(
  recipients: User[],
  opportunity: SWUOpportunity
): Promise<Emails> {
  const title =
    "A Sprint With Us Opportunity Question Consensus Has Been Submitted";
  const description =
    "The following Digital Marketplace opportunity has had its question consensus submitted:";
  const emails: Emails = [];
  for (let i = 0; i < recipients.length; i += MAILER_BATCH_SIZE) {
    const batch = recipients.slice(i, i + MAILER_BATCH_SIZE);
    emails.push({
      summary:
        "SWU opportunity question consensus submitted; sent to opportunity author and admins.",
      to: batch.map((r) => r.email || ""),
      subject: title,
      html: templates.simple({
        title,
        description,
        descriptionLists: [makeSWUOpportunityInformation(opportunity)],
        callsToAction: [viewSWUOpportunityCallToAction(opportunity)]
      })
    });
  }
  return emails;
}

export const questionConsensusSWUOpportunityFinalized = makeSend(
  questionConsensusSWUOpportunitySubmittedT
);

export async function questionConsensusSWUOpportunityFinalizedT(
  recipients: User[],
  opportunity: SWUOpportunity
): Promise<Emails> {
  const title =
    "A Sprint With Us Opportunity Question Consensus Has Been Finalized";
  const description =
    "The following Digital Marketplace opportunity question consensus finalized:";
  const emails: Emails = [];
  for (let i = 0; i < recipients.length; i += MAILER_BATCH_SIZE) {
    const batch = recipients.slice(i, i + MAILER_BATCH_SIZE);
    emails.push({
      summary:
        "SWU opportunity question consensus finalized; sent to opportunity author and chair.",
      to: batch.map((r) => r.email || ""),
      subject: title,
      html: templates.simple({
        title,
        description,
        descriptionLists: [makeSWUOpportunityInformation(opportunity)],
        callsToAction: [viewSWUOpportunityCallToAction(opportunity)]
      })
    });
  }
  return emails;
}

export function makeSWUOpportunityInformation(
  opportunity: SWUOpportunity,
  showDueDate = true
): templates.DescriptionListProps {
  const items = [
    { name: "Type", value: "Sprint With Us" },
    { name: "Value", value: `$${formatAmount(opportunity.totalMaxBudget)}` },
    { name: "Location", value: opportunity.location },
    { name: "Remote OK?", value: opportunity.remoteOk ? "Yes" : "No" }
  ];
  if (showDueDate) {
    items.push({
      name: "Proposals Deadline",
      value: `${formatDate(
        opportunity.proposalDeadline,
        false
      )} at ${formatTime(opportunity.proposalDeadline, true)}`
    });
  }
  return {
    title: opportunity.title,
    items
  };
}

export function viewSWUOpportunityCallToAction(
  opportunity: SWUOpportunity
): templates.LinkProps {
  return {
    text: "View Opportunity",
    url: templates.makeUrl(`/opportunities/sprint-with-us/${opportunity.id}`)
  };
}
