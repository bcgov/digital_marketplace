import { prefixPath } from 'front-end/lib';

export { EMPTY_STRING } from 'shared/config';

// Set this environment variable if behind reverse proxies at a particular path.
// e.g. www.example.com/marketplace/*
export const PATH_PREFIX = process.env.PATH_PREFIX || '';

// ENV config
export const NODE_ENV = process.env.NODE_ENV || 'production';

// HARDCODED CONFIG
export const SOURCE_CODE_URL = 'https://github.com/bcgov/digital_marketplace/';

export const DEFAULT_LOCATION = 'Victoria';

export const FORM_FIELD_DEBOUNCE_DURATION = 500;

export const SEARCH_DEBOUNCE_DURATION = 200;

export const PROCUREMENT_CONCIERGE_URL = 'https://procurementconcierge.gov.bc.ca';

export const DEFAULT_USER_AVATAR_IMAGE_PATH = prefixPath('/images/default_user_avatar.svg');

export const DEFAULT_ORGANIZATION_LOGO_IMAGE_PATH = prefixPath('/images/default_organization_logo.svg');

export const TRANSITION_DURATION = 240; //ms

export const DROPDOWN_CARET_SIZE = 0.8; //rem

export const TOAST_AUTO_DISMISS_DURATION = 20000; //ms

export const APP_TERMS_CONTENT_ID = 'terms-and-conditions';

export const SWU_PROPOSAL_EVALUATION_CONTENT_ID = 'sprint-with-us-proposal-evaluation';

export const SWU_OPPORTUNITY_SCOPE_CONTENT_ID = 'sprint-with-us-opportunity-scope';

export const SWU_QUALIFICATION_TERMS_ID = 'sprint-with-us-terms-and-conditions';

export const TRUNCATE_OPPORTUNITY_TITLE_LENGTH = 80;

export const MANDATORY_WEIGHTED_CRITERIA_URL = 'https://www2.gov.bc.ca/gov/content/governments/services-for-government/bc-bid-resources/how-to-buy-services/procurement-process/pre-award/prepare-solicitation-documents/mandatory-and-weighted-criteria';

export const CWU_PAYMENT_OPTIONS_URL = 'https://github.com/BCDevExchange/code-with-us/wiki/4.-Payment';
