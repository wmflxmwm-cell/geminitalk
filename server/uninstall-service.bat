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
echo   GeminiTalk 서버 자동 시작 제거
echo ========================================
echo.

schtasks /delete /tn "GeminiTalkServer" /f

if %errorLevel% equ 0 (
    echo.
    echo [성공] 자동 시작 설정이 제거되었습니다.
    echo.
) else (
    echo.
    echo [알림] 제거할 설정이 없습니다.
    echo.
)

pause



