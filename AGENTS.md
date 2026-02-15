# Repository Guidelines

## Project Structure & Module Organization
This repository is a `pnpm` monorepo.
- `packages/lib/core`: core bot runtime, config loading, Telegram handlers, and routing.
- `packages/lib/plugins`: plugin/template utilities.
- `packages/lib/next`: AI SDK provider integrations.
- `packages/apps/*`: deploy targets (`workers`, `workers-mk2`, `workers-next`, `vercel`, `local`, `interpolate`).
- `plugins/*.json`: plugin definition files.
- `scripts/`: build/release helpers (for example, version stamping and Vercel env sync).
- `doc/en` and `doc/cn`: user-facing docs.
- `dist/`: generated distribution artifacts; do not edit manually.

## Build, Test, and Development Commands
- `pnpm install --frozen-lockfile`: install dependencies exactly as CI (Node 20).
- `pnpm run lint`: run ESLint with autofix across root, `packages`, `plugins`, and `scripts`.
- `pnpm run test`: run all workspace tests.
- `pnpm run build`: build all packages/apps.
- `pnpm run start:local`: build and run local mode using `config.json` and `wrangler.toml`.
- `pnpm run build:workers` (or `build:vercel`, `build:workersnext`): build a specific deploy target.
- `pnpm --filter @chatgpt-telegram-workers/core test`: run tests for one package.

## Coding Style & Naming Conventions
- Language: TypeScript (ESM, strict mode).
- Lint/style source of truth: `eslint.config.js`.
- Enforced style: 4-space indentation, single quotes, semicolons, `1tbs` brace style.
- Prefer descriptive lowercase file names; tests use `*.test.ts`.
- Keep workspace package names as `@chatgpt-telegram-workers/<module>`.
- In `packages/lib/core`, use the `#/*` path alias for internal imports when appropriate.

## Testing Guidelines
- Test framework: Jest with `ts-jest` (currently under `packages/lib/core` and `packages/lib/plugins`).
- Add/update unit tests with any behavioral change (especially config parsing, agents, templates, and routing).
- Run `pnpm run test` before opening a PR; use filtered runs for faster iteration.
- No strict coverage gate is configured, but new logic should include meaningful assertions.

## Commit & Pull Request Guidelines
- Follow Conventional Commit patterns seen in history: `feat:`, `fix:`, `chore:`, `docs:`, and scoped forms like `build(deps-dev):`.
- Keep commit subjects short, imperative, and package-aware when useful.
- PRs should include:
  - what changed and why,
  - affected packages/apps,
  - config or secret handling notes,
  - commands run (`pnpm run test`, `pnpm run build`, etc.).
- Link related issues and include logs/screenshots for user-visible behavior changes.

## Security & Configuration Tips
- Do not commit real tokens or credentials in `wrangler.toml`, `config.json`, or workflow files.
- Start from `wrangler-example.toml` and inject secrets via environment variables or GitHub Actions secrets.
