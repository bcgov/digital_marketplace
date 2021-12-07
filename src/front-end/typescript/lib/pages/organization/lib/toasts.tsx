import { TITLE as SWU_TERMS_TITLE } from 'front-end/lib/pages/organization/sprint-with-us-terms';
import React from 'react';
import { AffiliationMember, AffiliationSlim } from 'shared/lib/resources/affiliation';
import { Organization } from 'shared/lib/resources/organization';

export const created = {
  success: {
    title: 'Organization Created',
    body: 'Your organization has been successfully created.'
  },
  error: {
    title: 'Unable to Create Organization',
    body: 'Your organization could not be created. Please try again later.'
  }
};

export const updated = {
  success: {
    title: 'Organization Updated',
    body: 'Your organization has been successfully updated.'
  },
  error: {
    title: 'Unable to Update Organization',
    body: 'Your organization could not be updated. Please try again later.'
  }
};

export const archived = {
  success: {
    title: 'Organization Archived',
    body: 'Organization archived successfully.'
  },
  error: {
    title: 'Unable to Archive Organization',
    body: 'Unable to archive organization. Please try again later.'
  }
};

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
  success: (aff: AffiliationMember) => ({
    title: 'Removed Team Member',
    body: `You have successfully removed ${aff.user.name} from this organization.`
  }),
  error: (aff: AffiliationMember) => ({
    title: 'Unable to Remove Team Member',
    body: `${aff.user.name} could not be removed from this organization.`
  })
};

export const approvedTeamMember = {
  success: (aff: AffiliationMember) => ({
    title: 'Approved Team Member',
    body: `You have successfully approved ${aff.user.name} for this organization.`
  }),
  error: (aff: AffiliationMember) => ({
    title: 'Unable to Approve Team Member',
    body: `${aff.user.name} could not be approved for this organization.`
  })
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

export const leftOrganization = {
  success: (aff: AffiliationSlim) => ({
    title: 'Left Organization',
    body: `Successfully left ${aff.organization.legalName}.`
  }),
  error: (aff: AffiliationSlim) => ({
    title: 'Unable to Leave Organization',
    body: `An error occurred while attempting to leave ${aff.organization.legalName}. Please try again later.`
  })
};

export const approvedOrganizationRequest = {
  success: (aff: AffiliationSlim) => ({
    title: 'Approved Request',
    body: `Successfully approved the request to join ${aff.organization.legalName}.`
  }),
  error: (aff: AffiliationSlim) => ({
    title: 'Unable to Approve Request',
    body: `An error occurred while attempting to approve the request to join ${aff.organization.legalName}. Please try again later.`
  })
};

export const rejectedOrganizationRequest = {
  success: (aff: AffiliationSlim) => ({
    title: 'Rejected Request',
    body: `Successfully rejected the request to join ${aff.organization.legalName}.`
  }),
  error: (aff: AffiliationSlim) => ({
    title: 'Unable to Reject Request',
    body: `An error occurred while attempting to reject the request to join ${aff.organization.legalName}. Please try again later.`
  })
};
