# Universal AI Browser Agent — MVP

A multi-user browser-automation SaaS foundation based on the supplied master prompt.

## Included
- React + TypeScript + Vite frontend
- Spring Boot 3 / Java 21 REST backend
- PostgreSQL persistence and Flyway migration
- Redis service in Docker Compose
- Separate Node.js + TypeScript + Playwright worker
- Browser connection registration, task submission, execution timeline
- Credential encryption utility (AES-256-GCM) in the backend
- Strict browser-worker action allowlist and URL safety checks
- Human-assistance pause for login/MFA/CAPTCHA
- Task status and action audit records

## Important scope statement
This is a runnable MVP foundation, not a claim that every listed provider integration is already implemented. Official social-platform and WhatsApp connectors require provider developer apps, scopes, verification, webhooks and account eligibility. Those integrations are represented by extension points and must be implemented and tested against each provider's current rules. The browser worker does not bypass CAPTCHA, MFA, bot protection, paywalls or platform restrictions.

The MVP currently supports safe, user-authorized website navigation and page inspection. It does not autonomously submit forms, send messages, publish posts, make payments, delete records or perform other consequential actions.

## Prerequisites
- Java 21
- Maven 3.9+
- Node.js 20+
- Docker Desktop

## Run with Docker
```powershell
Copy-Item .env.example .env
docker compose up --build
```
Frontend: http://localhost:5173  
Backend API: http://localhost:8080/api/v1  
Worker health: http://localhost:3001/health

For local development, start PostgreSQL and Redis with `docker compose up postgres redis -d`, then run backend and worker separately.

## Local development
Backend:
```powershell
cd backend
mvn spring-boot:run
```
Worker:
```powershell
cd browser-worker
npm install
npx playwright install chromium
npm run dev
```
Frontend:
```powershell
cd frontend
npm install
npm run dev
```

## Environment
See `.env.example`. Set a long random `APP_ENCRYPTION_KEY` encoded as 32 bytes in base64 before storing any credentials. Never commit `.env`.

## Security notes
- Put this service behind HTTPS before exposing it publicly.
- Configure a production identity provider/JWT authentication before multi-user deployment.
- Add tenant ownership checks to every resource endpoint before enabling multiple users.
- Use a managed secrets vault and KMS envelope encryption in production.
- Restrict browser-worker network egress at infrastructure level. Application URL validation is not a complete SSRF defense.
- Do not store raw passwords in logs, task prompts, browser traces or AI context.
- Use isolated browser containers/contexts per tenant and task.
- Add rate limits, quotas, retention policies, backups and security tests before production.

## API overview
- `POST /api/v1/connections` — register a website URL
- `GET /api/v1/connections` — list connections
- `POST /api/v1/tasks` — create a browser inspection task
- `GET /api/v1/tasks` — list tasks
- `GET /api/v1/tasks/{id}` — task detail and action timeline
- `POST /api/v1/tasks/{id}/cancel` — cancel a queued/running task

## Extending connectors
Implement the connector contract in `backend/src/main/java/com/example/agent/connector`. Prefer official APIs. A browser connector is a fallback only where automation is permitted. Every connector must declare capabilities and permission requirements; never infer capability from a provider name alone.
"# Browser-automation" 
