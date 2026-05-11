# Commit Convention

TaskFlow uses a short, readable commit format so history stays understandable across the parent repository and both child repositories.

## Format

```text
<type>: <short summary>
```

Examples:

```text
feat: add password reset flow
fix: correct docker health check path
docs: clarify release workflow
refactor: split auth validation into service
chore: align issue templates across repos
```

## Allowed Types

- `feat` for new functionality
- `fix` for bug fixes
- `docs` for documentation-only changes
- `refactor` for internal restructuring without intended behavior change
- `test` for test-only changes
- `chore` for maintenance, tooling, cleanup, or dependency work
- `ci` for workflow or automation changes
- `build` for Docker, packaging, or artifact-generation changes

## Rules

- Keep the summary short and specific
- Use imperative wording such as `add`, `fix`, `update`, or `remove`
- One commit should communicate one main purpose
- Avoid vague subjects like `update files` or `misc fixes`

## Good Examples

- `feat: add refresh token rotation`
- `fix: stop frontend deploy after failed image pull`
- `docs: explain parent submodule responsibilities`
- `ci: add backend docker verification job`
