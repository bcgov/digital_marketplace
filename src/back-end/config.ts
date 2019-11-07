import dotenv from 'dotenv';
import { resolve } from 'path';

// export the root directory of the repository.
export const REPOSITORY_ROOT_DIR = resolve(__dirname, '../../');

// Load environment variables from a .env file.
dotenv.config({
  debug: process.env.NODE_ENV === 'development',
  path: resolve(REPOSITORY_ROOT_DIR, '.env')
});

function get(name: string , fallback: string): string {
  return process.env[name] || fallback;
}

export const ENV = get('NODE_ENV', 'production');

export const SERVER_HOST = get('SERVER_HOST', '127.0.0.1');

export const SERVER_PORT = parseInt(get('SERVER_PORT', '3000'), 10);

export const ORIGIN = get('ORIGIN', 'http://digital-marketplace.bcgov.realfolk.io').replace(/\/*$/, '');

export const POSTGRES_URL = get('POSTGRES_URL', '') || null;

export const DB_MIGRATIONS_TABLE_NAME = 'migrations';

export const COOKIE_SECRET = get('COOKIE_SECRET', '');

export const FRONT_END_BUILD_DIR = resolve(REPOSITORY_ROOT_DIR, 'build/front-end');

export const GOOGLE_OAUTH_CLIENT_ID = get('GOOGLE_OAUTH_CLIENT_ID', '');

export const GOOGLE_OAUTH_CLIENT_SECRET = get('GOOGLE_OAUTH_CLIENT_SECRET', '');

export const GOOGLE_OPENID_CONNECT_REDIRECT_URI = `${ORIGIN}/auth/callback`;

export const LIBRARIAN_USER_EMAIL = get('LIBRARIAN_USER_EMAIL', '');

export const LIBRARIAN_USER_PASSWORD_HASH = get('LIBRARIAN_USER_PASSWORD_HASH', '');

export const MAILER_CONFIG = {
  service: 'gmail',
  auth: {
    user: get('MAILER_GMAIL_USER', ''),
    pass: get('MAILER_GMAIL_PASS', '')
  },
  tls: {
    rejectUnauthorized: false
  }
};

export const MAILER_NOREPLY = 'noreply@digitalmarketplace.gov.bc.ca';

export const MAILER_FROM = get('MAILER_FROM', `Digital Marketplace<${MAILER_NOREPLY}>`);

export const MAILER_ROOT_URL = get('MAILER_ROOT_URL', ORIGIN).replace(/\/*$/, '');

function isPositiveInteger(n: number): boolean {
  return !isNaN(n) && !!n && n >= 0 && Math.abs(n % 1) === 0;
}

export function getConfigErrors(): string[] {
  let errors: string[] = [];

  if (ENV !== 'development' && ENV !== 'production') {
    errors.push('NODE_ENV must be either "development" or "production"');
  }

  if (!SERVER_HOST.match(/^\d+\.\d+\.\d+\.\d+/)) {
    errors.push('SERVER_HOST must be a valid IP address.');
  }

  if (!ORIGIN) {
    errors.push('ORIGIN must be specified.');
  }

  if (!isPositiveInteger(SERVER_PORT)) {
    errors.push('SERVER_PORT must be a positive integer.');
  }

  if (!POSTGRES_URL) {
    errors = errors.concat([
      'POSTGRES_URL must be specified.'
    ]);
  }

  if (!COOKIE_SECRET) {
    errors.push('COOKIE_SECRET must be specified.');
  }

  if (!GOOGLE_OAUTH_CLIENT_ID || !GOOGLE_OAUTH_CLIENT_SECRET) {
    errors.push('GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET must be specified');
  }

  if (!LIBRARIAN_USER_EMAIL || !LIBRARIAN_USER_PASSWORD_HASH) {
    errors.push('LIBRARIAN_USER_EMAIL and LIBRARIAN_USER_PASSWORD_HASH must be specified.');
  }

  if (!MAILER_CONFIG.auth.user || !MAILER_CONFIG.auth.pass) {
    errors.push('MAILER_GMAIL_USER and MAILER_GMAIL_PASS must be specified.');
  }

  return errors;
}
