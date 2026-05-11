# Release Policy

## Release Trigger

Frontend release publishing is handled by the repository release workflow and is intended to produce the image consumed by the parent TaskFlow deployment process.

## Maintainer Expectations

- release builds should come from validated code
- published images should preserve expected production startup behavior
- build-time environment assumptions should be clear before release
