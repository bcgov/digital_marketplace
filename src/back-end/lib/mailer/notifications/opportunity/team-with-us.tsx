import * as db from "back-end/lib/db";
import { formatAmount, formatDate, formatTime } from "shared/lib";
import * as templates from "back-end/lib/mailer/templates";
import {
  TWUOpportunity,
  TWUOpportunityStatus
} from "shared/lib/resources/opportunity/team-with-us";
import { User, UserType } from "shared/lib/resources/user";
import { getValidValue } from "shared/lib/validation";
import { makeSend } from "back-end/lib/mailer/transport";
import { CONTACT_EMAIL } from "shared/config";
import React from "react";
import { Emails } from "back-end/lib/mailer";
import { MAILER_BATCH_SIZE, MAILER_REPLY } from "back-end/config";
import { lowerCase, startCase, unionBy } from "lodash";

/**
 * Handles the logic for sending two different emails
 * to multiple users.
 *
 * @param connection - object, database connection
 * @param opportunity - object, a TWU opportunity
 */
export async function handleTWUSubmittedForReview(
  connection: db.Connection,
  opportunity: TWUOpportunity
): Promise<void> {
  // Notify all admin users of the submitted TWU
  const adminUsers =
    getValidValue(
      await db.readManyUsersByRole(connection, UserType.Admin),
      null
    ) || [];
  await Promise.all(
    adminUsers.map(
      async (admin) =>
        await newTWUOpportunitySubmittedForReview(admin, opportunity)
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
    await newTWUOpportunitySubmittedForReviewAuthor(author, opportunity);
  }
}

/**
 * wrapper
 */
export const newTWUOpportunitySubmittedForReview = makeSend(
  newTWUOpportunitySubmittedForReviewT
);

/**
 * Creates content for an email.
 *
 * @param recipient - object, someone to send it to, in this case the administrators of the system
 * @param opportunity - object, a TWU opportunity
 * @returns - object, an email template with content
 */
export async function newTWUOpportunitySubmittedForReviewT(
  recipient: User,
  opportunity: TWUOpportunity
): Promise<Emails> {
  const title = "A Team With Us Opportunity Has Been Submitted For Review";
  const description =
    "The following Digital Marketplace opportunity has been submitted for review:";
  return [
    {
      summary:
        "TWU opportunity submitted for review; sent to all administrators for the system.",
      to: recipient.email || [],
      subject: title,
      html: templates.simple({
        title,
        description,
        descriptionLists: [makeTWUOpportunityInformation(opportunity)],
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
        callsToAction: [viewTWUOpportunityCallToAction(opportunity)]
      })
    }
  ];
}

export const updatedTWUOpportunity = makeSend(updatedTWUOpportunityT);

export async function updatedTWUOpportunityT(
  recipients: User[],
  opportunity: TWUOpportunity
): Promise<Emails> {
  const title = "A Team With Us Opportunity Has Been Updated";
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
        descriptionLists: [makeTWUOpportunityInformation(opportunity)],
        callsToAction: [viewTWUOpportunityCallToAction(opportunity)]
      })
    });
  }
  return emails;
}

/**
 * wrapper
 */
export const newTWUOpportunitySubmittedForReviewAuthor = makeSend(
  newTWUOpportunitySubmittedForReviewAuthorT
);

/**
 * Creates content for an email.
 *
 * @param recipient - object, someone to send it to, in this case the author of the opportunity
 * @param opportunity - object, a TWU opportunity
 * @returns - object, an email template with content
 */
export async function newTWUOpportunitySubmittedForReviewAuthorT(
  recipient: User,
  opportunity: TWUOpportunity
): Promise<Emails> {
  const title = "Your Team With Us Opportunity Has Been Submitted For Review"; // Used for subject line and heading
  const description =
    "You have submitted the following Digital Marketplace opportunity for review:";
  return [
    {
      summary:
        "TWU opportunity submitted for review; sent to the submitting government user.",
      to: recipient.email || "",
      subject: title,
      html: templates.simple({
        title,
        description,
        descriptionLists: [makeTWUOpportunityInformation(opportunity)],
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
        callsToAction: [viewTWUOpportunityCallToAction(opportunity)]
      })
    }
  ];
}

