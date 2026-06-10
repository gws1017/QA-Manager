@echo off
chcp 65001 > nul
title QA Manager Server

echo.
echo  ================================
echo    QA Manager Server
echo    Local  : http://localhost:47291
echo    Network: http://192.168.0.42:47291
echo  ================================
echo.

cd /d "%~dp0"

where node >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js not found. Install from https://nodejs.org
    pause
    exit /b 1
)

npm run dev

pause
