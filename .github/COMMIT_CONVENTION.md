# Commit convention

This child repository uses Conventional Commit metadata with one automatic, type-specific icon. This is a TaskFlow policy, not a format mandated by GitHub. Write the intent; the hooks add the icon.

## Write this

```text
feat(auth): add email verification
fix(hooks): preserve editor-written messages
refactor(tasks)!: change task response contract
```

## Git stores this

```text
✨ feat(auth): add email verification
🐛 fix(hooks): preserve editor-written messages
♻️ refactor(tasks)!: change task response contract
```

Format: `<icon> <type>[(scope)][!]: <summary>`, optionally followed by a blank line, body and trailers. The normalizer changes the header only; body, BREAKING CHANGE details and Signed-off-by/Co-authored-by trailers remain intact. Keep one main purpose and a specific imperative summary. Scope is optional and lowercase; comma-separated scopes are supported. Acronyms/code identifiers in the subject are preserved. Avoid a trailing period in the summary.

| Type     | Icon | Intent                                         |
| -------- | ---- | ---------------------------------------------- |
| feat     | ✨   | New functionality                              |
| fix      | 🐛   | Bug fix                                        |
| docs     | 📝   | Documentation                                  |
| style    | 🎨   | Formatting with no semantic change             |
| refactor | ♻️   | Restructuring without intended behavior change |
| perf     | ⚡   | Performance                                    |
| test     | ✅   | Tests                                          |
| chore    | 🧹   | Maintenance                                    |
| ci       | ⚙️   | Continuous integration/automation              |
| build    | 🏗️   | Build system, packaging or dependencies        |
| revert   | ⏪   | Revert                                         |

## Automatic behavior

- Explicit message type wins over branch name. Hooks correct missing, wrong, old, duplicate and shortcode icon prefixes using the table above.
- If type is missing, a recognized branch prefix such as `feature/`, `hotfix/`, `docs/`, `refactor/` can supply it. The hook does not invent a scope or inspect the diff to guess intent. Prefer writing the type explicitly, especially for mixed-purpose branches.
- On main/master, release branches, detached HEAD or unknown branches, an untyped message fails with guidance. An unknown explicit type is never silently relabeled.
- Uppercase types/scopes and known aliases (feature, bugfix, hotfix, doc, documentation, performance, tests, maintenance) normalize to canonical metadata.
- Native Git revert messages receive the revert icon. Native merge messages and `fixup!`/`squash!`/`amend!` autosquash markers retain Git's syntax so matching/rebase semantics keep working.
- Existing committed history is not rewritten. A push transports the existing commit message; it does not add icons.

## Installation and verification

Use Node 22 (matching project runtime) and development dependencies in this repository:

```bash
npm ci
npm run hooks:install
npm run hooks:check
npm run test:commits
```

`prepare` installs Husky on developer installs and verifies the active launchers. Explicit HUSKY=0, CI=true and production installs skip activation. GUI Git needs Node on PATH; see [Husky GUI setup](https://typicode.github.io/husky/how-to.html#node-version-managers-and-guis). Windows and WSL have separate runtime environments; run the check in the environment used to commit.

`.husky/commit-policy.cjs` owns the mapping and header validation. `prepare-commit-msg` normalizes the initial draft; `commit-msg` normalizes again after editor/Copilot changes and validates that shared policy directly. The CI commitlint plugin calls the same rule. Local commits avoid loading commitlint's dependency tree, keeping WSL/GUI checks fast. No npx downloads occur during commits. Both submodules keep the same standalone policy/tests so each repository also works without the parent checkout.

CI runs the hook regression suite and validates new PR/push commit ranges without rewriting messages. Initial-branch/manual runs validate the tip instead of all legacy history. Repository rules/required checks still need GitHub-side configuration to block merges; adding workflow code alone does not enable branch protection.

Intentional hook bypass (HUSKY=0, overridden hooksPath, plumbing/API-created commits) can evade local normalization. `--no-verify` skips commit-msg but Git still runs prepare-commit-msg. CI detects missing/wrong icons within the checked range. Do not bypass the convention to resolve a validation error.
