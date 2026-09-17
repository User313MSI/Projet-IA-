# Creer un raccourci NEXUS sur le bureau
$WshShell = New-Object -comObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut("$env:USERPROFILE\Desktop\NEXUS.lnk")
$Shortcut.TargetPath = "$PWD\lancer-nexus.bat"
$Shortcut.WorkingDirectory = $PWD
$Shortcut.WindowStyle = 1
$Shortcut.Description = "NEXUS - IA Locale Autonome"
$Shortcut.IconLocation = "shell32.dll,13"
$Shortcut.Save()

Write-Host "Raccourci NEXUS cree sur le bureau." -ForegroundColor Cyan
