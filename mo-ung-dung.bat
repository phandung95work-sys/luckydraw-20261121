@echo off
title Agribank IT Gala Night - Lucky Draw
cd /d "%~dp0"
echo ============================================================
echo   GALA NIGHT - NGAY HOI CONG NGHE THONG TIN AGRIBANK
echo   Dang khoi dong chuong trinh Lucky Draw...
echo ============================================================
start "" http://localhost:4173
npx vite preview --port 4173 --host
pause
