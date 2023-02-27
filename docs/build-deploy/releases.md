## Automatic Releases

On push to master branch, a GitHub Action will trigger the creation of release artifacts, release notes as a list of commits, tag and publish a release. By default and with no GitHub labels associated with a Pull Request to master branch, a patch version will be created. To override this behaviour, add either the `release:major` label or `release:minor` label to the PR.

## Reference
[README.md](https://github.com/rymndhng/release-on-push-action)
