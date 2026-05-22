try {
    # Temporarily set execution policy for this process only
    Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force -ErrorAction Stop
} catch {
    Write-Warning "Could not change execution policy for this process. You may need to run PowerShell as Administrator."
}

Write-Host "Installing dependencies..."
npm install

if ($LASTEXITCODE -ne 0) {
    Write-Error "npm install failed with exit code $LASTEXITCODE"
    exit $LASTEXITCODE
}

Write-Host "Starting dev server..."
npm run dev
