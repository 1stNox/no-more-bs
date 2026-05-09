# Releasing

This project uses GitHub Releases as the trigger for automated publishing to npm.

## One-time setup

1. Go to [npm package settings](https://www.npmjs.com/package/no-more-bs) → **Trusted Publishers**
2. Link this GitHub repository and the `cd.yml` workflow

No `NPM_TOKEN` secret is required — authentication uses OIDC.

## Release process

1. Bump the version in `package.json` following [SemVer](https://semver.org/)
2. Commit and push to `main`
3. Create a new [GitHub Release](https://github.com/1stNox/no-more-bs/releases/new) with an annotated tag (e.g. `v0.2.0`)
4. The [CD workflow](../.github/workflows/cd.yml) will automatically:
   - Verify the release tag matches `package.json`
   - Run tests and build
   - Publish to npm with provenance
   - Update the release with the npm package link
