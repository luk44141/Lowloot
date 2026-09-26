@echo off
setlocal

:: ============================================
:: Rutas y configuracion (portable, basado en la
:: ubicacion del propio .bat)
:: ============================================

set "PROJECT_ROOT=%~dp0"
set "PG_SERVICE_NAME=postgresql-x64-18"

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

net start %PG_SERVICE_NAME%

echo PostgreSQL listo.
echo.

echo [2/3] Iniciando Spring Boot...

cd /d "%PROJECT_ROOT%lowloot-server"

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

powershell -NoProfile -Command "$p = Get-NetTCPConnection -LocalPort 8080 -State Listen | Select-Object -First 1 -ExpandProperty OwningProcess; Set-Content '%PROJECT_ROOT%backend.pid' $p"

echo PID del backend guardado:
type "%PROJECT_ROOT%backend.pid"
echo.

echo [3/3] Iniciando Electron...
echo.

cd /d "%PROJECT_ROOT%lowloot-launcher"

call npm start

echo.
echo ==================================
echo        CERRANDO LOWLOOT
echo ==================================
echo.

echo Deteniendo Spring Boot...

cd /d "%PROJECT_ROOT%"

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

net stop %PG_SERVICE_NAME%

echo.
echo PostgreSQL detenido.
echo.

echo ==================================
echo        LOWLOOT CERRADO
echo ==================================

endlocal
exit