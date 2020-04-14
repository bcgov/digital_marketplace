import * as db from 'back-end/lib/db';
import { Emails } from 'back-end/lib/mailer';
import * as templates from 'back-end/lib/mailer/templates';
import { makeSend } from 'back-end/lib/mailer/transport';
import React from 'react';
import { Affiliation } from 'shared/lib/resources/affiliation';
import { Organization } from 'shared/lib/resources/organization';
import { User } from 'shared/lib/resources/user';
import { getValidValue } from 'shared/lib/validation';

export async function handleUserInvited(affiliation: Affiliation): Promise<void> {
  // Notify the user who was invited
  await addedToTeam(affiliation);
}

export async function handleUserAcceptedInvitation(connection: db.Connection, affiliation: Affiliation): Promise<void> {
  // Notify owner of the affiliated organization
  const owner = getValidValue(await db.readOneOrganizationOwner(connection, affiliation.organization.id), null);
  if (owner) {
    await approvedRequestToJoin(owner, affiliation.user, affiliation.organization);
  }

  // Notify the new member
  await membershipComplete(affiliation);
}

export async function handleUserRejectedInvitation(connection: db.Connection, affiliation: Affiliation): Promise<void> {
  // Notify owner of the affiliated organizatoin
  const owner = getValidValue(await db.readOneOrganizationOwner(connection, affiliation.organization.id), null);
  if (owner) {
    await rejectRequestToJoin(owner, affiliation.user, affiliation.organization);
  }
}

export const addedToTeam = makeSend(addedToTeamT);

export async function addedToTeamT(affiliation: Affiliation): Promise<Emails> {
  const organization = affiliation.organization;
  const recipient = affiliation.user;
  const title = `${organization.legalName} Has Added You to Their Team`;
  const description = `${organization.legalName} has requested that you join their team on the Digital Marketplace.`;
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
      ),
      callsToAction: [approveJoinRequestCallToAction(recipient, affiliation), rejectJoinRequestCallToAction(recipient, affiliation)]
    })
  }];
}

export const approvedRequestToJoin = makeSend(approvedRequestToJoinT);

export async function approvedRequestToJoinT(recipient: User, member: User, organization: Organization): Promise<Emails> {
  const title = `${member.name} Has Joined ${organization.legalName}`;
  const description = `${member.name} has approved their membership in ${organization.legalName} on the Digital Marketplace.`;
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
      callsToAction: [viewOrganizationCallToAction(organization)]
    })
  }];
}

export const rejectRequestToJoin = makeSend(rejectRequestToJoinT);

export async function rejectRequestToJoinT(recipient: User, member: User, organization: Organization): Promise<Emails> {
  const title = `${member.name} Has Rejected the Request to Join ${organization.legalName}`;
  const description = `${member.name} has rejected your offer to join ${organization.legalName} on the Digital Marketplace.`;
  return [{
    to: recipient.email,
    subject: title,
    html: templates.simple({
      title,
      description
    })
  }];
}

export const membershipComplete = makeSend(membershipCompleteT);

export async function membershipCompleteT(affiliation: Affiliation): Promise<Emails> {
  const recipient = affiliation.user;
  const organizationName = affiliation.organization.legalName;
  const title = `You Are Now a Member of ${organizationName}`;
  const description = `You are now a member of ${organizationName} on the Digital Marketplace`;
  return [{
    to: recipient.email,
    subject: title,
    html: templates.simple({
      title,
      description,
      body: (
        <div>
          <p>{organizationName} can now include you on proposals to  Sprint With Us opportunities.</p>
        </div>
      ),
      callsToAction: [viewOrganizationCallToAction(affiliation.organization)]
    })
  }];
}

export function viewOrganizationCallToAction(organization: Organization): templates.LinkProps {
  return {
    text: 'View Organization',
    url: templates.makeUrl(`organizations/${organization.id}`)
  };
}

export function approveJoinRequestCallToAction(user: User, affiliation: Affiliation) {
  return {
    text: 'Approve',
    url: templates.makeUrl(`users/${user.id}?tab=organizations&invitationAffiliationId=${affiliation.id}&invitationResponse=approve`)
  };
}

export function rejectJoinRequestCallToAction(user: User, affiliation: Affiliation) {
  return {
    text: 'Reject',
    url: templates.makeUrl(`users/${user.id}?tab=organization&invitationAffiliationId=${affiliation.id}&invitationResponse=reject`)
  };
}
