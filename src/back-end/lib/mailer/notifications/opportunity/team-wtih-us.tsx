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

/**
 *
 * @param connection
 * @param opportunity
 */
export async function handleSWUSubmittedForReview(
  connection: db.Connection,
  opportunity: TWUOpportunity
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

export const newTWUOpportunitySubmittedForReview = makeSend(
  newTWUOpportunitySubmittedForReviewT
);

/**
 *
 * @param recipient
 * @param opportunity
 * @returns
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

/**
 *
 */
export const newTWUOpportunitySubmittedForReviewAuthor = makeSend(
  newTWUOpportunitySubmittedForReviewAuthorT
);

/**
 *
 * @param recipient
 * @param opportunity
 * @returns
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
 *
 * @param opportunity
 * @param showDueDate
 * @returns
 */
export function makeTWUOpportunityInformation(
  opportunity: TWUOpportunity,
  showDueDate = true
): templates.DescriptionListProps {
  const items = [
    { name: "Type", value: "Team With Us" },
    { name: "Value", value: `$${formatAmount(opportunity.maxBudget)}` },
    { name: "Service Area", value: opportunity.serviceArea },
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
 *
 * @param opportunity
 * @returns
 */
export function viewTWUOpportunityCallToAction(
  opportunity: TWUOpportunity
): templates.LinkProps {
  return {
    text: "View Opportunity",
    url: templates.makeUrl(`/opportunities/team-with-us/${opportunity.id}`)
  };
}
