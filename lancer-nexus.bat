@echo off
:: NEXUS - Lancement de Origin (Cerveau Numérique)
:: ============================================
:: Script de lancement avec mise à jour automatique
:: Utilisation : Double-cliquez sur ce fichier

@echo off
title NEXUS - Origin : Cerveau Numérique

:: Couleurs pour les messages
setlocal enabledelayedexpansion
call :SetColor

echo.
echo  ███╗   ██╗███████╗ ██████╗ ███╗   ██╗
echo  ████╗  ██║██╔════╝██╔═══██╗████╗  ██║
echo  ██╔██╗ ██║█████╗  ██║   ██║██╔██╗ ██║
echo  ██║╚██╗██║██╔══╝  ██║   ██║██║╚██╗██║
echo  ██║ ╚████║███████╗╚██████╔╝██║ ╚████║
echo  ╚═╝  ╚═══╝╚══════╝ ╚═════╝ ╚═╝  ╚═══╝
echo.
echo  🧠 Origin - Cerveau Numérique
echo  ============================
echo.

:: Vérifier si on est dans le bon répertoire
cd /d "%~dp0"

:: Étape 1 : Mise à jour automatique
echo %GREEN%[+]%RESET% Mise à jour du code depuis GitHub...
git pull origin main 2>nul
if %ERRORLEVEL% equ 0 (
    echo %GREEN%[OK]%RESET% Code à jour.
) else (
    echo %YELLOW%[!]%RESET% Échec de la mise à jour (pas de connexion ?).
)
echo.

:: Étape 2 : Installation des dépendances
echo %GREEN%[+]%RESET% Vérification des dépendances...
where pnpm >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo %RED%[ERREUR]%RESET% pnpm non trouvé.
    echo %RED%[ERREUR]%RESET% Veuillez installer pnpm : npm install -g pnpm
    pause
    exit /b 1
)

echo %GREEN%[+]%RESET% Installation des dépendances...
pnpm install
if %ERRORLEVEL% neq 0 (
    echo %RED%[ERREUR]%RESET% Échec de l'installation.
    pause
    exit /b 1
)
echo.

:: Étape 3 : Vérifier et lancer Ollama
echo %GREEN%[+]%RESET% Vérification d'Ollama...
tasklist /FI "IMAGENAME eq ollama.exe" 2>NUL | find /I "ollama.exe" >NUL
if %ERRORLEVEL% neq 0 (
    echo %MAGENTA%[+]%RESET% Lancement d'Ollama...
    start "" "ollama" serve
    timeout /t 5 /nobreak >NUL
    echo %GREEN%[OK]%RESET% Ollama lancé.
) else (
    echo %GREEN%[OK]%RESET% Ollama est déjà en cours.
)
echo.

:: Étape 4 : Lancement de l'application
echo %GREEN%[+]%RESET% Lancement de NEXUS...
echo %GREEN%[+]%RESET% L'interface s'ouvre dans Electron...
echo %GREEN%[+]%RESET% Appuyez sur Ctrl+C dans cette fenêtre pour arrêter.
echo.

:: Lancer via le script Node.js
node scripts/launch.cjs --dev

echo.
echo %GREEN%[OK]%RESET% NEXUS a été arrêté.
echo %GREEN%[+]%RESET% Appuyez sur une touche pour fermer cette fenêtre.
pause >NUL
goto :eof

:: Fonction pour définir les couleurs
:SetColor
set "RESET="
set "RED="
set "GREEN="
set "YELLOW="
set "BLUE="
set "MAGENTA="
set "CYAN="

:: Activer les couleurs si possible
reg query "HKEY_CURRENT_USER\Console" /v VirtualTerminalLevel 2>nul
if %ERRORLEVEL% equ 0 (
    for /f "tokens=2 delims=: " %%A in ('reg query "HKEY_CURRENT_USER\Console" /v VirtualTerminalLevel 2^>nul') do (
        if %%A geq 1 (
            set "RESET=^[[0m"
            set "RED=^[[31m"
            set "GREEN=^[[32m"
            set "YELLOW=^[[33m"
            set "BLUE=^[[34m"
            set "MAGENTA=^[[35m"
            set "CYAN=^[[36m"
        )
    )
)
goto :eof
