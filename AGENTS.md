# Sound Creator

## Project rules

- Use Node.js 22.12+ and pnpm. Keep the registry in `.npmrc` set to `registry.npmjs.org`.
- Keep the sound settings schema and playback behavior in `src/sound.ts`. Validate every IndexedDB record with Zod through `parseSavedSounds` before using it. When changing the sound format, update `docs/SOUND_FORMAT.md`, its JSON example, and `test/sound.test.mjs` together.
- Keep source files within the configured size and function limits. Run `pnpm format:check`, `pnpm test`, `pnpm lint`, `pnpm typecheck`, and `pnpm build` before publishing. Pre-commit hooks run lint-staged on changed files.

## GitHub Pages

`main` contains source. `publish` contains only the built site at its root. `public/CNAME` sets `sound-creator.corke.dev`; `public/.nojekyll` disables Jekyll processing.

For each release:

1. Update `main` with `git switch main` and `git pull --ff-only origin main`. Stop if `git status --porcelain` is not empty.
2. Record `main_commit=$(git rev-parse HEAD)` and `main_short=$(git rev-parse --short HEAD)`.
3. Run `pnpm install --frozen-lockfile`, `pnpm format:check`, `pnpm test`, `pnpm lint`, `pnpm typecheck`, and `pnpm build`.
4. Confirm `main` still points to `main_commit` and the worktree is clean.
5. Use a temporary worktree for `publish`. For the first release, create an orphan branch. For later releases, start from `origin/publish`. Replace its contents with `dist/`; keep `CNAME` and `.nojekyll` at the branch root.
6. Commit with subject `Publish main@<short-sha>` and body `Source-main-commit: <full-sha>`. Push to `origin/publish`.
7. Configure GitHub Pages to deploy from `publish` at `/`. Set the custom domain to `sound-creator.corke.dev`, then verify the site serves the new build over HTTPS.
8. Remove the temporary worktree after the push succeeds. If push fails, keep it while investigating.

Run release steps in one shell so recorded commit values stay fixed. Use `git clean -fdx` only in the dedicated temporary publish worktree. Never publish staged, unstaged, or untracked source changes.
