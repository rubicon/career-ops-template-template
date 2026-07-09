# Security Policy

## Reporting a vulnerability

Please report security issues privately. Do not open a public issue for a
vulnerability.

- Preferred: [GitHub private vulnerability reporting](https://github.com/rubicon/career-ops-template-template/security/advisories/new).
- Fallback: email dax@rubicontv.com.

Please include the version, a description of the issue, and steps to reproduce
it. You can expect an acknowledgement within a few days.

## Scope

A template pack is passive data: HTML templates, preview images, and a JSON
manifest. It has no runtime code that career-ops executes, and no network access.
The most relevant surface is the template HTML itself. Reports about a template
that could carry active or unsafe content (for example script, external
references, or markup that breaks the ATS-safe contract in a way the validator
misses) are in scope.

## Supported versions

| Version | Supported |
| ------- | --------- |
| 0.1.x   | Yes       |
