@echo off
echo ngrok 실행 상태 확인 중...
echo.

REM ngrok 로컬 API 확인
curl -s http://127.0.0.1:4040/api/tunnels > nul 2>&1
if %errorlevel% == 0 (
    echo ✅ ngrok이 실행 중입니다!
    echo.
    echo ngrok 정보:
    curl -s http://127.0.0.1:4040/api/tunnels | findstr "public_url"
    echo.
    echo 웹 인터페이스: http://127.0.0.1:4040
) else (
    echo ❌ ngrok이 실행되지 않았습니다.
    echo.
    echo ngrok을 실행하려면:
    echo   ngrok http 3001
)

pause