export const newTWUPanel = makeSend(newTWUPanelT);

export async function newTWUPanelT(
  recipients: User[],
  opportunity: TWUOpportunity
): Promise<Emails> {
  const title =
    "You Have Been Added to the Evaluation Panel for a Team With Us Opportunity";
  const description =
    "You have been added as an evaluation panelist for the following Digital Marketplace opportunity";
  const emails: Emails = [];
  for (let i = 0; i < recipients.length; i += MAILER_BATCH_SIZE) {
    const batch = recipients.slice(i, i + MAILER_BATCH_SIZE);
    emails.push({
      summary: "TWU opportunity published; sent to evaluation panelists.",
      to: MAILER_REPLY,
      bcc: batch.map((r) => r.email || ""),
      subject: title,
      html: templates.simple({
        title,
        description,
        descriptionLists: [makeTWUOpportunityInformation(opportunity)],
        callsToAction: [viewTWUOpportunityCallToAction(opportunity)]
      })
    });
  }
  return emails;
}

export const readyForQuestionConsensusTWUOpportunity = makeSend(
  readyForQuestionConsensusTWUOpportunityT
);

export async function readyForQuestionConsensusTWUOpportunityT(
  recipients: User[],
  opportunity: TWUOpportunity
): Promise<Emails> {
  const title = "A Team With Us Opportunity Is Ready for Question Consensus";
  const description =
    "All evaluators have submitted their scores and you may now begin question consensuses " +
    "for the following Digital Marketplace opportunity:";
  const emails: Emails = [];
  for (let i = 0; i < recipients.length; i += MAILER_BATCH_SIZE) {
    const batch = recipients.slice(i, i + MAILER_BATCH_SIZE);
    emails.push({
      summary:
        "TWU opportunity ready for question consensus; sent to evaluation panel chair and opportunity author.",
      to: batch.map((r) => r.email || ""),
      subject: title,
      html: templates.simple({
        title,
        description,
        descriptionLists: [makeTWUOpportunityInformation(opportunity)],
        callsToAction: [viewTWUOpportunityCallToAction(opportunity)]
      })
    });
  }
  return emails;
}

export const questionConsensusTWUOpportunitySubmitted = makeSend(
  questionConsensusTWUOpportunitySubmittedT
);

export async function questionConsensusTWUOpportunitySubmittedT(
  recipients: User[],
  opportunity: TWUOpportunity
): Promise<Emails> {
  const title =
    "A Team With Us Opportunity Question Consensus Has Been Submitted";
  const description =
    "The following Digital Marketplace opportunity has had its question consensus submitted:";
  const emails: Emails = [];
  for (let i = 0; i < recipients.length; i += MAILER_BATCH_SIZE) {
    const batch = recipients.slice(i, i + MAILER_BATCH_SIZE);
    emails.push({
      summary:
        "TWU opportunity question consensus submitted; sent to opportunity author and admins.",
      to: batch.map((r) => r.email || ""),
      subject: title,
      html: templates.simple({
        title,
        description,
        descriptionLists: [makeTWUOpportunityInformation(opportunity)],
        callsToAction: [viewTWUOpportunityCallToAction(opportunity)]
      })
    });
  }
  return emails;
}

export const questionConsensusTWUOpportunityFinalized = makeSend(
  questionConsensusTWUOpportunitySubmittedT
);

export async function questionConsensusTWUOpportunityFinalizedT(
  recipients: User[],
  opportunity: TWUOpportunity
): Promise<Emails> {
  const title =
    "A Team With Us Opportunity Question Consensus Has Been Finalized";
  const description =
    "The following Digital Marketplace opportunity question consensus finalized:";
  const emails: Emails = [];
  for (let i = 0; i < recipients.length; i += MAILER_BATCH_SIZE) {
    const batch = recipients.slice(i, i + MAILER_BATCH_SIZE);
    emails.push({
      summary:
        "TWU opportunity question consensus finalized; sent to opportunity author and chair.",
      to: batch.map((r) => r.email || ""),
      subject: title,
      html: templates.simple({
        title,
        description,
        descriptionLists: [makeTWUOpportunityInformation(opportunity)],
        callsToAction: [viewTWUOpportunityCallToAction(opportunity)]
      })
    });
  }
  return emails;
}

