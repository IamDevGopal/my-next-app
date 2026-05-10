# Frontend Branch And Release Policy

## Stable Branch

- `master`

## Release Rule

`master` is the branch eligible for frontend image release.

## Merge Rule

Do not merge frontend changes that break:

- lint
- build
- auth-route stability
- Docker image runtime expectations
