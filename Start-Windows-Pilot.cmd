@echo off
setlocal
node.exe "%~dp0windows\start-pilot.mjs"
if errorlevel 1 pause
