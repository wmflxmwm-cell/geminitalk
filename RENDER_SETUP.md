# Render 배포 설정 가이드

## 📋 Render에서 설정해야 할 환경 변수

Render 대시보드에서 다음 환경 변수들을 설정하세요:

### 1. Render 대시보드 접속
- https://dashboard.render.com 접속
- Static Site → `geminitalk` 선택

### 2. Environment Variables 설정
"Environment" 탭 클릭 → "Add Environment Variable" 클릭

#### 필수 환경 변수 2개:

**1. Gemini API 키 (AI 기능용)**
- **Name**: `VITE_GEMINI_API_KEY`
- **Value**: `여기에_본인의_Gemini_API_키_입력`
- **설명**: Google Gemini API 키 (https://aistudio.google.com/app/apikey 에서 발급)

**2. 백엔드 서버 주소 (데이터 저장용)**
- **Name**: `VITE_SERVER_ADDRESS`
- **Value**: `extemporary-nonaesthetically-layla.ngrok-free.dev` (또는 현재 ngrok 주소)
- **설명**: 백엔드 PC에서 실행 중인 ngrok 주소

### 3. 저장 및 재배포
- "Save Changes" 클릭
- 자동으로 재배포됩니다 (몇 분 소요)

---

## 🔄 ngrok 주소가 변경되면?

백엔드 PC에서 ngrok을 재시작하면 URL이 변경됩니다. 그럴 때:

1. 백엔드 PC에서 새 ngrok URL 확인
2. Render → Environment → `VITE_SERVER_ADDRESS` 값 업데이트
3. 자동 재배포됨

---

## ✅ 설정 확인

설정이 완료되면:
- 프론트엔드(Render)가 자동으로 백엔드 서버에 연결됩니다
- 사용자는 서버 주소를 수동으로 입력할 필요가 없습니다
- AI 번역 기능이 정상 작동합니다

