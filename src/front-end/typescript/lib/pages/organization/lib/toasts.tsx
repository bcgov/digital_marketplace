import React from 'react';

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
        <p>The following people are not yet registered with the Digital Marketplace. However, they have been sent an email that invites them to create an account. Once they have done so, please try adding them to this organization again.</p>
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
