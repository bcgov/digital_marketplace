# Branching Model Team Agreement

This document lists the agreed upon practices the team will be using. As they are discussed and changed, update this file accordingly.

## Guardrails
- The default branch for this repo is `main`
- all commits must be made to a non-protected branch and submitted via a pull request before they can be merged into `main`. (There can be no direct commits made to `main`.)
- Pull requests require at least 1 approval before the can be merged to `main`. Any commits made to an approved branch will dismiss the approval. (If you commit new code to a branch after it gets approved but before you merge it, you have to get it approved again.)
- Pull requests must pass CI checks in order to be merged to `main`
- Branches are automatically deleted when merged
- Squash merge has been disabled

## Practices
- Make draft pull requests early and often to facilitate a transparent process
- Reviews can be done by the first person who gets to it. If the code needs explaining, request the author to walk you through it
- Follow peer review best practices by suggesting opportunities to improve code during peer review, merging as soon as the code is better than the code in the target branch and release ready
- Treat any opportunity for improvement feedback identified during peer review but not implemented in the PR where it was raised as technical debt worthy of a new issue referencing the PR where the comments first came up
- Branch naming policy is as follows: issue#-brief-description
