@echo off
title NEXUS - Origin : Cerveau Numerique

echo.
echo  ========================================
echo    NEXUS - Origin : Cerveau Numerique
echo  ========================================
echo.

cd /d "%~dp0"

where node >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo  [ERREUR] Node.js non trouve. Installez Node.js depuis https://nodejs.org
    pause
    exit /b 1
)

echo  [+] Mise a jour, dependances et lancement via launch.cjs...
echo  [+] Fermez cette fenetre pour arreter NEXUS.
echo.

node scripts\launch.cjs --dev

echo.
echo  NEXUS a ete arrete. Appuyez sur une touche pour fermer.
pause >NUL
