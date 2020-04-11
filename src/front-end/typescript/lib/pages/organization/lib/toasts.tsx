import { TITLE as SWU_TERMS_TITLE } from 'front-end/lib/pages/organization/sprint-with-us-terms';
import React from 'react';
import { Organization } from 'shared/lib/resources/organization';

export const addedTeamMembers = {
  success: (emails: string[]) => ({
    title: 'Added Team Members',
    body: (
      <div>
        <p>Successfully invited the following people to join this organization:</p>
        <ul>
          {emails.map((e, i) => (
            <li key={`organization-add-team-members-success-toast-${i}`}>{e}</li>
          ))}
        </ul>
      </div>
    )
  }),
  warning: (emails: string[]) => ({
    title: 'Unable to Add Unregistered Team Members',
    body: (
      <div>
        <p>The following people have not yet registered with the Digital Marketplace. However, they have been sent an email that invites them to create an account. Once they have registered, please try adding them to this organization again.</p>
        <ul>
          {emails.map((e, i) => (
            <li key={`organization-add-team-members-warning-toast-${i}`}>{e}</li>
          ))}
        </ul>
      </div>
    )
  }),
  error: (emails: string[]) => ({
    title: 'Unable to Add Team Members',
    body: (
      <div>
        <p>The following people could not be added to this organization:</p>
        <ul>
          {emails.map((e, i) => (
            <li key={`organization-add-team-members-error-toast-${i}`}>{e}</li>
          ))}
        </ul>
      </div>
    )
  })
};

export const removedTeamMember = {
  success: {
    title: 'Removed Team Member',
    body: 'You have successfully removed a team member from this organization.'
  },
  error: {
    title: 'Unable to Remove Team Member',
    body: 'This team member could not be removed from this organization.'
  }
};

export const acceptedSWUTerms = {
  success: (organization: Organization) => ({
    title: 'Accepted Terms & Conditions',
    body: `Successfully accepted the ${SWU_TERMS_TITLE} for ${organization.legalName}.`
  }),
  error: (organization: Organization) => ({
    title: 'Unable to Accept Terms & Conditions',
    body: `An error occurred while attempting to accept the ${SWU_TERMS_TITLE} for ${organization.legalName}. Please try again later.`
  })
};
