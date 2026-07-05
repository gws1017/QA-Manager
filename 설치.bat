@echo off
title QA Manager - Install

echo.
echo  ================================
echo    QA Manager Setup
echo  ================================
echo.

cd /d "%~dp0"

where node >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js not found.
    echo         Download from https://nodejs.org and install, then run again.
    pause
    exit /b 1
)

echo [1/3] Installing packages...
call npm install
if errorlevel 1 (
    echo [ERROR] npm install failed.
    pause
    exit /b 1
)

echo.
echo [2/3] Rebuilding native modules...
call npm rebuild better-sqlite3
if errorlevel 1 (
    echo [ERROR] better-sqlite3 build failed.
    echo         You may need Visual Studio Build Tools:
    echo         https://visualstudio.microsoft.com/visual-cpp-build-tools/
    pause
    exit /b 1
)

echo.
echo [3/3] Creating data folders...
if not exist "data\db" mkdir "data\db"
if not exist "data\screenshots" mkdir "data\screenshots"

echo.
echo  ================================
echo    Setup complete!
echo    Run server with: start_server.bat
echo  ================================
echo.
pause
