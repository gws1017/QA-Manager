@echo off
chcp 65001 > nul
title QA Manager (Local)

echo.
echo  ================================
echo    QA Manager - Local Version
echo    http://localhost:47291
echo  ================================
echo.

cd /d "%~dp0"

where node >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js not found. Install from https://nodejs.org
    pause
    exit /b 1
)

if not exist "node_modules" (
    echo [Setup] node_modules not found - running npm install...
    call npm install
    if errorlevel 1 (
        echo [ERROR] npm install failed. Try running install.bat first.
        pause
        exit /b 1
    )
)

if not exist "data\db" mkdir "data\db"
if not exist "data\screenshots" mkdir "data\screenshots"

npx next dev -p 47291 -H 127.0.0.1

pause
