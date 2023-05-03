import * as db from "back-end/lib/db";
import { formatAmount, formatDate, formatTime } from "shared/lib";
import * as templates from "back-end/lib/mailer/templates";
import { TWUOpportunity } from "shared/lib/resources/opportunity/team-with-us";
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
  const items = [
    { name: "Type", value: "Team With Us" },
    { name: "Value", value: `$${formatAmount(opportunity.maxBudget)}` },
    {
      name: "Service Area",
      value: `${startCase(lowerCase(opportunity.serviceArea))}`
    },
    {
      name: "Contract Start Date",
      value: formatDate(opportunity.startDate, false)
    },
    {
      name: "Contract End Date",
      value: opportunity.completionDate
        ? formatDate(opportunity.completionDate, false)
        : ""
    },
    { name: "Location", value: opportunity.location },
    { name: "Remote OK?", value: opportunity.remoteOk ? "Yes" : "No" }
  ];
  if (showDueDate) {
    items.push({
      name: "Proposals Due",
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
  opportunity: TWUOpportunity,
  repost: boolean
): Promise<void> {
  // Notify all users with notifications on
  const subscribedUsers =
    getValidValue(await db.readManyUsersNotificationsOn(connection), null) ||
    [];
  await newTWUOpportunityPublished(subscribedUsers, opportunity, repost);

  // Notify authoring gov user of successful publish
  const author =
    opportunity?.createdBy &&
    getValidValue(
      await db.readOneUser(connection, opportunity.createdBy.id),
      null
    );
  if (author) {
    await successfulTWUPublication(author, opportunity, repost);
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

/**
 *  Notify all subscribed users on this opportunity, as well as users with
 *  proposals (we union so that we don't notify anyone twice).
 *  Notify authoring gov user of suspension
 *
 * @param connection
 * @param opportunity
 */
export async function handleTWUSuspended(
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
      async (user) => await suspendedTWUOpportunitySubscribed(user, opportunity)
    )
  );

  const author =
    opportunity.createdBy &&
    getValidValue(
      await db.readOneUser(connection, opportunity.createdBy.id),
      null
    );
  if (author) {
    await suspendedTWUOpportunityActioned(author, opportunity);
  }
}

/**
 * Notify gov user that the opportunity is ready
 *
 * @param connection
 * @param opportunity
 */
export async function handleTWUReadyForEvaluation(
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
  if (author) {
    await readyForEvalTWUOpportunity(author, opportunity);
  }
}

export const readyForEvalTWUOpportunity = makeSend(readyForEvalTWUOpportunityT);

/**
 * Generates email content
 *
 * @param recipient
 * @param opportunity
 */
export async function readyForEvalTWUOpportunityT(
  recipient: User,
  opportunity: TWUOpportunity
): Promise<Emails> {
  const title = "Your Team With Us Opportunity is Ready to Be Evaluated";
  const description =
    "Your Digital Marketplace opportunity has reached its proposal deadline.";
  return [
    {
      summary:
        "TWU opportunity proposal deadline reached; sent to government author.",
      to: recipient.email || [],
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
    }
  ];
}
/**
 * wrapper
 */
export const newTWUOpportunityPublished = makeSend(newTWUOpportunityPublishedT);

/**
 * Generates email content related to the publishing, or re-publishing of
 * an opportunity
 *
 * @param recipients
 * @param opportunity
 * @param repost
 */
export async function newTWUOpportunityPublishedT(
  recipients: User[],
  opportunity: TWUOpportunity,
  repost: boolean
): Promise<Emails> {
  const title = `A ${repost ? "" : "New"} Team With Us Opportunity Has Been ${
    repost ? "Re-posted" : "Posted"
  }`;
  const emails: Emails = [];
  for (let i = 0; i < recipients.length; i += MAILER_BATCH_SIZE) {
    const batch = recipients.slice(i, i + MAILER_BATCH_SIZE);
    emails.push({
      summary: `${
        repost
          ? "TWU opportunity re-published after suspension"
          : "New TWU opportunity published"
      }; sent to user with notifications turned on.`,
      to: MAILER_REPLY,
      bcc: batch.map((r) => r.email || ""),
      subject: title,
      html: templates.simple({
        title,
        description: `A ${
          repost ? "previously suspended" : "new"
        } opportunity has been ${
          repost ? "re-posted" : "posted"
        } to the Digital Marketplace:`,
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
  opportunity: TWUOpportunity,
  repost: boolean
): Promise<Emails> {
  const title = `Your Team With Us Opportunity Has Been ${
    repost ? "Re-posted" : "Posted"
  }`;
  const description = `You have successfully ${
    repost ? "re-posted" : "posted"
  } the following Digital Marketplace opportunity`;
  return [
    {
      summary: `TWU successfully ${
        repost ? "re-published" : "published"
      }; sent to publishing government user.`,
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

export const suspendedTWUOpportunitySubscribed = makeSend(
  suspendedTWUOpportunitySubscribedT
);

export async function suspendedTWUOpportunitySubscribedT(
  recipient: User,
  opportunity: TWUOpportunity
): Promise<Emails> {
  const title = "A Team With Us Opportunity Has Been Suspended";
  const description =
    "The following Digital Marketplace opportunity has been suspended:";
  return [
    {
      summary:
        "TWU opportunity suspended; sent to subscribed users and vendors with proposals.",
      to: recipient.email || [],
      subject: title,
      html: templates.simple({
        title,
        description,
        descriptionLists: [makeTWUOpportunityInformation(opportunity)],
        body: (
          <div>
            <p>
              If you have already submitted a proposal to this opportunity, you
              may make changes to it while the opportunity is suspended.
            </p>
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

export const suspendedTWUOpportunityActioned = makeSend(
  suspendedTWUOpportunityActionedT
);

export async function suspendedTWUOpportunityActionedT(
  recipient: User,
  opportunity: TWUOpportunity
): Promise<Emails> {
  const title = "A Team With Us Opportunity Has Been Suspended";
  const description =
    "You have suspended the following opportunity on the Digital Marketplace:";
  return [
    {
      summary:
        "TWU opportunity suspended; sent to the administrator who actioned.",
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
