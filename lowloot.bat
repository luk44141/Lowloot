@echo off
title Lowloot

echo ==================================
echo        INICIANDO LOWLOOT
echo ==================================
echo.

echo [1/3] Iniciando PostgreSQL...
net start postgresql-x64-18 >nul 2>&1
echo PostgreSQL listo.
echo.

echo [2/3] Iniciando Spring Boot...
cd /d "C:\Users\lucam\Desktop\lowloot\lowloot-server"

powershell -NoProfile -Command "$p = Start-Process -FilePath 'cmd.exe' -ArgumentList '/c','mvnw.cmd spring-boot:run' -WindowStyle Hidden -PassThru; Set-Content 'backend.pid' $p.Id"

echo Spring Boot iniciado.
echo.
echo Esperando a que Spring Boot arranque...
timeout /t 8 /nobreak >nul

echo [3/3] Iniciando Electron...
echo.

cd /d "C:\Users\lucam\Desktop\lowloot\lowloot-launcher"
npm start

echo.
echo ==================================
echo       CERRANDO LOWLOOT
echo ==================================
echo.

echo Deteniendo Spring Boot...

cd /d "C:\Users\lucam\Desktop\lowloot"

if exist backend.pid (
    set /p BACKEND_PID=<backend.pid
    taskkill /PID %BACKEND_PID% /T /F >nul 2>&1
    del backend.pid >nul 2>&1
)

echo Spring Boot detenido.
echo.
echo Cerrando Lowloot...

timeout /t 2 /nobreak >nul
exit