import { SendParams } from 'back-end/lib/mailer/transport';

export interface Email extends SendParams {
  summary?: string;
}

export type Emails = Email[];
