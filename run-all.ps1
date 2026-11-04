# Universal AI Browser Agent - One-command local runner
$rootDir = if ($PSScriptRoot) { $PSScriptRoot } else { Get-Location }

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "   Starting Universal AI Browser Agent (Local Dev Mode)  " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 0. Check PostgreSQL Service
$pgService = Get-Service -Name "postgresql*" -ErrorAction SilentlyContinue | Select-Object -First 1
if ($pgService -and $pgService.Status -ne 'Running') {
    Write-Host "Starting local PostgreSQL service ($($pgService.Name))..." -ForegroundColor Yellow
    Start-Service $pgService.Name -ErrorAction SilentlyContinue
}

# 1. Backend (Spring Boot 3 / Java 21)
Start-Process powershell -ArgumentList "-NoExit", "-Command", "`$host.UI.RawUI.WindowTitle = 'Backend API (Port 8080)'; Set-Location '$rootDir\backend'; Write-Host 'Starting Spring Boot Backend on :8080...' -ForegroundColor Green; mvn spring-boot:run"

# 2. Browser Worker (Node.js + Playwright)
Start-Process powershell -ArgumentList "-NoExit", "-Command", "`$host.UI.RawUI.WindowTitle = 'Browser Worker (Port 3001)'; Set-Location '$rootDir\browser-worker'; Write-Host 'Starting Browser Worker on :3001...' -ForegroundColor Yellow; if (!(Test-Path 'node_modules')) { npm install; npx playwright install chromium }; npm run dev"

# 3. Frontend (React + Vite)
Start-Process powershell -ArgumentList "-NoExit", "-Command", "`$host.UI.RawUI.WindowTitle = 'Frontend UI (Port 5173)'; Set-Location '$rootDir\frontend'; Write-Host 'Starting Frontend UI on :5173...' -ForegroundColor Magenta; if (!(Test-Path 'node_modules')) { npm install }; npm run dev"

Write-Host "`nAll 3 services have been launched in separate labeled windows:" -ForegroundColor Cyan
Write-Host "  [Frontend UI]       http://localhost:5173" -ForegroundColor Green
Write-Host "  [Backend API]      http://localhost:8080/api/v1" -ForegroundColor Green
Write-Host "  [Browser Worker]   http://localhost:3001/health" -ForegroundColor Green
Write-Host "==========================================================`n" -ForegroundColor Cyan
