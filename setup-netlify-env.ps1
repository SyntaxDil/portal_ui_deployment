# Netlify Environment Setup
# Run this to configure your database credentials

Write-Host "🔧 Netlify Environment Variable Setup" -ForegroundColor Cyan
Write-Host ""

Write-Host "Enter your MySQL database credentials:" -ForegroundColor Yellow
$dbHost = Read-Host "Database Host (e.g., mysql.example.com)"
$dbUser = Read-Host "Database User"
$dbPassword = Read-Host "Database Password" -AsSecureString
$dbPasswordPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($dbPassword))
$dbName = Read-Host "Database Name"

Write-Host ""
Write-Host "Setting Netlify environment variables..." -ForegroundColor Yellow

# Set environment variables
netlify env:set DB_HOST "$dbHost"
netlify env:set DB_USER "$dbUser"
netlify env:set DB_PASSWORD "$dbPasswordPlain"
netlify env:set DB_NAME "$dbName"

Write-Host ""
Write-Host "✅ Environment variables configured!" -ForegroundColor Green
Write-Host ""
Write-Host "Next step: Deploy to Netlify" -ForegroundColor Cyan
Write-Host "Run: netlify deploy --prod" -ForegroundColor White
