@echo off
setlocal
cd /d "%~dp0"
set "MINDMAP_LAUNCHER_PORT=5188"
start "" "http://127.0.0.1:%MINDMAP_LAUNCHER_PORT%/"
node launcher\server.js
endlocal

