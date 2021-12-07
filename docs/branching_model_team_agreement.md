# Branching Model Team Agreement

This document lists the agreed upon practices the team will be using. As they are discussed and changed, update this file accordingly.

## Guardrails
The following guardrails are in place to ensure we keep a clean working tree, while avoiding merging breaking changes into our main branch.
- The default branch for this repo is `main`.
- All commits must be made to a non-protected branch and submitted via a pull request before they can be merged into `main`. (There can be no direct commits made to `main`.)
- Pull requests require at least 1 approval before they can be merged to `main`. Any commits made to an approved branch will dismiss the approval. (If you commit new code to a branch after it gets approved but before you merge it, you have to get it approved again.)
- Pull requests must pass CI checks in order to be merged to `main`.
- Branches are automatically deleted on Github when a PR is merged. Each teammate should set `git config fetch.prune true` to mirror this behaviour to their local workstation.
- Squash merge has been disabled to increase efficiency of `git bisect`.

## Practices
- Branch naming policy is as follows: [issue#]-brief-description. In the event that an issue does not already exist for the changes being made in a branch, one should be made.
- Make draft pull requests early and often to facilitate a transparent process.
- When a PR is ready, post a request for review with a link to the branch in the `button-inc/digital_marketplace` team in Teams.
- Reviews can be done by the first person who gets to it. If the code needs explaining, request the author to walk you through it.
- Follow peer review best practices by suggesting opportunities to improve code during peer review, merging as soon as the code is better than the code in the target branch and release ready.
- Treat any opportunity for improvement feedback identified during peer review but not implemented in the PR where it was raised as technical debt worthy of a new issue referencing the PR where the comments first came up.
