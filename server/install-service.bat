@echo off
:: 관리자 권한 확인
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo 관리자 권한이 필요합니다!
    echo 이 파일을 우클릭하고 "관리자 권한으로 실행"을 선택하세요.
    pause
    exit /b 1
)

echo.
echo ========================================
echo   GeminiTalk 서버 자동 시작 설정
echo ========================================
echo.

:: 현재 경로 저장
set "SERVER_PATH=%~dp0"
set "NODE_PATH="

:: Node.js 경로 찾기
for /f "tokens=*" %%i in ('where node 2^>nul') do set "NODE_PATH=%%i"

if "%NODE_PATH%"=="" (
    echo [오류] Node.js가 설치되어 있지 않습니다!
    echo https://nodejs.org 에서 설치해주세요.
    pause
    exit /b 1
)

echo Node.js 경로: %NODE_PATH%
echo 서버 경로: %SERVER_PATH%
echo.

:: 기존 작업 삭제 (있을 경우)
schtasks /delete /tn "GeminiTalkServer" /f >nul 2>&1

:: 작업 스케줄러에 등록 (PC 시작 시 자동 실행)
schtasks /create /tn "GeminiTalkServer" /tr "cmd /c cd /d \"%SERVER_PATH%\" && node index.js" /sc onstart /ru SYSTEM /rl HIGHEST /f

if %errorLevel% equ 0 (
    echo.
    echo ========================================
    echo   [성공] 자동 시작 설정 완료!
    echo ========================================
    echo.
    echo PC를 재부팅하면 서버가 자동으로 시작됩니다.
    echo.
    echo 수동으로 시작하려면: start-server.bat 실행
    echo 설정 제거하려면: uninstall-service.bat 실행
    echo.
) else (
    echo.
    echo [오류] 설정에 실패했습니다.
    echo.
)

pause


