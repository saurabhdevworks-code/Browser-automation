@echo off
title Universal AI Browser Agent - Canva Login Helper
cd /d "%~dp0browser-worker"
echo ========================================================
echo   Canva 1-Time User-Assisted Login
echo ========================================================
npm run login https://www.canva.com/login
pause
