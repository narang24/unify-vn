@echo off
REM ─────────────────────────────────────────────────────────────────────────────
REM  Unify — Nginx API Gateway Launcher (Windows)
REM ─────────────────────────────────────────────────────────────────────────────
REM  Prerequisites:
REM    1. Download nginx for Windows: https://nginx.org/en/download.html
REM    2. Extract to a folder (e.g. C:\nginx)
REM    3. Set NGINX_HOME below or add nginx.exe to your PATH
REM
REM  Usage: double-click or run from cmd:  nginx\start-nginx.bat
REM ─────────────────────────────────────────────────────────────────────────────

SET NGINX_HOME=C:\nginx

REM ── Determine the absolute path to this config file ──────────────────────────
SET SCRIPT_DIR=%~dp0
SET CONF_FILE=%SCRIPT_DIR%nginx.conf

REM ── Check nginx.exe exists ───────────────────────────────────────────────────
IF NOT EXIST "%NGINX_HOME%\nginx.exe" (
    echo [ERROR] nginx.exe not found at %NGINX_HOME%\nginx.exe
    echo.
    echo  1. Download nginx: https://nginx.org/en/download.html
    echo  2. Extract to %NGINX_HOME%
    echo  3. Re-run this script.
    pause
    exit /b 1
)

REM ── Create logs directory if it doesn't exist ─────────────────────────────────
IF NOT EXIST "%NGINX_HOME%\logs" mkdir "%NGINX_HOME%\logs"

REM ── Stop any existing nginx process ──────────────────────────────────────────
taskkill /f /im nginx.exe >nul 2>&1

REM ── Start nginx with our config ───────────────────────────────────────────────
echo Starting Unify Nginx API Gateway on port 8000...
cd /d "%NGINX_HOME%"
start "" nginx.exe -c "%CONF_FILE%"

REM ── Brief wait, then confirm ──────────────────────────────────────────────────
timeout /t 2 /nobreak >nul
tasklist | find "nginx.exe" >nul 2>&1
IF %ERRORLEVEL% EQU 0 (
    echo.
    echo  ✓ Nginx is running!
    echo    Gateway:           http://localhost:8000
    echo    Health check:      http://localhost:8000/health
    echo    Auth Service:      http://localhost:8001
    echo    Workspace Service: http://localhost:8002
    echo.
) ELSE (
    echo [ERROR] Nginx failed to start. Check %NGINX_HOME%\logs\error.log
)
pause
