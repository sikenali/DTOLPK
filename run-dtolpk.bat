@echo off
REM DTOLPK 启动脚本
REM 使用本地 Electron 二进制文件运行应用程序

echo 正在启动 DTOLPK...

REM 检查 node_modules 是否存在
if not exist "node_modules" (
    echo 错误: 未找到 node_modules 目录，请先运行 yarn install 或 npm install
    pause
    exit /b 1
)

REM 检查 electron.exe 是否存在
if not exist "node_modules\electron\dist\electron.exe" (
    echo 错误: 未找到 electron.exe 文件，请先运行 yarn install 或 npm install
    pause
    exit /b 1
)

REM 启动应用程序
node_modules\electron\dist\electron.exe main.js

REM 检查退出码
if %ERRORLEVEL% neq 0 (
    echo 应用程序异常退出，错误码: %ERRORLEVEL%
    pause
    exit /b %ERRORLEVEL%
)

