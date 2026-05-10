# TaskFlow Frontend Security Policy

## Scope

The frontend has a different security profile from the backend, but still includes sensitive concerns:

- auth flows
- client token handling
- reset-password paths
- browser-visible environment configuration

## Supported Branch

- `master`

## Reporting A Vulnerability

Do not open public issues for:

- exposed client auth weakness
- token storage weakness
- reset-password flow abuse
- accidental client-side secret exposure

Report privately with:

1. summary
2. affected route or file
3. reproduction steps
4. impact

## Security Rules

- only `NEXT_PUBLIC_*` values may be intentionally browser-visible
- never place backend-only secrets in client code
- treat auth page changes as security-sensitive
