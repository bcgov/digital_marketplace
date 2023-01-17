import { MAILER_BATCH_SIZE, MAILER_REPLY } from "back-end/config";
import * as db from "back-end/lib/db";
import { Emails } from "back-end/lib/mailer";
import * as templates from "back-end/lib/mailer/templates";
import { makeSend } from "back-end/lib/mailer/transport";
import { unionBy } from "lodash";
import React from "react";
import { CONTACT_EMAIL } from "shared/config";
import { formatAmount, formatDate, formatTime } from "shared/lib";
import { TWUOpportunity } from "shared/lib/resources/opportunity/team-with-us";
import { User, UserType } from "shared/lib/resources/user";
import { getValidValue } from "shared/lib/validation";

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

export async function handleTWUUpdated(
  connection: db.Connection,
  opportunity: TWUOpportunity
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
      await db.readManyTWUSubscribedUsers(connection, opportunity.id),
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
  await updatedTWUOpportunity(unionedUsers, opportunity);
}

export async function handleTWUCancelled(
  connection: db.Connection,
  opportunity: TWUOpportunity
): Promise<void> {
  // Notify all subscribed users on this opportunity, as well as users with proposals (we union so we don't notify anyone twice)
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

  // Notify authoring gov user of cancellation
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

export async function handleTWUSuspended(
  connection: db.Connection,
  opportunity: TWUOpportunity
): Promise<void> {
  // Notify all subscribed users on this opportunity, as well as users with proposals (we union so we don't notify anyone twice)
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

  // Notify authoring gov user of suspension
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

export async function handleTWUReadyForEvaluation(
  connection: db.Connection,
  opportunity: TWUOpportunity
): Promise<void> {
  // Notify gov user that the opportunity is ready
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

export const newTWUOpportunityPublished = makeSend(newTWUOpportunityPublishedT);

export async function newTWUOpportunityPublishedT(
  recipients: User[],
  opportunity: TWUOpportunity,
  repost: boolean
): Promise<Emails> {
  const title = `A ${repost ? "" : "New"} Sprint With Us Opportunity Has Been ${
    repost ? "Re-posted" : "Posted"
  }`;
  const description = `A ${
    repost ? "previously suspended" : "new"
  } opportunity has been ${
    repost ? "re-posted" : "posted"
  } to the Digital Marketplace:`;
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
        description,
        descriptionLists: [makeTWUOpportunityInformation(opportunity)],
        body: (
          <div>
            <p>
              Please note that you must be a{" "}
              <templates.Link
                text="Qualified Supplier"
                url={templates.makeUrl("/learn-more/team-with-us")}
              />{" "}
              in order to submit a proposal to a Sprint With Us opportunity.
            </p>
          </div>
        ),
        callsToAction: [viewTWUOpportunityCallToAction(opportunity)]
      })
    });
  }
  return emails;
}

export const updatedTWUOpportunity = makeSend(updatedTWUOpportunityT);

export async function updatedTWUOpportunityT(
  recipients: User[],
  opportunity: TWUOpportunity
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
        descriptionLists: [makeTWUOpportunityInformation(opportunity)],
        callsToAction: [viewTWUOpportunityCallToAction(opportunity)]
      })
    });
  }
  return emails;
}

export const newTWUOpportunitySubmittedForReview = makeSend(
  newTWUOpportunitySubmittedForReviewT
);

export async function newTWUOpportunitySubmittedForReviewT(
  recipient: User,
  opportunity: TWUOpportunity
): Promise<Emails> {
  const title = "A Sprint With Us Opportunity Has Been Submitted For Review";
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

export const newTWUOpportunitySubmittedForReviewAuthor = makeSend(
  newTWUOpportunitySubmittedForReviewAuthorT
);

export async function newTWUOpportunitySubmittedForReviewAuthorT(
  recipient: User,
  opportunity: TWUOpportunity
): Promise<Emails> {
  const title = "Your Sprint With Us Opportunity Has Been Submitted For Review"; // Used for subject line and heading
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

export const successfulTWUPublication = makeSend(successfulTWUPublicationT);

export async function successfulTWUPublicationT(
  recipient: User,
  opportunity: TWUOpportunity,
  repost: boolean
): Promise<Emails> {
  const title = `Your Sprint With Us Opportunity Has Been ${
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
              and access the opportunity via your dashboard.
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
  const title = "A Sprint With Us Opportunity Has Been Cancelled";
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
  const title = "A Sprint With Us Opportunity Has Been Cancelled";
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
  const title = "A Sprint With Us Opportunity Has Been Suspended";
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
  const title = "A Sprint With Us Opportunity Has Been Suspended";
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

export const readyForEvalTWUOpportunity = makeSend(readyForEvalTWUOpportunityT);

export async function readyForEvalTWUOpportunityT(
  recipient: User,
  opportunity: TWUOpportunity
): Promise<Emails> {
  const title = "Your Sprint With Us Opportunity is Ready to Be Evaluated";
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

export function makeTWUOpportunityInformation(
  opportunity: TWUOpportunity,
  showDueDate = true
): templates.DescriptionListProps {
  const items = [
    { name: "Type", value: "Sprint With Us" },
    { name: "Value", value: `$${formatAmount(opportunity)}` },
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

export function viewTWUOpportunityCallToAction(
  opportunity: TWUOpportunity
): templates.LinkProps {
  return {
    text: "View Opportunity",
    url: templates.makeUrl(`/opportunities/team-with-us/${opportunity.id}`)
  };
}
