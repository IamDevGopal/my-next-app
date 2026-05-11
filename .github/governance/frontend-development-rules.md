# Frontend Development Rules

## Design Rules

- prioritize clear hierarchy and readability
- preserve working auth behavior
- respect both mobile and desktop layouts
- keep error, loading, and empty states intentional

## Runtime Rules

- browser-facing environment usage must remain intentional
- Docker image changes must preserve production startup behavior
- build-time assumptions should be documented when they change

## UX Rules

- auth flows should remain reliable and understandable
- visual polish must not break real form behavior
- new patterns should feel consistent with the rest of the product
