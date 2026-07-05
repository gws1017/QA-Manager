@echo off
chcp 65001 > nul
title QA Manager - 설치

echo.
echo  ================================
echo    QA Manager 초기 설치
echo  ================================
echo.

cd /d "%~dp0"

where node >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js가 없습니다. https://nodejs.org 에서 설치 후 다시 실행하세요.
    pause
    exit /b 1
)

echo [1/3] 패키지 설치 중...
call npm install
if errorlevel 1 (
    echo [ERROR] npm install 실패
    pause
    exit /b 1
)

echo.
echo [2/3] better-sqlite3 네이티브 모듈 빌드 중...
call npx node-gyp-build node_modules/better-sqlite3
if errorlevel 1 (
    echo [WARN] node-gyp-build 실패 - npm rebuild 시도...
    call npm rebuild better-sqlite3
    if errorlevel 1 (
        echo [ERROR] better-sqlite3 빌드 실패
        echo        Visual Studio Build Tools 설치가 필요할 수 있습니다.
        echo        https://visualstudio.microsoft.com/visual-cpp-build-tools/
        pause
        exit /b 1
    )
)

echo.
echo [3/3] 데이터 폴더 생성 중...
if not exist "data\db" mkdir "data\db"
if not exist "data\screenshots" mkdir "data\screenshots"

echo.
echo  ================================
echo    설치 완료!
echo    이제 서버시작.bat 을 실행하세요.
echo  ================================
echo.
pause