/**
 * Creates content for use in an email template.
 *
 * @see {@link newTWUOpportunitySubmittedForReviewAuthorT}
 *
 * @param opportunity - object, a TWU opportunity
 * @param showDueDate - boolean, if true adds when the proposals are due
 * @returns - object, content for use in the email
 */
export function makeTWUOpportunityInformation(
  opportunity: TWUOpportunity,
  showDueDate = true
): templates.DescriptionListProps {
  const serviceAreas = opportunity.resources.map((resource, index) => ({
    name: "Service Area ".concat(`${index + 1}`),
    value: `${startCase(lowerCase(resource.serviceArea))}`
  }));
  const items = [
    { name: "Type", value: "Team With Us" },
    { name: "Value", value: `$${formatAmount(opportunity.maxBudget)}` },
    ...serviceAreas,
    {
      name: "Estimated Contract Start Date",
      value: formatDate(opportunity.startDate, false)
    },
    {
      name: "Estimated Contract End Date",
      value: opportunity.completionDate
        ? formatDate(opportunity.completionDate, false)
        : ""
    },
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

/**
 * Creates content for use in an email template.
 * Makes a url for email recipients to click on
 * which takes them to the TWU opportunity
 *
 * @see {@link newTWUOpportunitySubmittedForReviewT} - used in this function, which creates an email template
 *
 * @param opportunity - object, a TWU opportunity
 * @returns - object, text and a url string
 */
export function viewTWUOpportunityCallToAction(
  opportunity: TWUOpportunity
): templates.LinkProps {
  return {
    text: "View Opportunity",
    url: templates.makeUrl(`/opportunities/team-with-us/${opportunity.id}`)
  };
}

/**
 * Handles the logic when a TWU opportunity is published.
 * Notifies the author of the post with one email template
 * and the subscribers with another
 *
 * @param connection - object, db connection
 * @param opportunity - object, TWU opportunity object
 * @param repost - boolean, either the first time publishing or a repost
 */
export async function handleTWUPublished(
  connection: db.Connection,
  opportunity: TWUOpportunity
): Promise<void> {
  // Notify all users with notifications on
  const subscribedUsers =
    getValidValue(await db.readManyUsersNotificationsOn(connection), null) ||
    [];
  await newTWUOpportunityPublished(subscribedUsers, opportunity);

  // Notify authoring gov user of successful publish
  const author =
    opportunity?.createdBy &&
    getValidValue(
      await db.readOneUser(connection, opportunity.createdBy.id),
      null
    );
  if (author) {
    await successfulTWUPublication(author, opportunity);
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
    await newTWUPanel(panel, opportunity);
  }
}

/**
 * Notifies all subscribed users on this opportunity, for instance, on edit/update
 * as well as users with proposals (we union so that we don't notify anyone twice)
 *
 * @param connection
 * @param opportunity
 */
export async function handleTWUUpdated(
  connection: db.Connection,
  opportunity: TWUOpportunity
): Promise<void> {
  const author =
    (opportunity.createdBy &&
      getValidValue(
        await db.readOneUser(connection, opportunity.createdBy.id),
        null
      )) ||
    null;
  const subscribedUsers =
    getValidValue(
      await db.readManyTWUSubscribedUsers(connection, opportunity.id),
      null
    ) || [];
  const usersWithProposals =
    getValidValue(
      await db.readManyTWUProposalAuthors(connection, opportunity.id),
      null
    ) || [];
  const unionedUsers = unionBy(subscribedUsers, usersWithProposals, "id");

  if (author) {
    unionedUsers.push(author);
  }
  await updatedTWUOpportunity(unionedUsers, opportunity);
}

/**
 * Notify all subscribed users on this opportunity,
 * as well as users with proposals (we union so that we don't notify anyone twice).
 * Notify authoring gov user of cancellation
 *
 * @param connection
 * @param opportunity
 */
export async function handleTWUCancelled(
  connection: db.Connection,
  opportunity: TWUOpportunity
): Promise<void> {
  const subscribedUsers =
    getValidValue(
      await db.readManyTWUSubscribedUsers(connection, opportunity.id),
      null
    ) || [];
  const usersWithProposals =
    getValidValue(
      await db.readManyTWUProposalAuthors(connection, opportunity.id),
      null
    ) || [];
  const unionedUsers = unionBy(subscribedUsers, usersWithProposals, "id");

  await Promise.all(
    unionedUsers.map(
      async (user) => await cancelledTWUOpportunitySubscribed(user, opportunity)
    )
  );

  const author =
    opportunity.createdBy &&
    getValidValue(
      await db.readOneUser(connection, opportunity.createdBy.id),
      null
    );
  if (author) {
    await cancelledTWUOpportunityActioned(author, opportunity);
  }
}

export async function handleTWUPanelChange(
  connection: db.Connection,
  opportunity: TWUOpportunity,
  existingOpportunity: TWUOpportunity | null
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

  if (panel?.length && opportunity.status !== TWUOpportunityStatus.Draft) {
    await editTWUPanel(panel, opportunity);
  }
}

export async function handleTWUReadyForQuestionConsensus(
  connection: db.Connection,
  opportunity: TWUOpportunity
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
    await readyForQuestionConsensusTWUOpportunity(recipients, opportunity);
  }
}

export async function handleTWUQuestionConsensusSubmitted(
  connection: db.Connection,
  opportunity: TWUOpportunity
): Promise<void> {
  // Notify author and admins that consensus has been submitted.
  const author =
    opportunity.createdBy &&
    getValidValue(
      await db.readOneUser(connection, opportunity.createdBy.id),
      null
    );
  // Notify all admin users of the submitted TWU
  const adminUsers =
    getValidValue(
      await db.readManyUsersByRole(connection, UserType.Admin),
      null
    ) || [];
  const recipients = [author, ...adminUsers].filter(
    (user): user is User => !!user
  );
  if (recipients.length) {
    await questionConsensusTWUOpportunitySubmitted(recipients, opportunity);
  }
}

export async function handleTWUQuestionConsensusFinalized(
  connection: db.Connection,
  opportunity: TWUOpportunity
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
    questionConsensusTWUOpportunityFinalized(recipients, opportunity);
  }
}

