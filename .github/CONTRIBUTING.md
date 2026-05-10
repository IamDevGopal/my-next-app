# Contributing To TaskFlow Frontend

## Repository Purpose

This repository is the source of truth for the TaskFlow frontend, including:

- app routes and screens
- auth user experience
- frontend runtime behavior
- frontend Docker image

## Branch Policy

- `master` is the stable frontend branch.
- Frontend image releases are published from `master`.

## Local Setup

Typical frontend setup:

```bash
npm ci
npm run lint
npm run build
```

## Required Checks

Before pushing:

```bash
npm run lint
npm run build
```

## Frontend Development Rules

- preserve behavior unless the change intentionally modifies behavior
- avoid generic UI where stronger hierarchy and clarity are possible
- keep auth routes understandable and reliable
- do not expose backend-only secrets in browser-facing code

## Pull Request Rules

- explain the user-facing change clearly
- mention route, auth, env, or runtime impact
- include screenshots when visual changes are meaningful
