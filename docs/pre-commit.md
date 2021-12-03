# Using pre-commit locally

### Install and setup pre-commit
- Install:
  - Using pip: `pip install pre-commit`
  - Using Homebrew: `brew install pre-commit`
  - see docs [Click](https://pre-commit.com/#install)

- Setup
  - run `pre-commit install` to set up the git hook script
  - see docs [Click](https://pre-commit.com/#install)

### Things to keep in mind regarding the git authoring lifecycle (HEAD, Staged, Unstaged) and pre-commit hooks

Running hooks on unstaged changes can lead to both false-positives and false-negatives during committing, so to avoid this, pre-commit only runs on the staged contents of files by temporarily saving the contents of your files at commit time and stashing the unstaged changes while running hooks.

> pre-commit itself will never touch the staging area. These are good ways to silently break commits. In my mind this is one of the worst things that lint-staged does and suggests -- hooks are very frequently not perfect and magically changing what's being committed should not be taken lightly. [Link](https://github.com/pre-commit/pre-commit/issues/747#issuecomment-386782080)

Always stage the the changes you intend to commit before committing and with the `pre-commit` hook set up or running `pre-commit` explicitly. If a hook changes our code and fails you will need to manually stage the changes made by `pre-commit`, viewing them one by one with `git add -p` or your preferred git GUI.

### Running the pre-commit hook directly from the .git folder

- run `bash .git/hooks/pre-commit` to execute pre-commit hook on staged files without committing

### Running the pre-commit on all files

- to run `pre-commit` on all files **regardless of staging** run `pre-commit --all-files`

### How to respond to failed pre-commit hooks

- If when running `pre-commit` you change files that weren't intended to be changed, run `git add -p` to go through individual portions of changed code that you can either stage or remove.
- Once finished staging changes you can run `git checkout -- .` which will revert all unstaged changes in the branch (nuclear option)

### Write commit a message so it doesn't get blown away by a failed pre-commit hook

- run `git commit` without a comment and that will then run `pre-commit` and should it fail you won't lose your commit message. Once it passes it will prompt you to input a commit message.
- **Recomend** on the first commit of a branch, make a commit message body that refs the issue your branch is related to. When opening a pull-request this will automatically link your PR to the issue on GitHub. This can be accomplished by creating the commit message in an editor and adding new line at the end of the message and writing `ref #<issue>`

[Click](https://pre-commit.com/#install) here for more information on `pre-commit`
