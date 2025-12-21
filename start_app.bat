@echo off
echo Starting Ellas Cupcakery CRM System...

:: Start Backend
echo Starting Backend (Uvicorn)...
start "CRM Backend" cmd /k "python main.py"

:: Start Frontend (Dashboard + Customer UI)
echo Starting Frontend (Dashboard and Customer UI)...
start "CRM Frontend" cmd /k "cd dashboard && npm run dev"

echo.
echo System starting up!
echo Waiting for servers to initialize...
timeout /t 8

echo.
echo Opening Customer Interface...
start http://localhost:5173/?mode=customer

echo.
echo Opening Vendor Dashboard...
start http://localhost:5173/?mode=admin

echo.
echo Backend URL: http://localhost:8000
echo.
echo Keep these windows open. Close them to stop the server.
pause
