import * as mailer from 'back-end/lib/mailer';
import { addedToTeamT, approvedRequestToJoinT, membershipCompleteT, rejectRequestToJoinT } from 'back-end/lib/mailer/notifications/affiliation';
import { cancelledCWUOpportunityActionedT, cancelledCWUOpportunitySubscribedT, newCWUOpportunityPublishedT, readyForEvalCWUOpportunityT, successfulCWUPublicationT, suspendedCWUOpportunityActionedT, suspendedCWUOpportunitySubscribedT, updatedCWUOpportunityT } from 'back-end/lib/mailer/notifications/opportunity/code-with-us';
import { cancelledSWUOpportunityActionedT, cancelledSWUOpportunitySubscribedT, newSWUOpportunityPublishedT, newSWUOpportunitySubmittedForReviewAuthorT, newSWUOpportunitySubmittedForReviewT, readyForEvalSWUOpportunityT, successfulSWUPublicationT, suspendedSWUOpportunityActionedT, suspendedSWUOpportunitySubscribedT, updatedSWUOpportunityT } from 'back-end/lib/mailer/notifications/opportunity/sprint-with-us';
import { awardedCWUProposalSubmissionT, disqualifiedCWUProposalSubmissionT, successfulCWUProposalSubmissionT, unsuccessfulCWUProposalSubmissionT, withdrawnCWUProposalSubmissionProposalAuthorT, withdrawnCWUProposalSubmissionT } from 'back-end/lib/mailer/notifications/proposal/code-with-us';
import { awardedSWUProposalSubmissionT, disqualifiedSWUProposalSubmissionT, successfulSWUProposalSubmissionT, unsuccessfulSWUProposalSubmissionT, withdrawnSWUProposalSubmissionProposalAuthorT, withdrawnSWUProposalSubmissionT } from 'back-end/lib/mailer/notifications/proposal/sprint-with-us';
import { accountDeactivatedAdminT, accountDeactivatedSelfT, accountReactivatedT, inviteToRegisterT, userAccountRegisteredT } from 'back-end/lib/mailer/notifications/user';
import { styles, View } from 'back-end/lib/mailer/templates';
import * as permissions from 'back-end/lib/permissions';
import * as mocks from 'back-end/lib/routers/admin/mocks';
import { HtmlResponseBody, makeHtmlResponseBody, nullRequestBodyHandler, Router } from 'back-end/lib/server';
import { ServerHttpMethod } from 'back-end/lib/types';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const Notification: View<{ email: mailer.Email }> = ({ email }) => {
  return (
    <div>
      {email.summary
        ? (<div style={{ ...styles.utilities.font.bold, ...styles.utilities.font.sm, ...styles.utilities.mb[2], color: 'grey' }}>Summary: {email.summary}</div>)
        : null}
        <div style={{ ...styles.utilities.font.bold, ...styles.utilities.font.sm, ...styles.utilities.mb[3], color: 'grey' }}>Subject: {email.subject}</div>
      <div style={{ ...styles.utilities.borderRadius, ...styles.utilities.mb[4], border: '1px solid silver' }} dangerouslySetInnerHTML={{ __html: email.html }}></div>
    </div>
  );
};

interface NotificationGroupProps {
  title: string;
  emails: mailer.Emails;
}

const NotificationGroup: View<NotificationGroupProps> = ({ title, emails }) => {
  return (
    <div style={{ ...styles.utilities.pl[4], ...styles.utilities.pr[4] }}>
      <h2 style={{ ...styles.utilities.m[0], ...styles.utilities.mb[4] }}>{title}</h2>
      {emails.map((e, i) => (
        <Notification key={`notification-group-notification-${i}`} email={e} />
      ))}
    </div>
  );
};

