@echo off
title NEXUS - IA Locale
echo.
echo  ========================================
echo   NEXUS - Demarrage de votre IA locale
echo  ========================================
echo.

REM Verifier si Ollama tourne
tasklist /FI "IMAGENAME eq ollama.exe" 2>NUL | find /I "ollama.exe" >NUL
if %ERRORLEVEL% neq 0 (
    echo  [+] Lancement d'Ollama...
    start "" "ollama" serve
    timeout /t 3 /nobreak >NUL
) else (
    echo  [OK] Ollama est deja en cours
)

echo  [+] Lancement de NEXUS...
echo  [+] L'interface s'ouvre dans votre navigateur...
echo  [+] Fermez cette fenetre pour arreter NEXUS
echo.

cd /d "%~dp0"
start "" http://localhost:3000
call pnpm dev

echo.
echo  NEXUS a ete arrete. Appuyez sur une touche pour fermer.
pause >NUL
