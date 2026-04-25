@echo off
chcp 65001 >nul
title 오늘도 우쭈쭈 - 실행 중

echo.
echo  ╔══════════════════════════════════════╗
echo  ║       오늘도 우쭈쭈 실행 준비        ║
echo  ╚══════════════════════════════════════╝
echo.

REM Node.js 설치 확인
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [!] Node.js가 설치되어 있지 않습니다.
    echo     https://nodejs.org 에서 LTS 버전을 설치한 뒤 다시 실행해주세요.
    echo.
    pause
    exit /b 1
)

REM node_modules가 없으면 설치
if not exist "node_modules" (
    echo [1/2] 처음 실행이라 의존성을 설치합니다. 2~3분 소요...
    echo.
    call npm install
    if %errorlevel% neq 0 (
        echo.
        echo [!] 설치 실패. README.md를 확인해주세요.
        pause
        exit /b 1
    )
    echo.
    echo [✓] 설치 완료!
    echo.
)

echo [2/2] 서버를 시작합니다...
echo.
echo  ────────────────────────────────────────
echo   브라우저에서 자동으로 열립니다.
echo   종료하려면 이 창에서 Ctrl+C 를 누르세요.
echo  ────────────────────────────────────────
echo.

REM 3초 뒤 브라우저 열기 (서버가 뜰 시간 확보)
start "" cmd /c "timeout /t 3 >nul && start http://localhost:5173"

REM 서버 실행
call npm run dev
