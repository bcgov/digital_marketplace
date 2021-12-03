# Using pre-commit locally

### 3 versions of every file that make up our git authoring lifecycle (HEAD, Staged, Unstaged)

### Running the pre-commit hook directly from the .git folder
- run `bash .git/hooks/pre-commit` to execute pre-commit hook without committing

### How to respond to failed pre-commit hooks
- If when running pre-commit hooks you change files that weren't intended to be changed, run `git add -p` to go through individual portions of changed code that you can either stage or remove.
- Once finished staging changes you can run `git checkout -- .` which will revert all unstaged changes in the branch (nuclear option)

### Write commit a message so it doesn't get blown away by a failed pre-commit hook
- run `git commit` without a comment when that will then run pre-commit and should it fail you won't lose your commit message. Once it passes it will prompt you to input a commit message.
- Recomend on the first commit of a branch to make a commit message body that refs the issue your branch is related. When opening a pull-request this will automatically link your PR to the issue on GitHub. This can be accomplished by creating the commit message in an editor and adding new line at the end of the message and writing `ref #<issue>`
