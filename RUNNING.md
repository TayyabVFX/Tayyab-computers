Running the app locally
======================

If PowerShell blocks scripts (PSSecurityException), use one of these options:

- Run the included `run-dev.ps1` from PowerShell (right-click -> Run as Administrator if needed):

  powershell -File run-dev.ps1

- Or run `run-dev.cmd` from Command Prompt:

  run-dev.cmd

- Or manually run:

  npm install
  npm run dev

Troubleshooting tips
- If `npm install` fails, ensure Node.js (>=18) and npm are installed and on PATH.
- If PowerShell complains about execution policy, run this once from an elevated PowerShell:

  Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned -Force

- If the dev server starts but the frontend shows a connection error, check console logs in the terminal for stack traces and ensure nothing else is occupying port 3000.

Common fixes applied by the maintainer
- Added `run-dev.ps1` and `run-dev.cmd` convenience scripts to automate install + dev server start.
