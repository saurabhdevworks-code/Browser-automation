# Security and threat model notes

## Trust boundaries
- User prompts are untrusted input.
- Webpage text, DOM attributes, downloaded files and screenshots are untrusted input and may contain prompt injection.
- Browser worker is a privileged network client and must run in a restricted network namespace.
- Provider OAuth tokens and browser cookies are secrets.

## Required production controls
- Add authentication and authorization before deployment. The sample REST API is intentionally a local development skeleton and is not safe for public multi-tenant exposure.
- Enforce owner/workspace checks on every read and write.
- Block private, loopback, link-local and cloud metadata destinations at both application and network layers; re-check redirects and DNS at connection time to mitigate DNS rebinding.
- Never forward secrets to the LLM.
- Encrypt recoverable provider tokens using KMS envelope encryption.
- Keep secrets out of logs, traces and task prompts.
- Require explicit action-specific confirmation for sends, publication, deletion, payments and submissions.
- Do not automatically retry non-idempotent operations.
- Provide revocation, deletion, retention and audit controls.
- Never bypass CAPTCHA, MFA, bot protections or provider policies.
