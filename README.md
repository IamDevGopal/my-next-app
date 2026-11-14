# TaskFlow Web

Frontend application for TaskFlow, built with Next.js.

## Stack

- Next.js
- React
- TypeScript
- Tailwind CSS

## Requirements and local configuration

- Node.js 22 (also recorded in `.nvmrc`).
- Copy `.env.example` to `.env.local` and provide all three required values: `NEXT_PUBLIC_APP_NAME`, `NEXT_PUBLIC_API_BASE_URL`, and `NEXT_PUBLIC_WS_URL`.
- These `NEXT_PUBLIC_*` values are compiled into browser assets during the build. They are public configuration, never secrets. Missing or invalid values fail validation; the app has no code defaults.
- CI and image release workflows read the same names from GitHub Actions repository variables. Configure all three before relying on those workflows.

## Quick Start

```bash
copy .env.example .env.local
npm ci
npm run dev
```

## Common Commands

```bash
npm run lint:check
npm run typecheck
npm run format:check
npm run build
npm run start
```

`npm run start` launches the standalone server produced by the build. CI runs quality checks and builds; feature tests are not part of CI unless the user explicitly authorizes that policy change.

## Repository Role

This repository owns the frontend application, browser-facing user flows, UI composition, and the frontend release image consumed by the parent TaskFlow deployment flow.

## Documentation Map

- Contribution guide: `.github/CONTRIBUTING.md`
- Governance policies: `.github/governance/`
- Parent orchestration repo: `../`

## Maintainer

- Owner: Gopal Kumhar
- GitHub: `IamDevGopal`
- Contact: `gopal95kumhar@gmail.com`
