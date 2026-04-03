# Release Workflow

## This Repo's Role in the Release

ember-2-ui is the frontend. It versions independently but must be pinned by ember-2-installer at release time. The installer workflow clones this repo at a specific tag, runs npm ci && npm run build, and copies the dist output into the installer package.

The built frontend is never rebuilt on the user's machine. It must be bundled correctly at installer build time.

## What to Do Before Cutting a Release

1. Ensure all Playwright tests pass: npm run test:e2e
2. Bump version in package.json
3. Update CHANGELOG.md
4. Commit, tag, and push: git tag vX.X.X && git push origin vX.X.X
5. Publish a GitHub Release at that tag -- not a draft
6. Note which ember-2 (backend) version this frontend is compatible with -- document in release notes

## Planned: Automated Coordination (v0.14.0)

The installer repo will adopt Release Please and GitHub Actions. The automated workflow will clone this repo at its pinned tag and build the frontend as part of the installer build. Until then, the installer must manually pin and build from the correct tag.
