@echo off
echo Installing dependencies...
npm install || (
  echo npm install failed. Please run this command manually.
  exit /b 1
)

echo Starting dev server...
npm run dev
