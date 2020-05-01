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
    await approvedRequestToJoin(owner, affiliation);
  }

  // Notify the new member
  await membershipComplete(affiliation);
}

export async function handleUserRejectedInvitation(connection: db.Connection, affiliation: Affiliation): Promise<void> {
  // Notify owner of the affiliated organization
  const owner = getValidValue(await db.readOneOrganizationOwner(connection, affiliation.organization.id), null);
  if (owner) {
    await rejectRequestToJoin(owner, affiliation);
  }
}

export async function handleMemberLeavesTeam(connection: db.Connection, affiliation: Affiliation): Promise<void> {
  // Notify owner of the affiliated organization
  const owner = getValidValue(await db.readOneOrganizationOwner(connection, affiliation.organization.id), null);
  if (owner) {
    await memberLeaves(owner, affiliation);
  }
}

export const addedToTeam = makeSend(addedToTeamT);

export async function addedToTeamT(affiliation: Affiliation): Promise<Emails> {
  const organization = affiliation.organization;
  const recipient = affiliation.user;
  const title = `${organization.legalName} Has Sent You a Team Request`;
  return [{
    to: recipient.email,
    subject: title,
    html: templates.simple({
      title,
      body: (
        <div>
          <p>{organization.legalName} has requested that you join their team on the Digital Marketplace.</p>
          <p style={{...templates.styles.utilities.font.italic}}>What Happens Next?</p>
          <p>You can approve or reject your membership with {organization.legalName} by using one of the buttons below.</p>
          <p>If you approve the membership, you can be included as a team member on future Sprint With Us proposals submitted by {organization.legalName}.</p>
        </div>
      ),
      callsToAction: [approveJoinRequestCallToAction(recipient, affiliation), rejectJoinRequestCallToAction(recipient, affiliation)]
    })
  }];
}

export const approvedRequestToJoin = makeSend(approvedRequestToJoinT);

export async function approvedRequestToJoinT(recipient: User, affiliation: Affiliation): Promise<Emails> {
  const memberName = affiliation.user.name;
  const organizationName = affiliation.organization.legalName;
  const title = `${memberName} Has Approved Your Team Request`;
  return [{
    to: recipient.email,
    subject: title,
    html: templates.simple({
      title,
      body: (
        <div>
          <p>{memberName} has approved your request to join {organizationName}'s team on the Digital Marketplace.</p>
          <p>{memberName} can now be included in proposals submitted by {organizationName} to Sprint With Us opportunities.</p>
        </div>
      ),
      callsToAction: [viewOrganizationCallToAction(affiliation.organization)]
    })
  }];
}

export const rejectRequestToJoin = makeSend(rejectRequestToJoinT);

export async function rejectRequestToJoinT(recipient: User, affiliation: Affiliation): Promise<Emails> {
  const memberName = affiliation.user.name;
  const organizationName = affiliation.organization.legalName;
  const title = `${memberName} Has Rejected Your Team Request`;
  return [{
    to: recipient.email,
    subject: title,
    html: templates.simple({
      title,
      body: (
        <div>
          <p>{memberName} has rejected your request to join {organizationName}'s team on the Digital Marketplace.</p>
        </div>
      )
    })
  }];
}

export const membershipComplete = makeSend(membershipCompleteT);

export async function membershipCompleteT(affiliation: Affiliation): Promise<Emails> {
  const recipient = affiliation.user;
  const organizationName = affiliation.organization.legalName;
  const title = `You Have Joined ${organizationName}'s Team`;
  return [{
    to: recipient.email,
    subject: title,
    html: templates.simple({
      title,
      body: (
        <div>
          <p>You are now a member of {organizationName}'s team on the Digital Marketplace</p>
          <p>{organizationName} can now include you on proposals to  Sprint With Us opportunities.</p>
        </div>
      ),
      callsToAction: [viewMyOrganizationsCallToAction(recipient)]
    })
  }];
}

export const memberLeaves = makeSend(memberLeavesT);

export async function memberLeavesT(recipient: User, affiliation: Affiliation): Promise<Emails> {
  const organizationName = affiliation.organization.legalName;
  const memberName = affiliation.user.name;
  const title = `${memberName} Has Left ${organizationName}'s Team`;
  return [{
    to: recipient.email,
    subject: title,
    html: templates.simple({
      title,
      body: (
        <div>
          <p>{memberName} has left {organizationName}'s team on the Digital Marketplace.  They will no longer be able to be included on proposals for Sprint With Us opportunities.</p>
        </div>
      ),
      callsToAction: [viewOrganizationCallToAction(affiliation.organization)]
    })
  }];
}

export function viewOrganizationCallToAction(organization: Organization): templates.LinkProps {
  return {
    text: 'View Organization',
    url: templates.makeUrl(`organizations/${organization.id}/edit`)
  };
}

export function viewMyOrganizationsCallToAction(user: User): templates.LinkProps {
  return {
    text: 'View Organizations',
    url: templates.makeUrl(`users/${user.id}?tab=organizations`)
  };
}

export function approveJoinRequestCallToAction(user: User, affiliation: Affiliation) {
  return {
    text: 'Approve',
    url: templates.makeUrl(`users/${user.id}?tab=organizations&invitationAffiliationId=${affiliation.id}&invitationResponse=approve`),
    style: { backgroundColor: '#2E8540' }
  };
}

export function rejectJoinRequestCallToAction(user: User, affiliation: Affiliation) {
  return {
    text: 'Reject',
    url: templates.makeUrl(`users/${user.id}?tab=organization&invitationAffiliationId=${affiliation.id}&invitationResponse=reject`),
    style: { backgroundColor: '#D8292F' }
  };
}
