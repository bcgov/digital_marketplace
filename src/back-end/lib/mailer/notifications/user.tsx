import { CONTACT_EMAIL } from 'back-end/config';
import { Emails } from 'back-end/lib/mailer';
import * as templates from 'back-end/lib/mailer/templates';
import { makeSend } from 'back-end/lib/mailer/transport';
import React from 'react';
import { User } from 'shared/lib/resources/user';

export const userAccountRegistered = makeSend(userAccountRegisteredT);

export async function userAccountRegisteredT(recipient: User): Promise<Emails> {
  const title = 'Welcome to the Digital Marketplace';
  const description = 'Welcome to the Digital Marketplace';
  return [{
    to: recipient.email,
    subject: title,
    html: templates.simple({
      title,
      description,
      body: (
        <div>
          <p>Thank you for creating an account for the Digital Marketplace web application.</p>
        </div>
      ),
      callsToAction: [signInCallToAction()]
    })
  }];
}

export const inviteToRegister = makeSend(inviteToRegisterT);

export async function inviteToRegisterT(email: string): Promise<Emails> {
  const title = 'Sign Up with the Digital Marketplace';
  const description = 'Sign Up with the Digital Marketplace';
  return [{
    to: email,
    subject: title,
    html: templates.simple({
      title,
      description,
      body: (
        <div>
          <p>Someone wants to add you to their team on the Digital Marketplace.</p>
          <p>Once you have signed up, you can join their team and be included in proposals to Sprint With Us opportunities</p>
          <p>Click <i>Sign Up</i> below to register.</p>
        </div>
      ),
      callsToAction: [signUpCallToAction()]
    })
  }];
}

export const accountDeactivatedSelf = makeSend(accountDeactivatedSelfT);

export async function accountDeactivatedSelfT(user: User): Promise<Emails> {
  const title = 'Your Account Has Been Deactivated';
  const description = 'Your Account Has Been Deactivated.';
  return [{
    to: user.email,
    subject: title,
    html: templates.simple({
      title,
      description,
      body: (
        <div>
          <p>You have successfully deactivated your Digital Marketplace account. You can reactivate your account by signing into the web application again.</p>
        </div>
      ),
      callsToAction: [signInCallToAction('Sign In to Reactivate Account')]
    })
  }];
}

export const accountDeactivatedAdmin = makeSend(accountDeactivatedAdminT);

export async function accountDeactivatedAdminT(user: User): Promise<Emails> {
  const title = 'Your Account Has Been Deactivated';
  const description = 'Your Account Has Been Deactivated.';
  return [{
    to: user.email,
    subject: title,
    html: templates.simple({
      title,
      description,
      body: (
        <div>
          <p>Your Digital Marketplace account has been deactivated by an administrator. You no longer have access to the web application. If you have any questions, you can send an email to the Digital Marketplace administrators at {CONTACT_EMAIL}.</p>
        </div>
      )
    })
  }];
}

export const accountReactivatedSelf = makeSend(accountReactivatedSelfT);

export async function accountReactivatedSelfT(user: User): Promise<Emails> {
  const title = 'Your Account Has Been Reactivated';
  const description = 'Your Account Has Been Reactivated.';
  return [{
    to: user.email,
    subject: title,
    html: templates.simple({
      title,
      description,
      body: (
        <div>
          <p>You have successfully reactivated your Digital Marketplace account.</p>
        </div>
      ),
      callsToAction: [signInCallToAction()]
    })
  }];
}

export const accountReactivatedAdmin = makeSend(accountReactivatedAdminT);

export async function accountReactivatedAdminT(user: User): Promise<Emails> {
  const title = 'Your Account Has Been Reactivated';
  const description = 'Your Account Has Been Reactivated.';
  return [{
    to: user.email,
    subject: title,
    html: templates.simple({
      title,
      description,
      body: (
        <div>
          <p>Your Digital Marketplace account has been reactivated by an administrator. If you have any questions, you can send an email to the Digital Marketplace administrators at {CONTACT_EMAIL}</p>
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