async function makeEmailNotificationReference(): Promise<View<{}>> {
  const notifications: NotificationGroupProps[] = [
    {
      title: 'Account Registered',
      emails: await userAccountRegisteredT(mocks.govUser)
    },
    {
      title: 'User Invited To Organization',
      emails: await addedToTeamT(mocks.affiliation)
    },
    {
      title: 'User Asked To Register',
      emails: await inviteToRegisterT(mocks.email)
    },
    {
      title: 'User Account Deactivated',
      emails: [
        ...await accountDeactivatedSelfT(mocks.vendorUser),
        ...await accountDeactivatedAdminT(mocks.vendorUser)
      ]
    },
    {
      title: 'User Account Reactivated',
      emails: await accountReactivatedT(mocks.vendorUser)
    },
    {
      title: 'User Approved Being Added To Organization',
      emails: [
        ...await approvedRequestToJoinT(mocks.govUser, mocks.vendorUser, mocks.organization),
        ...await membershipCompleteT(mocks.affiliation)
      ]
    },
    {
      title: 'User Rejected Being Added To Organization',
      emails: await rejectRequestToJoinT(mocks.govUser, mocks.vendorUser, mocks.organization)
    },
    {
      title: 'CWU Opportunity Published',
      emails: [
        ...await newCWUOpportunityPublishedT(mocks.vendorUser, mocks.cwuOpportunity),
        ...await successfulCWUPublicationT(mocks.govUser, mocks.cwuOpportunity)
      ]
    },
    {
      title: 'CWU Opportunity Updated',
      emails: await updatedCWUOpportunityT(mocks.vendorUser, mocks.cwuOpportunity)
    },
    {
      title: 'CWU Opportunity Cancelled',
      emails: [
        ...await cancelledCWUOpportunitySubscribedT(mocks.vendorUser, mocks.cwuOpportunity),
        ...await cancelledCWUOpportunityActionedT(mocks.govUser, mocks.cwuOpportunity)
      ]
    },
    {
      title: 'CWU Opportunity Suspended',
      emails: [
        ...await suspendedCWUOpportunitySubscribedT(mocks.vendorUser, mocks.cwuOpportunity),
        ...await suspendedCWUOpportunityActionedT(mocks.govUser, mocks.cwuOpportunity)
      ]
    },
    {
      title: 'CWU Opportunity Ready for Evaluation',
      emails: await readyForEvalCWUOpportunityT(mocks.govUser, mocks.cwuOpportunity)
    },
    {
      title: 'CWU Proposal Submitted',
      emails: await successfulCWUProposalSubmissionT(mocks.vendorUser, mocks.cwuOpportunity, mocks.cwuProposal)
    },
    {
      title: 'CWU Proposal Awarded',
      emails: [
        ...await awardedCWUProposalSubmissionT(mocks.vendorUser, mocks.cwuOpportunity, mocks.cwuProposal),
        ...await unsuccessfulCWUProposalSubmissionT(mocks.vendorUser, mocks.cwuOpportunity, mocks.cwuProposal)
      ]
    },
    {
      title: 'CWU Proposal Disqualified',
      emails: await disqualifiedCWUProposalSubmissionT(mocks.vendorUser, mocks.cwuOpportunity, mocks.cwuProposal)
    },
    {
      title: 'CWU Proposal Withdrawn',
      emails: [
        ...await withdrawnCWUProposalSubmissionProposalAuthorT(mocks.vendorUser, mocks.cwuOpportunity),
        ...await withdrawnCWUProposalSubmissionT(mocks.govUser, mocks.vendorUser, mocks.cwuOpportunity)
      ]
    },
    {
      title: 'SWU Opportunity Published',
      emails: [
        ...await newSWUOpportunityPublishedT(mocks.vendorUser, mocks.swuOpportunity),
        ...await successfulSWUPublicationT(mocks.govUser, mocks.swuOpportunity)
      ]
    },
    {
      title: 'SWU Opportunity Updated',
      emails: await updatedSWUOpportunityT(mocks.vendorUser, mocks.swuOpportunity)
    },
    {
      title: 'SWU Opportunity Submitted For Review',
      emails: [
        ...await newSWUOpportunitySubmittedForReviewT(mocks.adminUser, mocks.swuOpportunity),
        ...await newSWUOpportunitySubmittedForReviewAuthorT(mocks.govUser, mocks.swuOpportunity)
      ]
    },
    {
      title: 'SWU Opportunity Cancelled',
      emails: [
        ...await cancelledSWUOpportunitySubscribedT(mocks.vendorUser, mocks.swuOpportunity),
        ...await cancelledSWUOpportunityActionedT(mocks.govUser, mocks.swuOpportunity)
      ]
    },
    {
      title: 'SWU Opportunity Suspended',
      emails: [
        ...await suspendedSWUOpportunitySubscribedT(mocks.vendorUser, mocks.swuOpportunity),
        ...await suspendedSWUOpportunityActionedT(mocks.govUser, mocks.swuOpportunity)
      ]
    },
    {
      title: 'SWU Opportunity Ready For Evaluation',
      emails: await readyForEvalSWUOpportunityT(mocks.govUser, mocks.swuOpportunity)
    },
    {
      title: 'SWU Proposal Submitted',
      emails: await successfulSWUProposalSubmissionT(mocks.vendorUser, mocks.swuOpportunity, mocks.swuProposal)
    },
    {
      title: 'SWU Proposal Awarded',
      emails: [
        ...await awardedSWUProposalSubmissionT(mocks.vendorUser, mocks.swuOpportunity, mocks.swuProposal),
        ...await unsuccessfulSWUProposalSubmissionT(mocks.vendorUser, mocks.swuOpportunity, mocks.swuProposal)
      ]
    },
    {
      title: 'SWU Proposal Disqualified',
      emails: await disqualifiedSWUProposalSubmissionT(mocks.vendorUser, mocks.swuOpportunity, mocks.swuProposal)
    },
    {
      title: 'SWU Proposal Withdrawn',
      emails: [
        ...await withdrawnSWUProposalSubmissionProposalAuthorT(mocks.vendorUser, mocks.swuOpportunity),
        ...await withdrawnSWUProposalSubmissionT(mocks.govUser, mocks.vendorUser, mocks.swuOpportunity)
      ]
    }
  ];
  return () => {
    return (
      <html>
        <head>
          <meta charSet='utf8' />
          <title>Email Notification Reference: Digital Marketplace</title>
        </head>
        <body style={{ ...styles.utilities.p[5], maxWidth: styles.helpers.px(styles.helpers.scale(40)), margin: '0 auto' }}>
          <a href='/' style={{ display: 'block', ...styles.classes.link, ...styles.utilities.mb[4] }}>Go back to the Digital Marketplace web app</a>
          <h1 style={{ ...styles.utilities.m[0], ...styles.utilities.mb[5] }}>Email Notification Reference</h1>
          {notifications.map((g, i) => (
            <div key={`notification-group-${i}`}>
              <NotificationGroup {...g} />
              {i < notifications.length - 1
                ? (<div style={{ ...styles.utilities.mt[5], ...styles.utilities.mb[5], width: '100%', borderTop: '1px double grey' }}></div>)
                : null}
            </div>
          ))}
        </body>
      </html>
    );
  };
}

function makeRouter(): Router<any, any, any, any, HtmlResponseBody, any, any> {

  return [
    {
      method: ServerHttpMethod.Get,
      path: '/email-notification-reference',
      handler: nullRequestBodyHandler(async request => {
        const respond = (code: number, body: string) => ({
          code,
          headers: {},
          session: request.session,
          body: makeHtmlResponseBody(body)
        });
        if (!permissions.isAdmin(request.session)) {
          return respond(401, permissions.ERROR_MESSAGE);
        }
        const EmailNotificationReference = await makeEmailNotificationReference();
        return respond(200, renderToStaticMarkup(<EmailNotificationReference />));
      })
    }
  ];
}

export default makeRouter;
