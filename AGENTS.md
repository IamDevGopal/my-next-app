## Standing Workspace Rules

For this TaskFlow workspace, read and follow the parent `../AGENTS.md` as well. These rules persist across sessions:

- Work only on the user-selected scope. Implementation permission does not authorize tests, typecheck, lint, build, formatting/check commands, dependency installation, runtime operations, or Git staging/commit/push/deployment. Execute only explicitly requested or authorized actions; report unrun checks as pending.
- Never enter Ubuntu/WSL or another project/directory without explicit authorization for that operation/scope.
- Place components, API adapters, helpers, schemas, types, and tests by their actual responsibility and feature ownership. Shared folders are not default destinations merely because multiple callers exist; follow existing feature boundaries.
- Added/revised code comments must use multiline block format. Remove or correct stale/redundant comments only in the selected code being changed.
- Keep tests and fixtures related to the selected behavior and correctly located. Do not run unrelated suites or repeat check chains without authorization.
- Keep frontend test files in the repository's root `tests/` directory, grouped by feature; do not colocate tests with application code in `src/`.
- Explain unfamiliar terms in simple Hinglish and use user-action/API chains for findings. Keep completion reports brief and distinguish actual evidence from pending verification.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

<!-- END:nextjs-agent-rules -->
