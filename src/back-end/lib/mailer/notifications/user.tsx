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

export function signUpCallToAction() {
  return {
    text: 'Sign Up',
    url: templates.makeUrl('sign-up')
  };
}
