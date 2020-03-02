import * as templates from 'back-end/lib/mailer/templates';
import { send } from 'back-end/lib/mailer/transport';
import { User } from 'shared/lib/resources/user';

export async function userAccountRegistered(recipient: User): Promise<void> {
  const title = 'Digital Marketplace - Your account has been registered!';
  await send({
    to: recipient.email,
    subject: title,
    html: templates.simple({
      title,
      description: `Hi ${recipient.name}, thank you for registering on the Digital Marketplace`
    })
  });
}
