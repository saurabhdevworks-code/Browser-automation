# Architecture

```text
React UI
   | REST
Spring Boot Core ---- PostgreSQL
   |                    |
   | HTTP               +-- connections / tasks / actions
   v
Playwright Worker
   |
   +-- isolated Chromium context per inspection
   +-- URL policy
   +-- DOM/page text observation
```

## Boundaries
- Spring Boot owns users/workspaces (future extension), connections, task lifecycle, approval policy and audit history.
- Browser worker owns browser processes and exposes only narrow typed operations.
- LLM provider adapters must return structured plans, never executable shell/JavaScript.
- Connector registry declares operations, scopes, eligibility and verification strategy.
- Official APIs are preferred. Browser automation must not be used to circumvent provider restrictions.

## Next production milestones
1. Authentication, workspace membership and tenant ownership enforcement.
2. Redis-backed asynchronous queue with cancellation and idempotency.
3. OAuth authorization code + PKCE, state validation and token refresh.
4. KMS-backed secret vault and isolated browser session persistence.
5. Approval records bound cryptographically to exact action payloads.
6. Provider-specific connectors and webhook signature verification.
7. LLM planner with schema-constrained tools, prompt-injection defenses and action policy.
8. Observability, rate limits, retention, threat modeling and security testing.
