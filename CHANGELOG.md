# Changelog

## Documentation

This document summarizes the various changes made to the Digital Marketplace web application. Generally, only core maintainers of this project should be adding entries to this Changelog.

### Versioning

The project is versioned using the following format:

```
MAJOR_VERSION.MINOR_VERSION
```

`MAJOR_VERSION` is a natural number indicating major releases with new functionality and, optionally, modifications to existing functionality.

`MINOR_VERSION` is a natural number indicating a release that **only** includes trivial modifications to existing functionality (e.g. bugfixes, performance improvements, etc). Signficant changes to existing functionality and new features must be released under a new `MAJOR_VERSION` number.

### Log Format

Each log must follow the formatting guidelines described here. You can use the template provided below for logging changes to this document.

Note that each log must include a version number that has either an incremented major or minor version. New log items must be added to the beginning of the list below.

#### Log Template

```
### YYYY-MM-DD

- Version Number: [Version Number]
- Commit Hash: [Git Commit Hash]

#### Changes

- Description of changes listed as one bullet point per change.
```

## Versions

### 2020.12.17

- Version Number: 1.4
- Commit Hash: 7fda114523b3c449fce94ae984cc820dad22308f

#### Changes

- Implement content management functionality for all static pages. Static pages are now stored in the database, and are scaffolded using database migrations. Admin users can create and manage these pages via the user interface's content management area. This can be navigated to by clicking on "Content" in the navigation menu.
  - **This change includes a databse migration that adds tables to the database schema.** The migrations will scaffold the necessary "fixed" pages for the web app to function correctly (e.g. Terms & Conditions). However, these pages will only be created with stub data. You will need to update each of them with the correct content accordingly.
- Admin users can now notify Vendors when the web app's general terms and conditions have been updated. This triggers a notification email to all Vendors. In addition, all Vendors will be prompted to re-accept the updated terms, and must now accept the latest app terms before submitting a proposal in addition to the relevant opportunity-specific terms.
  - Admins can notify Vendors by clicking the "Notify Vendors" action on the Terms & Conditions content management page.
  - The "legal" section of Vendor profiles have been updated to reflect these changes, in addition to a minor redesign.
  - **This change includes a database migration that modifies the `users` table.**
- The organization list page is now paginated for a better user experience.
- The UX of the opportunity listing page has been improved. Opportunity sections can now be collapsed for easier perusal of the page.
- The landing page hero has been redesigned for better overall presentation.
- The `SHOW_TEST_INDICATOR` environment variable has been introduced to configure whether an environment's UI and email notifications should indicate that a specific environment is to be used for testing.
- Include successful proponent email address on awarded opportunities' "Summary" pages.
- Support theming colors in static HTML pages (`downtime.ejs`, `unsupported-browser.ejs`).
- Improve how the front-end uses the browser's History API to manage Y scroll positions when transitioning between routes.
- Improvements to API documentation.
- Improvements to Postman back-end tests.
- Various minor UI and copy improvements.
  - Improved check/times icon styles in table views.
  - Update copy to reflect that the SWU minimum posting time is 10 business days.
  - Establish theme colors for static HTML pages (e.g. unsupported browser page, scheduled downtime page).
- Various bugfixes.
  - The "Addenda" link in the opportunity management sidebar now appears without a page reload after publishing a draft or suspended opportunity.
  - "Successful Proponent" information is now correctly displayed on awarded opportunities' "Summary" pages.
  - Allow new users with NULL emails (e.g. if not shared from GitHub).

### 2020-09-30

- Version Number: 1.3
- Commit Hash: 68c01690401840e0ba169f6edb31d7da2071c740

#### Changes

- Rename the configuration variable `MAILER_NOREPLY` to `MAILER_REPLY` for better semantics.
- Allow `MAILER_REPLY` to be set via the environment.

### 2020-09-29

- Version Number: 1.2
- Commit Hash: 2d8edad5bc80e9414bc8d0da22bf54f10dfe65ff

#### Changes

- Abstract the following configuration variables to `shared/config.ts`.
  - GOV_IDP_NAME
  - VENDOR_IDP_NAME
- Abstract the default opportunity location as a configuration variable to `front-end/typescript/config.ts`.
- Fix broken opportunity link when editing a CWU proposal.
- Update placement of SWU export proposal links.
- Fix retrieval of admin users when signing in.
- Fix bug in phase validation.
- Add organization resource API documentation.

### 2020-09-25

- Version Number: 1.1
- Commit Hash: ebf1d2d97c1a847714f39c6f6327fa9834933457

#### Changes

- Fix an incorrect check at startup for optional configuration variables.

### 2020-09-25

- Version Number: 1.0
- Commit Hash: 8d22333274b3b7baa1c66f10ca02afa5e8f92787

#### Changes

- Set up the Changelog. Any changes prior to this version were not recorded because a Changelog did not exist at that time.
