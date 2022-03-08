# Branching Model Team Agreement

This document lists the agreed upon practices the team will be using. As they are discussed and changed, update this file accordingly.

## Guardrails
The following guardrails are in place to ensure we keep a clean working tree, while avoiding merging breaking changes into our master branch.
- The default branch for this repo is `development`.
- All commits must be made to a non-protected branch and submitted via a pull request before they can be merged into `development`. (There can be no direct commits made to `development`.)
- Pull requests require at least 1 approval before they can be merged to `development`. Any commits made to an approved branch will dismiss the approval. (If you commit new code to a branch after it gets approved but before you merge it, you have to get it approved again.)
- Pull requests must pass CI checks in order to be merged to `development`.

## Practices
- Branch naming policy is as follows: [issue#]-brief-description. In the event that an issue does not already exist for the changes being made in a branch, one should be made.
- Make draft pull requests early and often to facilitate a transparent process.
- When a PR is ready, post a request for review with a link to the branch in the Digital Marketplace channel in Teams.
- Reviews can be done by the first person who gets to it. If the code needs explaining, request the author to walk you through it.
- Follow code review best practices by suggesting opportunities to improve code during code review, merging as soon as the code is better than the code in the target branch and release ready.
- Treat any opportunity for improvement feedback identified during code review but not implemented in the PR where it was raised as technical debt worthy of a new issue referencing the PR where the comments first came up.
- When necessary, use git rebase to sync a feature branch with main. This keeps a tidier history in git, however can be destructive, so do so cautiously.
