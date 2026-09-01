Write-Host "Starting Queue Flow Services..." -ForegroundColor Green

# 1. Start XAMPP MySQL Database (if not already running)
$mysqlRunning = Get-Process -Name "mysqld" -ErrorAction SilentlyContinue
if (-not $mysqlRunning) {
    Write-Host "Starting MySQL Database..." -ForegroundColor Cyan
    Start-Process -FilePath "C:\\xampp\\mysql\\bin\\mysqld.exe" -ArgumentList "--defaults-file=C:\\xampp\\mysql\\bin\\my.ini", "--console" -WindowStyle Hidden
    Start-Sleep -Seconds 3
} else {
    Write-Host "MySQL Database is already running." -ForegroundColor Yellow
}

# 2. Start Django Backend Server (runs in a new PowerShell window)
Write-Host "Starting Django Backend..." -ForegroundColor Cyan
Start-Process -FilePath "powershell.exe" -ArgumentList "-NoExit", "-Command", "cd backend; .\\venv\\Scripts\\Activate.ps1; python manage.py runserver 0.0.0.0:8000"

# 3. Start Vite Frontend Server (runs in a new PowerShell window)
Write-Host "Starting Vite Frontend..." -ForegroundColor Cyan
Start-Process -FilePath "powershell.exe" -ArgumentList "-NoExit", "-Command", "npm.cmd run dev"

Write-Host "All services launched successfully!" -ForegroundColor Green
Write-Host "  -> Frontend: http://localhost:8080 (or http://192.168.31.228:8080)" -ForegroundColor Green
Write-Host "  -> Backend: http://localhost:8000" -ForegroundColor Green
Write-Host "  -> phpMyAdmin: http://localhost:9090/phpmyadmin/" -ForegroundColor Green
