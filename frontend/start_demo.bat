@echo off
REM Math Topic Classifier - Start Script

echo ========================================
echo  Math Topic Classifier
echo ========================================
echo.

cd /d "%~dp0"
set PORT=8000

echo Server will start at: http://localhost:%PORT%
echo.
echo Press CTRL+C to stop the server
echo ========================================
echo.

python -m uvicorn app:app --host 127.0.0.1 --port %PORT% --reload
