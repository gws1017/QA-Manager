@echo off
title QA Manager DB Sync

cd /d "%~dp0"

set LOCAL_DB=data\qa.db
set SERVER_DB=data\db\gws1017.db

if not exist "%LOCAL_DB%" (
    echo [ERROR] data\qa.db not found
    pause & exit /b 1
)
if not exist "%SERVER_DB%" (
    echo [ERROR] data\db\gws1017.db not found
    pause & exit /b 1
)

echo.
echo [INFO] Checkpointing WAL files before sync...
node -e "const Database=require('better-sqlite3'); for (const p of ['%LOCAL_DB:\=/%','%SERVER_DB:\=/%']) { try { const db=new Database(p); db.pragma('wal_checkpoint(TRUNCATE)'); db.close(); } catch(e) { console.log('skip', p, e.message); } }"
if errorlevel 1 (
    echo [ERROR] Checkpoint failed. Is the server still running? Stop it first.
    pause & exit /b 1
)

for %%A in ("%LOCAL_DB%") do set LOCAL_TIME=%%~tA
for %%A in ("%SERVER_DB%") do set SERVER_TIME=%%~tA

echo.
echo  Local  (qa.db)      : %LOCAL_TIME%
echo  Server (gws1017.db) : %SERVER_TIME%
echo.
echo  [1] Local  -^> Server  (qa.db to gws1017.db)
echo  [2] Server -^> Local   (gws1017.db to qa.db)
echo  [3] Cancel
echo.
set /p CHOICE= Select (1/2/3):

if "%CHOICE%"=="1" goto LOCAL_TO_SERVER
if "%CHOICE%"=="2" goto SERVER_TO_LOCAL
goto END

:LOCAL_TO_SERVER
del /f /q "%SERVER_DB%-shm" "%SERVER_DB%-wal" 2>nul
copy /Y "%LOCAL_DB%" "%SERVER_DB%" > nul
echo [OK] qa.db -^> gws1017.db done
goto END

:SERVER_TO_LOCAL
del /f /q "%LOCAL_DB%-shm" "%LOCAL_DB%-wal" 2>nul
copy /Y "%SERVER_DB%" "%LOCAL_DB%" > nul
echo [OK] gws1017.db -^> qa.db done
goto END

:END
echo.
pause
