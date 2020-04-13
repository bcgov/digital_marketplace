import { Emails } from 'back-end/lib/mailer';
import * as templates from 'back-end/lib/mailer/templates';
import { makeSend } from 'back-end/lib/mailer/transport';
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
