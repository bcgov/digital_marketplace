import {
  DISABLE_NOTIFICATIONS,
  MAILER_CONFIG,
  MAILER_FROM
} from "back-end/config";
import { makeDomainLogger } from "back-end/lib/logger";
import { console as consoleAdapter } from "back-end/lib/logger/adapters";
import { Emails } from "back-end/lib/mailer";
import { convert } from "html-to-text";
import nodemailer from "nodemailer";
import { VITE_SHOW_TEST_INDICATOR } from "shared/config";

const logger = makeDomainLogger(consoleAdapter, "mailer");

const transport = nodemailer.createTransport(MAILER_CONFIG);

export interface SendParams {
  to: string | string[];
  bcc?: string | string[];
  subject: string;
  html: string;
}

export function send(params: SendParams): Promise<void> {
  return new Promise((resolve, _reject) => {
    transport.sendMail(
      {
        ...params,
        from: MAILER_FROM,
        text: convert(params.html, { wordwrap: 130 }),
        subject: `${VITE_SHOW_TEST_INDICATOR ? "[TEST] " : ""}${params.subject}`
      },
      (error) => {
        if (error) {
          // Do not reject promise, only log the error.
          logger.error("Unable to send email", {
            errorMessage: error.message,
            errorStack: error.stack,
            to: params.to,
            bcc: params.bcc,
            subject: params.subject
          });
        }
        resolve();
      }
    );
  });
}

export function makeSend<Args extends unknown[]>(
  makeEmails: (...args: Args) => Promise<Emails>
): (...args: Args) => Promise<void> {
  return async (...args) => {
    if (DISABLE_NOTIFICATIONS) return;
    try {
      const emails = await makeEmails(...args);
      for (const email of emails) {
        await send(email);
      }
    } catch (e) {
      const err = e as Error;
      logger.error("Unable to create email content", {
        errorMessage: err.message,
        errorStack: err.stack,
        args
      });
    }
  };
}
