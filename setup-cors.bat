@echo off
REM Firebase Storage CORS Configuration Setup
REM This script applies CORS rules to your Firebase Storage bucket

echo Firebase Storage CORS Setup
echo ============================
echo.
echo This script will configure CORS for your Firebase Storage bucket.
echo Prerequisites: You must have Google Cloud SDK (gsutil) installed.
echo Download from: https://cloud.google.com/sdk/docs/install
echo.
echo Your Firebase Storage bucket: monitask-27c8f.appspot.com
echo.

REM Check if gsutil is available
where gsutil >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: gsutil is not installed or not in PATH
    echo.
    echo Install Google Cloud SDK from: https://cloud.google.com/sdk/docs/install
    echo.
    pause
    exit /b 1
)

echo.
echo Authenticating with Google Cloud...
echo This will open your browser for authentication.
echo.
gsutil auth login

echo.
echo Applying CORS configuration to bucket...
gsutil cors set cors.json gs://monitask-27c8f.appspot.com

echo.
echo ✓ CORS configuration applied successfully!
echo.
echo You can now upload files from http://localhost:* without CORS errors.
echo.
pause
