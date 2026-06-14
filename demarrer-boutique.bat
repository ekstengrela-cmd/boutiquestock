@echo off
title BoutiqueStock - Serveur en cours...
echo.
echo  ========================================
echo   BoutiqueStock - Demarrage du serveur
echo  ========================================
echo.
echo  Votre application est accessible sur :
echo.
echo    Ce PC        : http://localhost:3000
echo    Reseau WiFi  : http://192.168.1.224:3000
echo.
echo  Partagez l'adresse WiFi avec vos vendeurs.
echo  NE PAS fermer cette fenetre !
echo.
cd /d "C:\Users\KINGFLASH\Desktop\mon-app"
node server.js
pause
