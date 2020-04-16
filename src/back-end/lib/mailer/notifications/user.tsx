import { CONTACT_EMAIL } from 'back-end/config';
import { Emails } from 'back-end/lib/mailer';
import * as templates from 'back-end/lib/mailer/templates';
import { makeSend } from 'back-end/lib/mailer/transport';
import React from 'react';
import { User } from 'shared/lib/resources/user';

export const userAccountRegistered = makeSend(userAccountRegisteredT);

export async function userAccountRegisteredT(recipient: User): Promise<Emails> {
  const title = 'Your Account is Registered';
  const description = 'You have successfully registered your account on the Digital Marketplace.';
  return [{
    to: recipient.email,
    subject: title,
    html: templates.simple({
      title,
      description
    })
  }];
}

export const inviteToRegister = makeSend(inviteToRegisterT);

export async function inviteToRegisterT(email: string): Promise<Emails> {
  const title = 'Register with the Digital Marketplace';
  const description = 'Someone wants to add you to their team on the Digital Marketplace';
  return [{
    to: email,
    subject: title,
    html: templates.simple({
      title,
      description,
      body: (
        <div>
          <p>Once you have signed up on the Digital Marketplace, you can join a team and be included in proposals to Sprint With Us opportunities</p>
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
  const description = 'You have successfully deactivated your account on the Digital Marketplace.';
  return [{
    to: user.email,
    subject: title,
    html: templates.simple({
      title,
      description,
      body: (
        <div>
          <p>You can reactivate your account at any time by <templates.Link text='signing in' url={templates.makeUrl('sign-in')} /> to the Digital Marketplace.</p>
        </div>
      )
    })
  }];
}

export const accountDeactivatedAdmin = makeSend(accountDeactivatedAdminT);

export async function accountDeactivatedAdminT(user: User): Promise<Emails> {
  const title = 'Your Account Has Been Deactivated';
  const description = 'Your account on the Digital Marketplace has been deactivated by an administrator.';
  return [{
    to: user.email,
    subject: title,
    html: templates.simple({
      title,
      description,
      body: (
        <div>
          <p>You will not be able to participate in Code With Us or Sprint With Us opportunities until your account is reactivated.</p>
          <p>If you feel this was done in error or have any questions, please send an email to {CONTACT_EMAIL}.</p>
        </div>
      )
    })
  }];
}

export const accountReactivated = makeSend(accountReactivatedT);

export async function accountReactivatedT(user: User): Promise<Emails> {
  const title = 'Your Account Has Been Reactivated';
  const description = 'Your account on the Digital Marketplace has been reactivated.';
  return [{
    to: user.email,
    subject: title,
    html: templates.simple({
      title,
      description,
      body: (
        <div>
          <p>You can participate in Code With Us and Sprint With Us opportunities again.</p>
        </div>
      )
    })
  }];
}

export function signUpCallToAction() {
  return {
    text: 'Sign Up',
    url: templates.makeUrl('sign-up')
  };
}
