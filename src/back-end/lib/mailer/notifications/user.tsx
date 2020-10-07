import { Emails } from 'back-end/lib/mailer';
import * as templates from 'back-end/lib/mailer/templates';
import { makeSend } from 'back-end/lib/mailer/transport';
import React from 'react';
import { CONTACT_EMAIL } from 'shared/config';
import { Organization } from 'shared/lib/resources/organization';
import { User } from 'shared/lib/resources/user';

export const userAccountRegistered = makeSend(userAccountRegisteredT);

export async function userAccountRegisteredT(recipient: User): Promise<Emails> {
  const title = 'Welcome to the Digital Marketplace';
  const description = 'Thank you for creating an account for the Digital Marketplace web application.';
  return [{
    to: recipient.email,
    subject: title,
    html: templates.simple({
      title,
      description,
      callsToAction: [signInCallToAction()]
    })
  }];
}

export const inviteToRegister = makeSend(inviteToRegisterT);

export async function inviteToRegisterT(email: string, organization: Organization): Promise<Emails> {
  const title = `${organization.legalName} Has Sent You a Team Request`;
  return [{
    to: email,
    subject: title,
    html: templates.simple({
      title,
      body: (
        <div>
          <p>{organization.legalName} has requested that you join their team on the Digital Marketplace.</p>
          <p>In order to join the organization's team you must first <templates.Link text='sign up' url={templates.makeUrl('sign-up')} /> for a Digital Marketplace account. Once you have signed up, you can join their team and be included in proposals to Sprint With Us opportunities.</p>
        </div>
      ),
      callsToAction: [signUpCallToAction()]
    })
  }];
}

export const accountDeactivatedSelf = makeSend(accountDeactivatedSelfT);

export async function accountDeactivatedSelfT(user: User): Promise<Emails> {
  const title = 'Your Account Has Been Deactivated';
  return [{
    summary: 'User account has been deactivated by the user.',
    to: user.email,
    subject: title,
    html: templates.simple({
      title,
      body: (
        <div>
          <p>You have successfully deactivated your Digital Marketplace account.</p>
          <p>You can reactivate your account by signing into the web application again.</p>
        </div>
      ),
      callsToAction: [signInCallToAction('Sign In to Reactivate Account')]
    })
  }];
}

export const accountDeactivatedAdmin = makeSend(accountDeactivatedAdminT);

export async function accountDeactivatedAdminT(user: User): Promise<Emails> {
  const title = 'Your Account Has Been Deactivated';
  return [{
    summary: 'User account has been deactivated by an administrator.',
    to: user.email,
    subject: title,
    html: templates.simple({
      title,
      body: (
        <div>
          <p>Your Digital Marketplace account has been deactivated by an administrator.</p>
          <p>You no longer have access to the web application.</p>
          <p>If you have any questions, you can send an email to the Digital Marketplace administrators at <templates.Link text={CONTACT_EMAIL} url={CONTACT_EMAIL} />.</p>
        </div>
      )
    })
  }];
}

export const accountReactivatedSelf = makeSend(accountReactivatedSelfT);

export async function accountReactivatedSelfT(user: User): Promise<Emails> {
  const title = 'Your Account Has Been Reactivated';
  const description = 'You have successfully reactivated your Digital Marketplace account.';
  return [{
    summary: 'User account has been reactivated by the user.',
    to: user.email,
    subject: title,
    html: templates.simple({
      title,
      description,
      callsToAction: [signInCallToAction()]
    })
  }];
}

export const accountReactivatedAdmin = makeSend(accountReactivatedAdminT);

export async function accountReactivatedAdminT(user: User): Promise<Emails> {
  const title = 'Your Account Has Been Reactivated';
  return [{
    summary: 'User account has been reactivated by an administrator.',
    to: user.email,
    subject: title,
    html: templates.simple({
      title,
      body: (
        <div>
          <p>Your Digital Marketplace account has been reactivated by an administrator.</p>
          <p>If you have any questions, you can send an email to the Digital Marketplace administrators at <templates.Link text={CONTACT_EMAIL} url={CONTACT_EMAIL} />.</p>
        </div>
      ),
      callsToAction: [signInCallToAction()]
    })
  }];
}

export function signUpCallToAction() {
  return {
    text: 'Sign Up',
    url: templates.makeUrl('sign-up')
  };
}

export function signInCallToAction(text = 'Sign In') {
  return {
    text,
    url: templates.makeUrl('sign-in')
  };
}
