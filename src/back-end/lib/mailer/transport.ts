import { ENV, MAILER_CONFIG, MAILER_FROM } from 'back-end/config';
import { makeDomainLogger } from 'back-end/lib/logger';
import { console as consoleAdapter } from 'back-end/lib/logger/adapters';
import { Emails } from 'back-end/lib/mailer';
import { fromString } from 'html-to-text';
import nodemailer from 'nodemailer';
import { SHOW_TEST_INDICATOR } from 'shared/config';

const logger = makeDomainLogger(consoleAdapter, 'mailer', ENV);

const transport = nodemailer.createTransport(MAILER_CONFIG);

export interface SendParams {
  to: string | string[];
  bcc?: string | string[];
  subject: string;
  html: string;
}

export function send(params: SendParams): Promise<void> {
  return new Promise((resolve, reject) => {
    transport.sendMail({
      ...params,
      from: MAILER_FROM,
      text: fromString(params.html, { wordwrap: 130 })
    }, error => {
      if (error) {
        // Do not reject promise, only log the error.
        logger.error('Unable to send email', {
          errorMessage: error.message,
          errorStack: error.stack,
          to: params.to,
          bcc: params.bcc,
          subject: `${SHOW_TEST_INDICATOR ? '[TEST] ' : ''}${params.subject}`
        });
      }
      resolve();
    });
  });
}

export function makeSend<Args extends unknown[]>(makeEmails: (...args: Args) => Promise<Emails>): (...args: Args) => Promise<void> {
  return async (...args) => {
    try {
      const emails = await makeEmails(...args);
      for (const email of emails) {
        await send(email);
      }
    } catch (e) {
        logger.error('Unable to create email content', {
          errorMessage: e.message,
          errorStack: e.error,
          args
        });
    }
  };
}
