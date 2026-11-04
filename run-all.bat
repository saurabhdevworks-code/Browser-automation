@echo off
title Universal AI Browser Agent Runner
echo ========================================================
echo   Starting Universal AI Browser Agent Services...
echo ========================================================

start "Backend API (Port 8080)" cmd /k "cd /d ""%~dp0backend"" && echo Starting Backend on :8080... && mvn spring-boot:run"
start "Browser Worker (Port 3001)" cmd /k "cd /d ""%~dp0browser-worker"" && echo Starting Browser Worker on :3001... && npm run dev"
start "Frontend UI (Port 5173)" cmd /k "cd /d ""%~dp0frontend"" && echo Starting Frontend on :5173... && npm run dev"

echo.
echo All 3 services are launching in separate windows:
echo   - Frontend:       http://localhost:5173
echo   - Backend API:    http://localhost:8080/api/v1
echo   - Browser Worker: http://localhost:3001/health
echo ========================================================
