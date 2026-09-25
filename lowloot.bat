@echo off
setlocal

:: ============================================
:: Comprobar permisos de administrador
:: ============================================

net session >nul 2>&1

if %errorlevel% neq 0 (
    echo Solicitando permisos de administrador...
    powershell -Command "Start-Process '%~f0' -Verb RunAs"
    exit /b
)

title Lowloot

echo ==================================
echo        INICIANDO LOWLOOT
echo ==================================
echo.

echo [1/3] Iniciando PostgreSQL...

net start postgresql-x64-18

echo PostgreSQL listo.
echo.

echo [2/3] Iniciando Spring Boot...

cd /d "C:\Users\lucam\Desktop\lowloot\lowloot-server"

powershell -NoProfile -Command "Start-Process -FilePath 'cmd.exe' -ArgumentList '/k','mvnw.cmd spring-boot:run'"

echo Spring Boot iniciado.
echo.

echo Esperando a que Spring Boot arranque...

:WAIT_BACKEND

powershell -NoProfile -Command "if (Get-NetTCPConnection -LocalPort 8080 -State Listen -ErrorAction SilentlyContinue) { exit 0 } else { exit 1 }"

if errorlevel 1 (
    timeout /t 2 /nobreak >nul
    goto WAIT_BACKEND
)

echo Spring Boot esta listo.

powershell -NoProfile -Command "$p = Get-NetTCPConnection -LocalPort 8080 -State Listen | Select-Object -First 1 -ExpandProperty OwningProcess; Set-Content 'C:\Users\lucam\Desktop\lowloot\backend.pid' $p"

echo PID del backend guardado:
type "C:\Users\lucam\Desktop\lowloot\backend.pid"
echo.

echo [3/3] Iniciando Electron...
echo.

cd /d "C:\Users\lucam\Desktop\lowloot\lowloot-launcher"

call npm start

echo.
echo ==================================
echo        CERRANDO LOWLOOT
echo ==================================
echo.

echo Deteniendo Spring Boot...

cd /d "C:\Users\lucam\Desktop\lowloot"

if exist backend.pid (
    echo PID encontrado:
    type backend.pid
    echo.

    for /f "usebackq delims=" %%P in ("backend.pid") do (
        echo Cerrando proceso %%P...
        taskkill /PID %%P /T /F
    )

    del backend.pid
) else (
    echo No se encontro backend.pid.
)

echo.
echo Spring Boot detenido.
echo.

echo Deteniendo PostgreSQL...

net stop postgresql-x64-18

echo.
echo PostgreSQL detenido.
echo.

echo ==================================
echo        LOWLOOT CERRADO
echo ==================================

endlocal
exit