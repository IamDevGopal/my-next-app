# Contributing to TaskFlow Web

Thanks for contributing. This repository owns the frontend experience for TaskFlow and should remain understandable, reliable, and easy to evolve.

## What This Repository Owns

- browser-facing UI and page flows
- auth-related frontend behavior
- client-side validation and form UX
- frontend build and runtime behavior
- frontend release image behavior

## Local Setup

```bash
npm install
```

Start development:

```bash
npm run dev
```

## Recommended Validation

Before opening a pull request, run:

```bash
npm run lint
npm run typecheck
npm run build
```

## Frontend Expectations

- preserve working auth behavior
- keep UX clear on both desktop and mobile
- avoid mixing large visual rewrites with unrelated bug fixes
- prefer understandable component structure over clever abstractions
- keep browser-facing environment usage intentional

## Pull Request Expectations

A strong frontend PR should explain:

- what user experience changed
- what screens or flows are affected
- whether auth-related behavior changed
- whether runtime or build assumptions changed
- what was validated locally
