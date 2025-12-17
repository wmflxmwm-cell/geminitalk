# GeminiTalk 백엔드 서버

이 서버를 **남는 PC**에서 실행하면, 여러 PC/기기에서 GeminiTalk에 접속하여 대화를 저장하고 공유할 수 있습니다.

## 🖥️ 서버 설치 방법

### 1. Node.js 설치

먼저 서버 PC에 Node.js가 설치되어 있어야 합니다.

- [Node.js 다운로드](https://nodejs.org/) 에서 LTS 버전 설치

### 2. 서버 폴더 복사

이 `server` 폴더 전체를 서버 PC로 복사하세요.

```
server/
├── index.js
├── package.json
└── README.md
```

### 3. 패키지 설치

서버 PC에서 터미널(명령 프롬프트 또는 PowerShell)을 열고:

```bash
cd server
npm install
```

### 4. 서버 실행

```bash
npm start
```

성공하면 다음과 같이 표시됩니다:

```
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🚀 GeminiTalk 백엔드 서버 실행 중!                      ║
║                                                           ║
║   📍 로컬: http://localhost:3001                          ║
║   🌐 네트워크: http://<서버IP>:3001                        ║
║   💾 DB 경로: ...                                         ║
║                                                           ║
║   다른 PC에서 접속하려면 이 PC의 IP 주소를 사용하세요!    ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
```

---

## 🌐 서버 IP 주소 확인 방법

### Windows

1. `Win + R` → `cmd` 입력 → Enter
2. `ipconfig` 입력
3. **IPv4 주소** 확인 (예: `192.168.0.100`)

### Mac/Linux

```bash
ifconfig | grep inet
# 또는
ip addr | grep inet
```

---

## 📱 클라이언트에서 서버 연결

1. GeminiTalk 로그인 화면에서 우측 상단 **서버 설정** 버튼 클릭
2. 서버 주소 입력: `서버IP:3001` (예: `192.168.0.100:3001`)
3. **연결 테스트** 버튼으로 확인
4. **저장** 클릭

---

## 🔥 Windows 방화벽 설정

다른 PC에서 접속이 안 되면 방화벽에서 포트를 열어야 합니다.

### 방법 1: PowerShell (관리자 권한)

```powershell
New-NetFirewallRule -DisplayName "GeminiTalk Server" -Direction Inbound -Protocol TCP -LocalPort 3001 -Action Allow
```

### 방법 2: GUI

1. `Windows 보안` → `방화벽 및 네트워크 보호`
2. `고급 설정`
3. `인바운드 규칙` → `새 규칙`
4. `포트` 선택 → `TCP` → `특정 로컬 포트: 3001`
5. `연결 허용` → 완료

---

## 📂 데이터 저장 위치

모든 데이터는 `server/data/` 폴더에 저장됩니다:

```
server/data/
└── geminitalk.db    ← SQLite 데이터베이스 파일
```

이 파일을 백업하면 모든 대화 기록, 사용자 정보, 태스크가 보존됩니다.

---

## 🔄 서버 자동 시작 (선택)

Windows에서 PC 부팅 시 자동으로 서버 실행하려면:

### 방법 1: 시작 프로그램에 등록

1. `Win + R` → `shell:startup` 입력
2. 해당 폴더에 `.bat` 파일 생성:

```bat
@echo off
cd /d "C:\경로\server"
npm start
```

### 방법 2: PM2 사용 (권장)

```bash
npm install -g pm2
pm2 start index.js --name geminitalk-server
pm2 save
pm2 startup
```

---

## 🛠️ 문제 해결

### 서버가 시작되지 않음

```bash
# better-sqlite3 재설치
npm rebuild better-sqlite3
```

### CORS 오류

서버의 `index.js`에서 CORS 설정 확인:

```javascript
app.use(cors({
  origin: '*', // 모든 도메인 허용
}));
```

### 다른 PC에서 접속 불가

1. 서버 PC와 클라이언트 PC가 **같은 네트워크**(같은 공유기)에 있는지 확인
2. 방화벽에서 3001 포트가 열려있는지 확인
3. 서버 PC의 IP 주소가 정확한지 확인

---

## 📋 기본 계정

| 구분 | 아이디 | 비밀번호 |
|------|--------|----------|
| 사용자 | user | 1234 |
| 관리자 | admin | 1234 |

관리자 계정으로 로그인하면 새 사용자를 추가할 수 있습니다.

