# Script PowerShell pour créer un raccourci NEXUS sur le bureau
# avec icône personnalisée et mise à jour automatique

param(
    [string]$Nom = "NEXUS - Origin",
    [string]$Cible = ".\lancer-nexus.bat",
    [string]$Icone = "shell32.dll,13"
)

# Vérifier que PowerShell est en mode administrateur (optionnel)
if (-NOT ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
    Write-Host "⚠️  Ce script fonctionne mieux en mode administrateur pour créer le raccourci." -ForegroundColor Yellow
    Write-Host "   Appuyez sur Entrée pour continuer quand même..." -ForegroundColor Yellow
    Read-Host
}

# Créer le raccourci
try {
    $WshShell = New-Object -comObject WScript.Shell
    $DesktopPath = [Environment]::GetFolderPath("Desktop")
    $ShortcutPath = Join-Path -Path $DesktopPath -ChildPath "$Nom.lnk"
    
    Write-Host "📁 Création du raccourci : $ShortcutPath" -ForegroundColor Cyan
    
    # Résoudre le chemin absolu de la cible
    $TargetPath = Resolve-Path -Path $Cible -ErrorAction Stop
    $WorkingDir = Split-Path -Path $TargetPath -Parent
    
    Write-Host "   → Cible : $TargetPath" -ForegroundColor Green
    Write-Host "   → Répertoire : $WorkingDir" -ForegroundColor Green
    Write-Host "   → Icône : $Icone" -ForegroundColor Green
    
    $Shortcut = $WshShell.CreateShortcut($ShortcutPath)
    $Shortcut.TargetPath = $TargetPath
    $Shortcut.WorkingDirectory = $WorkingDir
    $Shortcut.WindowStyle = 1  # Fenêtre normale
    $Shortcut.Description = "NEXUS - Origin : Cerveau Numérique IA Locale"
    $Shortcut.IconLocation = $Icone
    $Shortcut.Save()
    
    Write-Host "✅ Raccourci créé avec succès sur le bureau !" -ForegroundColor Green
    Write-Host "" -ForegroundColor White
    Write-Host "📌 Pour utiliser NEXUS :" -ForegroundColor Magenta
    Write-Host "   1. Double-cliquez sur le raccourci '$Nom' sur votre bureau" -ForegroundColor White
    Write-Host "   2. Le script va :" -ForegroundColor White
    Write-Host "      - Mettre à jour le code depuis GitHub" -ForegroundColor Cyan
    Write-Host "      - Installer les dépendances" -ForegroundColor Cyan
    Write-Host "      - Lancer Ollama si nécessaire" -ForegroundColor Cyan
    Write-Host "      - Démarrer l'application Electron" -ForegroundColor Cyan
    Write-Host "" -ForegroundColor White
    Write-Host "💡 Astuce : Le raccourci se met à jour automatiquement à chaque lancement." -ForegroundColor Yellow
    
} catch {
    Write-Host "❌ Erreur : $_" -ForegroundColor Red
    Write-Host "   Vérifiez que le fichier '$Cible' existe dans le répertoire courant." -ForegroundColor Yellow
    exit 1
}

# Option : Créer aussi un raccourci dans le menu Démarrer
try {
    $StartMenuPath = [Environment]::GetFolderPath("StartMenu")
    $StartMenuShortcut = Join-Path -Path $StartMenuPath -ChildPath "$Nom.lnk"
    
    if (-not (Test-Path $StartMenuPath)) {
        $StartMenuPath = [Environment]::GetFolderPath("CommonStartMenu")
    }
    
    $Shortcut.StartMenu = $WshShell.CreateShortcut($StartMenuShortcut)
    $Shortcut.StartMenu.TargetPath = $TargetPath
    $Shortcut.StartMenu.WorkingDirectory = $WorkingDir
    $Shortcut.StartMenu.WindowStyle = 1
    $Shortcut.StartMenu.Description = "NEXUS - Origin : Cerveau Numérique IA Locale"
    $Shortcut.StartMenu.IconLocation = $Icone
    $Shortcut.StartMenu.Save()
    
    Write-Host "✅ Raccourci aussi ajouté au menu Démarrer." -ForegroundColor Green
} catch {
    Write-Host "⚠️  Impossible de créer le raccourci dans le menu Démarrer : $_" -ForegroundColor Yellow
}

# Afficher l'aide
Write-Host "" -ForegroundColor White
Write-Host "📖 AIDE :" -ForegroundColor Magenta
Write-Host "   - Pour supprimer le raccourci : supprimez '$Nom.lnk' du bureau" -ForegroundColor White
Write-Host "   - Pour modifier la cible : modifiez ce script ou le raccourci" -ForegroundColor White
Write-Host "   - Pour désactiver la mise à jour auto : modifiez lancer-nexus.bat" -ForegroundColor White
