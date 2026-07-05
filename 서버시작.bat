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

if not exist "node_modules" (
    echo [초기 설치] node_modules 없음 - npm install 실행 중...
    call npm install
    if errorlevel 1 (
        echo [ERROR] npm install 실패. 설치.bat 을 먼저 실행해 보세요.
        pause
        exit /b 1
    )
)

if not exist "data\db" mkdir "data\db"
if not exist "data\screenshots" mkdir "data\screenshots"

npm run dev

pause
