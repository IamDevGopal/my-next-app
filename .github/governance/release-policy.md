# Frontend Release Policy

## Artifact

This repository publishes the frontend image used by deployment workflows.

## Release Assumptions

- CI has passed
- client env usage remains safe
- auth routes still build and behave correctly

## Tag Intent

- `latest` represents stable frontend output from `master`
- commit-based tags provide traceability
