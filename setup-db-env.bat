@echo off
REM Quick setup script to add MySQL environment variables to Netlify

echo.
echo ==============================================
echo   Netlify MySQL Database Configuration
echo ==============================================
echo.
echo This will set up your MySQL database credentials for Netlify functions.
echo.

set /p DB_HOST="Enter MySQL Host (e.g., localhost or mysql.example.com): "
set /p DB_USER="Enter MySQL Username: "
set /p DB_PASSWORD="Enter MySQL Password: "
set /p DB_NAME="Enter MySQL Database Name: "

echo.
echo Setting environment variables in Netlify...
echo.

call netlify env:set DB_HOST "%DB_HOST%"
call netlify env:set DB_USER "%DB_USER%"
call netlify env:set DB_PASSWORD "%DB_PASSWORD%"
call netlify env:set DB_NAME "%DB_NAME%"

echo.
echo ========================================
echo   Environment variables configured!
echo ========================================
echo.
echo Next step: Redeploy to apply changes
echo Run: netlify deploy --prod
echo.
pause
