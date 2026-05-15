@echo off
REM Math Topic Classifier - Start Script

echo ========================================
echo  Math Topic Classifier
echo ========================================
echo.

cd /d "%~dp0"

REM Load .env if it exists
if exist .env (
    echo Loading configuration from .env file...
    for /f "tokens=1,2 delims==" %%a in (.env) do (
        set "%%a=%%b"
    )
)

set PORT=8000

echo Server will start at: http://localhost:%PORT%
echo.
echo Press CTRL+C to stop the server
echo ========================================
echo.

python -m uvicorn app:app --host 0.0.0.0 --port %PORT% --reload
