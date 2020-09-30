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

### 2020-09-30

- Version Number: 1.3
- Commit Hash: TODO

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
