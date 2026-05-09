# Local testing

Verify the CLI before publishing. Options ranked from quickest to most production-faithful.

## Run from source

```sh
bun run src/index.ts init
```

Skips the build step. Fastest iteration, but won't catch bundling issues.

## Run the built artifact

```sh
bun run build
node dist/index.js init
```

Exercises the bundled output but bypasses `bin` resolution.

## `bun link` (live symlink)

```sh
bun run build
bun link                          # from repo root
cd /tmp && mkdir nmb-test && cd nmb-test
bun link no-more-bs
no-more-bs init
```

Re-runs pick up rebuilds without re-linking. Unlink with `bun unlink no-more-bs` in the test dir and `bun unlink` in the repo.

## Tarball install (closest to a real publish)

```sh
bun run build
TARBALL=$(npm pack --silent)      # prints the generated .tgz filename
mkdir -p /tmp/nmb-test
mv "$TARBALL" /tmp/nmb-test/
cd /tmp/nmb-test
npm install -g "./$TARBALL"
no-more-bs init
```

This is the only path that runs `prepack`, honours the `files` allowlist, and resolves `bin` exactly as an end user would. Use `npm publish --dry-run` from the repo to preview the tarball contents without uploading.

Uninstall when done: `npm uninstall -g no-more-bs`.
