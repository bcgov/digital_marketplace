import * as db from 'back-end/lib/db';
import { Emails } from 'back-end/lib/mailer';
import * as templates from 'back-end/lib/mailer/templates';
import { makeSend } from 'back-end/lib/mailer/transport';
import React from 'react';
import { Affiliation } from 'shared/lib/resources/affiliation';
import { Organization } from 'shared/lib/resources/organization';
import { User } from 'shared/lib/resources/user';

// import { getValidValue } from 'shared/lib/validation';

export async function handleUserInvited(connection: db.Connection, affiliation: Affiliation): Promise<void> {
  // Notify the user who was invited
  await sendInvitation(affiliation.user, affiliation.organization);
}

export async function handleUserAcceptedInvitation(connection: db.Connection, affiliation: Affiliation): Promise<void> {
  // Notify owner of the affiliated organization
  // const owner = getValidValue(await readOneOrganizationOwner(connection, affiliation.organization.id), null);
  // if (owner) {
  //   await acceptedInvitation(owner, affiliation.user, affiliation.organization);
  // }
}

export const sendInvitation = makeSend(sendInvitationT);

export async function sendInvitationT(recipient: User, organization: Organization): Promise<Emails> {
  const title = `You Have Been Invited To Join ${organization.legalName}`;
  const description = `You have been invited to join ${organization.legalName} on the Digital Marketplace.`;
  return [{
    to: recipient.email,
    subject: title,
    html: templates.simple({
      title,
      description,
      body: (
        <div>
          <p style={{...templates.styles.utilities.font.italic}}>What Happens Next?</p>
          <p>You can approve or reject your membership with {organization.legalName} by using one of the buttons below.</p>
          <p>If you approve the membership, you can be included as a team member on future Sprint With Us proposals submitted by {organization.legalName}</p>
        </div>
      )
    })
  }];
}

export const acceptedInvitation = makeSend(acceptedInvitationT);

export async function acceptedInvitationT(recipient: User, member: User, organization: Organization): Promise<Emails> {
  const title = `${member.name} Has Joined ${organization.legalName}`;
  const description = `${member.name} has accepted your invite to join ${organization.legalName}.`;
  return [{
    to: recipient.email,
    subject: title,
    html: templates.simple({
      title,
      description,
      body: (
        <div>
          <p>{member.name} can now be included in proposals submitted by {organization.legalName} to Sprint With Us opportunities.</p>
        </div>
      ),
      callsToAction: [viewOrganizationCallToAction(organization, true)]
    })
  }];
}

export function viewOrganizationCallToAction(organization: Organization, authenticatedView = false): templates.LinkProps {
  return {
    text: 'View Organization',
    url: authenticatedView ? templates.makeUrl(`sign-in?redirectOnSuccess=${encodeURIComponent(`/organizations/${organization.id}`)}`) : templates.makeUrl(`organizations/${organization.id}`)
  };
}