/**
 * Notify panel that the opportunity is ready
 *
 * @param connection
 * @param opportunity
 */
export async function handleTWUReadyForEvaluation(
  connection: db.Connection,
  opportunity: TWUOpportunity
): Promise<void> {
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
    await readyForEvalTWUOpportunity(panel, opportunity);
  }
}

export const readyForEvalTWUOpportunity = makeSend(readyForEvalTWUOpportunityT);

/**
 * Generates email content
 *
 * @param recipients
 * @param opportunity
 */
export async function readyForEvalTWUOpportunityT(
  recipients: User[],
  opportunity: TWUOpportunity
): Promise<Emails> {
  const title = "Your Team With Us Opportunity is Ready to Be Evaluated";
  const description =
    "Your Digital Marketplace opportunity has reached its proposal deadline.";
  const emails: Emails = [];
  for (let i = 0; i < recipients.length; i += MAILER_BATCH_SIZE) {
    const batch = recipients.slice(i, i + MAILER_BATCH_SIZE);
    emails.push({
      summary:
        "TWU opportunity proposal deadline reached; sent to government author.",
      to: batch.map((r) => r.email || ""),
      subject: title,
      html: templates.simple({
        title,
        description,
        descriptionLists: [makeTWUOpportunityInformation(opportunity)],
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
        callsToAction: [viewTWUOpportunityCallToAction(opportunity)]
      })
    });
  }

  return emails;
}

export const editTWUPanel = makeSend(editTWUPanelT);

