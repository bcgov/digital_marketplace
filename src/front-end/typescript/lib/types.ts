// These types should match their configureation in front-end/sass/index.scss.

export type Grays
  = 'gray-100'
  | 'gray-200'
  | 'gray-300'
  | 'gray-400'
  | 'gray-500'
  | 'gray-600'
  | 'gray-700'
  | 'gray-800'
  | 'gray-900';

export type UtilityColor
  // App Views
  = 'c-body-bg'
  | 'c-nav-bg'
  | 'c-nav-bg-alt'
  | 'c-nav-border-bottom'
  | 'c-nav-fg'
  | 'c-nav-fg-alt'
  | 'c-footer-bg'
  | 'c-footer-separator'
  | 'c-footer-border-top'
  | 'c-toast-info-icon'
  | 'c-toast-error-icon'
  | 'c-toast-warning-icon'
  | 'c-toast-success-icon'
  | 'c-sidebar-instructional-bg'
  | 'c-sidebar-menu-link-inactive-fg'
  | 'c-sidebar-menu-link-inactive-icon'
  | 'c-sidebar-menu-link-active-fg'
  | 'c-sidebar-menu-link-active-icon'
  | 'c-sidebar-menu-link-active-bg'
  | 'c-sidebar-menu-mobile-caret'
  // Pages
  | 'c-landing-role-heading'
  | 'c-landing-role-icon'
  | 'c-landing-testimonial-source'
  | 'c-landing-small-underline'
  | 'c-landing-programs-bg'
  | 'c-learn-more-bg'
  | 'c-dashboard-bg'
  | 'c-opportunity-list-learn-more-bg'
  | 'c-opportunity-list-card-hover-bg'
  | 'c-opportunity-create-bg'
  | 'c-opportunity-view-got-questions-icon'
  | 'c-opportunity-view-got-questions-bg'
  | 'c-opportunity-view-apply-bg'
  | 'c-proposal-swu-form-team-question-response-heading'
  | 'c-proposal-swu-form-scrum-master'
  | 'c-user-profile-permission'
  // Misc. Views
  | 'c-report-card-bg'
  | 'c-report-card-icon-default'
  | 'c-report-card-icon-highlight'
  | 'c-capability-ft-bg'
  | 'c-capability-pt-bg'
  | 'c-capability-grid-switch'
  | 'c-how-it-works-item-bg'
  | 'c-skills-bg'
  | 'c-multi-select-item-bg'
  | 'c-multi-select-item-remove'
  | 'c-form-field-required'
  | 'c-table-icon-check'
  | 'c-table-icon-times';

export type ThemeColor
  = 'white'
  | 'black'
  | 'primary'
  | 'secondary'
  | 'info'
  | 'warning'
  | 'danger'
  | 'success'
  | 'body'
  | 'light'
  | 'dark'
  | 'bcgov-blue'
  | 'bcgov-yellow'
  | UtilityColor
  | Grays;

export type TextColor = ThemeColor;

export type ButtonColor = ThemeColor;

export type AvatarFiletype
  = { file: File; path: string; errors: string[]; }
  | null;
