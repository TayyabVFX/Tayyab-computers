# Self-elevate the script to run as Administrator
if (!([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Start-Process powershell -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`"" -Verb RunAs
    exit
}

try {
    # Remove old rule if exists to avoid duplicates
    Remove-NetFirewallRule -DisplayName "TayyabStore Web Server" -ErrorAction SilentlyContinue
    
    # Add the new inbound rule
    New-NetFirewallRule -DisplayName "TayyabStore Web Server" -Direction Inbound -Action Allow -Protocol TCP -LocalPort 8000
    
    Write-Host ""
    Write-Host "=================================================="
    Write-Host " SUCCESS: Windows Firewall Rule Added Successfully! "
    Write-Host "=================================================="
    Write-Host "Your other laptop and devices on the same Wi-Fi"
    Write-Host "can now access the site at: http://192.168.100.33:8000"
    Write-Host ""
} catch {
    Write-Error "Failed to add firewall rule: $_"
}

Write-Host "Press any key to close this window..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
