@echo off
title BoutiqueStock - Serveur en cours...

:: Recuperer l'adresse IP WiFi automatiquement
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /i "IPv4" ^| findstr /v "10\." ^| findstr /v "169\."') do (
    set IP=%%a
)
set IP=%IP: =%

echo.
echo  ========================================
echo   BoutiqueStock - Serveur demarre !
echo  ========================================
echo.
echo  Acces depuis CE PC :
echo    http://localhost:3000
echo.
echo  Acces depuis telephone / tablette (meme WiFi) :
echo    http://%IP%:3000
echo.
echo  Acces par nom du PC (tous reseaux) :
echo    http://SAIB-LAPTOP:3000
echo.
echo  NE PAS fermer cette fenetre !
echo  ========================================
echo.
cd /d "C:\Users\KINGFLASH\Desktop\mon-app"
node server.js
pause
