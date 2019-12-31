import dotenv from 'dotenv';
import { join, resolve } from 'path';

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

export const SCHEDULED_DOWNTIME = get('SCHEDULED_DOWNTIME', '') === '1';

export const BASIC_AUTH_USERNAME = get('BASIC_AUTH_USERNAME', '');

export const BASIC_AUTH_PASSWORD_HASH = get('BASIC_AUTH_PASSWORD_HASH', '');

export const ORIGIN = get('ORIGIN', 'http://digital-marketplace.bcgov.realfolk.io').replace(/\/*$/, '');

export const POSTGRES_URL = getPostGresUrl();

export const DB_MIGRATIONS_TABLE_NAME = 'migrations';

export const COOKIE_SECRET = get('COOKIE_SECRET', '');

export const FRONT_END_BUILD_DIR = resolve(REPOSITORY_ROOT_DIR, 'build/front-end');

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

// Keycloak configuration
export const KEYCLOAK_URL = get('KEYCLOAK_URL', 'https://sso-dev.pathfinder.gov.bc.ca');

export const KEYCLOAK_REALM = get('KEYCLOAK_REALM', 'p2zhow64');

export const KEYCLOAK_CLIENT_ID = get('KEYCLOAK_CLIENT_ID', 'dm-auth-web');

export const KEYCLOAK_CLIENT_SECRET = get('KEYCLOAK_CLIENT_SECRET', '');

// Temp storage for file uploads
const fileStorageDir = get('FILE_STORAGE_DIR', '.');
export const FILE_STORAGE_DIR = fileStorageDir && resolve(REPOSITORY_ROOT_DIR, fileStorageDir);
export const TMP_DIR = join(FILE_STORAGE_DIR, '__tmp');

function isPositiveInteger(n: number): boolean {
  return !isNaN(n) && !!n && n >= 0 && Math.abs(n % 1) === 0;
}

export function getPostGresUrl(): string | null {
  // *SERVICE* variables are set automatically by OpenShift.
  const databaseServiceName = (process.env.DATABASE_SERVICE_NAME || 'postgresql').toUpperCase().replace(/-/g, '_');
  const host = get(`${databaseServiceName}_SERVICE_HOST`, '');
  const port = get(`${databaseServiceName}_SERVICE_PORT`, '');
  const user = get('DATABASE_USERNAME', '');
  const password = get('DATABASE_PASSWORD', '');
  const databaseName = get('DATABASE_NAME', '');
  // Support OpenShift's environment variables.
  if (host && port && user && password && databaseName) {
    return `postgresql://${user}:${password}@${host}:${port}/${databaseName}`;
  } else {
    // Return standard POSTGRES_URL as fallback.
    return get('POSTGRES_URL', '') || null;
  }
}

export function getConfigErrors(): string[] {
  let errors: string[] = [];

  if (ENV !== 'development' && ENV !== 'production') {
    errors.push('NODE_ENV must be either "development" or "production"');
  }

  if (!SERVER_HOST.match(/^\d+\.\d+\.\d+\.\d+/)) {
    errors.push('SERVER_HOST must be a valid IP address.');
  }

  if (BASIC_AUTH_USERNAME && !BASIC_AUTH_PASSWORD_HASH) {
    errors.push('BASIC_AUTH_PASSWORD_HASH must be defined if BASIC_AUTH_USERNAME is non-empty.');
  }

  if (!BASIC_AUTH_USERNAME && BASIC_AUTH_PASSWORD_HASH) {
    errors.push('BASIC_AUTH_USERNAME must be defined if BASIC_AUTH_PASSWORD_HASH is non-empty.');
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

  return errors;
}
