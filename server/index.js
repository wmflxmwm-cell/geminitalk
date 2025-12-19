import express from 'express';
import cors from 'cors';
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;
const HOST = '0.0.0.0'; // 모든 네트워크 인터페이스에서 접근 허용

// 데이터베이스 초기화
const DB_PATH = path.join(__dirname, 'data', 'geminitalk.db');
import fs from 'fs';
if (!fs.existsSync(path.join(__dirname, 'data'))) {
  fs.mkdirSync(path.join(__dirname, 'data'), { recursive: true });
}

const db = new Database(DB_PATH);

// 테이블 생성
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    username TEXT PRIMARY KEY,
    id TEXT NOT NULL,
    password TEXT NOT NULL,
    name TEXT NOT NULL,
    avatar TEXT,
    statusMessage TEXT,
    gender TEXT,
    age INTEGER,
    nationality TEXT
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    personaId TEXT NOT NULL,
    text TEXT NOT NULL,
    completed INTEGER DEFAULT 0,
    timestamp TEXT NOT NULL,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_tasks_user_persona ON tasks(userId, personaId);
`);

// messages 테이블 마이그레이션 (새 스키마로)
try {
  // 기존 테이블 확인
  const tableInfo = db.prepare("PRAGMA table_info(messages)").all();
  const hasReceiverId = tableInfo.some(col => col.name === 'receiverId');
  
  if (!hasReceiverId) {
    // 기존 테이블이 있으면 삭제하고 새로 생성
    console.log('📦 메시지 테이블 마이그레이션 중...');
    db.exec('DROP TABLE IF EXISTS messages');
    db.exec(`
      CREATE TABLE messages (
        id TEXT PRIMARY KEY,
        chatRoomId TEXT NOT NULL,
        senderId TEXT NOT NULL,
        receiverId TEXT NOT NULL,
        role TEXT NOT NULL,
        text TEXT NOT NULL,
        translatedText TEXT,
        timestamp TEXT NOT NULL,
        senderName TEXT,
        isError INTEGER DEFAULT 0,
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX idx_messages_chatroom ON messages(chatRoomId);
      CREATE INDEX idx_messages_sender ON messages(senderId);
      CREATE INDEX idx_messages_receiver ON messages(receiverId);
    `);
    console.log('✅ 메시지 테이블 마이그레이션 완료');
  }
} catch (e) {
  // 테이블이 없는 경우 새로 생성
  db.exec(`
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      chatRoomId TEXT NOT NULL,
      senderId TEXT NOT NULL,
      receiverId TEXT NOT NULL,
      role TEXT NOT NULL,
      text TEXT NOT NULL,
      translatedText TEXT,
      timestamp TEXT NOT NULL,
      senderName TEXT,
      isError INTEGER DEFAULT 0,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_messages_chatroom ON messages(chatRoomId);
    CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(senderId);
    CREATE INDEX IF NOT EXISTS idx_messages_receiver ON messages(receiverId);
  `);
}

// 초기 사용자 데이터 삽입 (없을 경우)
const insertUser = db.prepare(`
  INSERT OR IGNORE INTO users (username, id, password, name, avatar, statusMessage, gender, age, nationality)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

// 사용자 추가용 (에러 발생)
const insertUserWithError = db.prepare(`
  INSERT INTO users (username, id, password, name, avatar, statusMessage, gender, age, nationality)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const existingUsers = db.prepare('SELECT COUNT(*) as count FROM users').get();
if (existingUsers.count === 0) {
  insertUser.run('admin', 'admin1', '1234', '관리자', 'https://picsum.photos/id/1074/200/200', '시스템 관리 중 🛠️', 'male', 30, 'Korea');
  console.log('✅ 관리자 계정 생성됨 (admin / 1234)');
}

// 미들웨어
app.use(cors({
  origin: '*', // 모든 도메인에서 접근 허용 (개발용)
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'ngrok-skip-browser-warning',
    'Accept',
    'X-Requested-With'
  ],
  credentials: false,
  preflightContinue: false,
  optionsSuccessStatus: 204
}));
app.use(express.json());

// 프론트엔드 정적 파일 서빙 (dist 폴더가 있으면)
const distPath = path.join(__dirname, 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
}

// 상태 확인 API
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 서버 정보 API (자동 주소 감지용)
app.get('/api/server-info', async (req, res) => {
  // 환경 변수에서 서버 주소 가져오기 (우선순위 1)
  const envServerAddress = process.env.SERVER_ADDRESS;
  
  // ngrok 로컬 API에서 터널 정보 가져오기 시도 (우선순위 2)
  let ngrokAddress = null;
  try {
    const ngrokResponse = await fetch('http://127.0.0.1:4040/api/tunnels');
    if (ngrokResponse.ok) {
      const ngrokData = await ngrokResponse.json();
      // 공개 URL 찾기
      const publicTunnel = ngrokData.tunnels?.find(t => t.proto === 'https' || t.proto === 'http');
      if (publicTunnel && publicTunnel.public_url) {
        // https://example.ngrok-free.dev -> example.ngrok-free.dev
        const url = new URL(publicTunnel.public_url);
        ngrokAddress = url.host;
      }
    }
  } catch (e) {
    // ngrok이 실행되지 않았거나 접근 불가
    console.log('ngrok 로컬 API 접근 실패 (정상일 수 있음)');
  }
  
  // 요청 헤더에서 호스트 정보 가져오기
  const host = req.get('host');
  const protocol = req.protocol || (req.get('x-forwarded-proto') || 'http');
  
  // Referer에서 주소 추출 시도
  const referer = req.get('referer');
  let serverAddress = null;
  
  if (envServerAddress) {
    // 환경 변수가 설정되어 있으면 사용
    serverAddress = envServerAddress;
  } else if (ngrokAddress) {
    // ngrok에서 자동 감지된 주소 사용
    serverAddress = ngrokAddress;
  } else if (referer) {
    // Referer에서 도메인 추출
    try {
      const url = new URL(referer);
      serverAddress = url.host;
    } catch (e) {
      // Referer 파싱 실패 시 host 사용
      serverAddress = host;
    }
  } else if (host) {
    // host 헤더 사용
    serverAddress = host;
  }
  
  res.json({ 
    serverAddress: serverAddress,
    protocol: protocol,
    host: host,
    timestamp: new Date().toISOString()
  });
});

// ============ 사용자 API ============

// 로그인
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  
  if (user && user.password === password) {
    const { password: _, ...safeUser } = user;
    res.json({ success: true, user: safeUser });
  } else {
    res.status(401).json({ success: false, message: '아이디 또는 비밀번호가 올바르지 않습니다.' });
  }
});

// 모든 사용자 목록
app.get('/api/users', (req, res) => {
  const users = db.prepare('SELECT * FROM users').all();
  const usersMap = {};
  users.forEach(user => {
    usersMap[user.username] = user;
  });
  res.json(usersMap);
});

// 사용자 추가
app.post('/api/users', (req, res) => {
  const { username, id, password, name, avatar, statusMessage, gender, age, nationality } = req.body;
  
  // 필수 필드 확인
  if (!username || !id || !password || !name) {
    return res.status(400).json({ success: false, message: '필수 필드가 누락되었습니다.' });
  }
  
  try {
    // 사용자 추가 시도
    insertUserWithError.run(username, id, password, name, avatar || null, statusMessage || null, gender || null, age || null, nationality || null);
    
    // 추가 성공 확인
    const addedUser = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
    if (addedUser) {
      console.log(`✅ 사용자 추가 성공: ${username}`);
      res.json({ success: true });
    } else {
      res.status(500).json({ success: false, message: '사용자 추가에 실패했습니다.' });
    }
  } catch (error) {
    // SQLite 에러 코드 19는 UNIQUE constraint violation
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE' || error.message.includes('UNIQUE constraint')) {
      console.error(`❌ 사용자 추가 실패 (중복): ${username}`, error);
      res.status(400).json({ success: false, message: '이미 존재하는 아이디입니다.' });
    } else {
      console.error(`❌ 사용자 추가 실패: ${username}`, error);
      res.status(500).json({ success: false, message: '사용자 추가 중 오류가 발생했습니다.' });
    }
  }
});

// 사용자 삭제
app.delete('/api/users/:username', (req, res) => {
  const { username } = req.params;
  db.prepare('DELETE FROM users WHERE username = ?').run(username);
  res.json({ success: true });
});

// 비밀번호 변경
app.patch('/api/users/:username/password', (req, res) => {
  const { username } = req.params;
  const { newPassword } = req.body;
  db.prepare('UPDATE users SET password = ? WHERE username = ?').run(newPassword, username);
  res.json({ success: true });
});

// ============ 메시지 API ============

// 대화방 ID 생성 함수 (두 사용자 ID를 정렬해서 조합)
const getChatRoomId = (id1, id2) => {
  return [id1, id2].sort().join('_');
};

// 사용자의 모든 메시지 가져오기 (해당 사용자가 보내거나 받은 모든 메시지)
app.get('/api/messages/:userId', (req, res) => {
  const { userId } = req.params;
  const messages = db.prepare(`
    SELECT * FROM messages WHERE senderId = ? OR receiverId = ? ORDER BY timestamp ASC
  `).all(userId, userId);
  
  // 대화 상대방별로 그룹화
  const grouped = {};
  messages.forEach(msg => {
    // 대화 상대방 ID 추출 (내가 보낸 거면 receiverId, 받은 거면 senderId)
    const personaId = msg.senderId === userId ? msg.receiverId : msg.senderId;
    
    if (!grouped[personaId]) {
      grouped[personaId] = [];
    }
    grouped[personaId].push({
      id: msg.id,
      role: msg.role,
      text: msg.text,
      translatedText: msg.translatedText,
      timestamp: msg.timestamp,
      senderId: msg.senderId,
      senderName: msg.senderName,
      isError: !!msg.isError
    });
  });
  
  res.json(grouped);
});

// 특정 대화방 메시지 가져오기
app.get('/api/messages/room/:chatRoomId', (req, res) => {
  const { chatRoomId } = req.params;
  const messages = db.prepare(`
    SELECT * FROM messages WHERE chatRoomId = ? ORDER BY timestamp ASC
  `).all(chatRoomId);
  
  res.json(messages.map(msg => ({
    id: msg.id,
    role: msg.role,
    text: msg.text,
    translatedText: msg.translatedText,
    timestamp: msg.timestamp,
    senderId: msg.senderId,
    receiverId: msg.receiverId,
    senderName: msg.senderName,
    isError: !!msg.isError
  })));
});

// 메시지 저장
app.post('/api/messages/:userId/:personaId', (req, res) => {
  const { userId, personaId } = req.params;
  const { message } = req.body;
  
  // 대화방 ID 생성
  const chatRoomId = getChatRoomId(userId, personaId);
  
  // senderId는 실제 보낸 사람, receiverId는 대화 상대방
  const senderId = message.senderId || userId;
  const receiverId = senderId === userId ? personaId : userId;
  
  const stmt = db.prepare(`
    INSERT INTO messages (id, chatRoomId, senderId, receiverId, role, text, translatedText, timestamp, senderName, isError)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  stmt.run(
    message.id,
    chatRoomId,
    senderId,
    receiverId,
    message.role,
    message.text,
    message.translatedText || message.text,
    message.timestamp,
    message.senderName || null,
    message.isError ? 1 : 0
  );
  
  res.json({ success: true });
});

