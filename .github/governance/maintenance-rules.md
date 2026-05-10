# Frontend Maintenance Rules

## Purpose

These rules keep the frontend buildable, understandable, and production-safe.

## Quality Gate

The frontend is not considered healthy unless:

- lint passes
- build passes
- auth screens remain usable
- public env assumptions remain correct

## UX Integrity Rule

Visual changes must improve clarity without casually breaking flow, spacing, or responsive behavior.

## Drift Rule

Do not rely on uncommitted local tweaks as the reason a frontend screen looks or behaves correctly.