export async function editTWUPanelT(
  recipients: User[],
  opportunity: TWUOpportunity
): Promise<Emails> {
  const title =
    "You Have Been Added to the Evaluation Panel for a Team With Us Opportunity";
  const description =
    "You have been added as an evaluation panelist for the following Digital Marketplace opportunity";
  const emails: Emails = [];
  for (let i = 0; i < recipients.length; i += MAILER_BATCH_SIZE) {
    const batch = recipients.slice(i, i + MAILER_BATCH_SIZE);
    emails.push({
      summary:
        "TWU opportunity evaluation panel updated; sent to evaluation panelists.",
      to: MAILER_REPLY,
      bcc: batch.map((r) => r.email || ""),
      subject: title,
      html: templates.simple({
        title,
        description,
        descriptionLists: [makeTWUOpportunityInformation(opportunity)],
        callsToAction: [viewTWUOpportunityCallToAction(opportunity)]
      })
    });
  }
  return emails;
}

/**
 * wrapper
 */
export const newTWUOpportunityPublished = makeSend(newTWUOpportunityPublishedT);

/**
 * Generates email content related to the publishing of an opportunity
 *
 * @param recipients
 * @param opportunity
 */
export async function newTWUOpportunityPublishedT(
  recipients: User[],
  opportunity: TWUOpportunity
): Promise<Emails> {
  const title = `A New Team With Us Opportunity Has Been Posted`;
  const emails: Emails = [];
  for (let i = 0; i < recipients.length; i += MAILER_BATCH_SIZE) {
    const batch = recipients.slice(i, i + MAILER_BATCH_SIZE);
    emails.push({
      summary: `New TWU opportunity published; sent to user with notifications turned on.`,
      to: MAILER_REPLY,
      bcc: batch.map((r) => r.email || ""),
      subject: title,
      html: templates.simple({
        title,
        description: `A new opportunity has been posted to the Digital Marketplace:`,
        descriptionLists: [makeTWUOpportunityInformation(opportunity)],
        callsToAction: [viewTWUOpportunityCallToAction(opportunity)]
      })
    });
  }
  return emails;
}

/**
 * wrapper
 */
export const successfulTWUPublication = makeSend(successfulTWUPublicationT);

/**
 * Creates a template to send to the author of the TWU Publication
 *
 * @param recipient - object, user or author of the post
 * @param opportunity - object, TWU opportunity
 * @param repost - boolean, first time publishing or not
 */
export async function successfulTWUPublicationT(
  recipient: User,
  opportunity: TWUOpportunity
): Promise<Emails> {
  const title = `Your Team With Us Opportunity Has Been Posted`;
  const description = `You have successfully posted the following Digital Marketplace opportunity`;
  return [
    {
      summary: `TWU successfully published; sent to publishing government user.`,
      to: recipient.email || [],
      subject: title,
      html: templates.simple({
        title,
        description,
        descriptionLists: [makeTWUOpportunityInformation(opportunity)],
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
              and access the opportunity via your dashboard.{" "}
            </p>
          </div>
        ),
        callsToAction: [viewTWUOpportunityCallToAction(opportunity)]
      })
    }
  ];
}

export const cancelledTWUOpportunitySubscribed = makeSend(
  cancelledTWUOpportunitySubscribedT
);

export async function cancelledTWUOpportunitySubscribedT(
  recipient: User,
  opportunity: TWUOpportunity
): Promise<Emails> {
  const title = "A Team With Us Opportunity Has Been Cancelled";
  const description =
    "The following Digital Marketplace opportunity has been cancelled:";
  return [
    {
      summary:
        "TWU opportunity cancelled; sent to subscribed users and vendors with proposals.",
      to: recipient.email || [],
      subject: title,
      html: templates.simple({
        title,
        description,
        descriptionLists: [makeTWUOpportunityInformation(opportunity)],
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

export const cancelledTWUOpportunityActioned = makeSend(
  cancelledTWUOpportunityActionedT
);

export async function cancelledTWUOpportunityActionedT(
  recipient: User,
  opportunity: TWUOpportunity
): Promise<Emails> {
  const title = "A Team With Us Opportunity Has Been Cancelled";
  const description =
    "You have cancelled the following opportunity on the Digital Marketplace:";
  return [
    {
      summary:
        "TWU opportunity cancelled; sent to the administrator who actioned.",
      to: recipient.email || [],
      subject: title,
      html: templates.simple({
        title,
        description,
        descriptionLists: [makeTWUOpportunityInformation(opportunity)]
      })
    }
  ];
}