// 대화 기록 전체 저장 (벌크)
app.put('/api/messages/:userId/:personaId', (req, res) => {
  const { userId, personaId } = req.params;
  const { messages } = req.body;
  
  const chatRoomId = getChatRoomId(userId, personaId);
  
  const deleteStmt = db.prepare('DELETE FROM messages WHERE chatRoomId = ?');
  const insertStmt = db.prepare(`
    INSERT INTO messages (id, chatRoomId, senderId, receiverId, role, text, translatedText, timestamp, senderName, isError)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  const transaction = db.transaction(() => {
    deleteStmt.run(chatRoomId);
    for (const msg of messages) {
      const senderId = msg.senderId || userId;
      const receiverId = senderId === userId ? personaId : userId;
      insertStmt.run(
        msg.id,
        chatRoomId,
        senderId,
        receiverId,
        msg.role,
        msg.text,
        msg.translatedText || msg.text,
        msg.timestamp,
        msg.senderName || null,
        msg.isError ? 1 : 0
      );
    }
  });
  
  transaction();
  res.json({ success: true });
});

// ============ 태스크 API ============

// 사용자의 모든 태스크 가져오기
app.get('/api/tasks/:userId', (req, res) => {
  const { userId } = req.params;
  const tasks = db.prepare('SELECT * FROM tasks WHERE userId = ? ORDER BY timestamp ASC').all(userId);
  
  // personaId별로 그룹화
  const grouped = {};
  tasks.forEach(task => {
    if (!grouped[task.personaId]) {
      grouped[task.personaId] = [];
    }
    grouped[task.personaId].push({
      id: task.id,
      text: task.text,
      completed: !!task.completed,
      timestamp: task.timestamp
    });
  });
  
  res.json(grouped);
});

// 태스크 저장/업데이트
app.put('/api/tasks/:userId', (req, res) => {
  const { userId } = req.params;
  const { tasks } = req.body; // { personaId: [task, task, ...], ... }
  
  const deleteStmt = db.prepare('DELETE FROM tasks WHERE userId = ?');
  const insertStmt = db.prepare(`
    INSERT INTO tasks (id, userId, personaId, text, completed, timestamp)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  
  const transaction = db.transaction(() => {
    deleteStmt.run(userId);
    for (const [personaId, taskList] of Object.entries(tasks)) {
      for (const task of taskList) {
        insertStmt.run(
          task.id,
          userId,
          personaId,
          task.text,
          task.completed ? 1 : 0,
          task.timestamp
        );
      }
    }
  });
  
  transaction();
  res.json({ success: true });
});

// 프론트엔드 SPA 라우팅 (API가 아닌 모든 요청은 index.html로)
if (fs.existsSync(distPath)) {
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(distPath, 'index.html'));
    }
  });
}

// 서버 시작
app.listen(PORT, HOST, () => {
  console.log('');
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║                                                           ║');
  console.log('║   🚀 GeminiTalk 백엔드 서버 실행 중!                      ║');
  console.log('║                                                           ║');
  console.log(`║   📍 로컬: http://localhost:${PORT}                          ║`);
  console.log(`║   🌐 네트워크: http://<서버IP>:${PORT}                        ║`);
  console.log(`║   💾 DB 경로: ${DB_PATH.substring(0, 35)}...  ║`);
  console.log('║                                                           ║');
  console.log('║   다른 PC에서 접속하려면 이 PC의 IP 주소를 사용하세요!    ║');
  console.log('║                                                           ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');
  console.log('');
});

// 종료 처리
process.on('SIGINT', () => {
  console.log('\n서버 종료 중...');
  db.close();
  process.exit(0);
});
