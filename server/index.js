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

  CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    personaId TEXT NOT NULL,
    role TEXT NOT NULL,
    text TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    senderName TEXT,
    isError INTEGER DEFAULT 0,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP
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

  CREATE INDEX IF NOT EXISTS idx_messages_user_persona ON messages(userId, personaId);
  CREATE INDEX IF NOT EXISTS idx_tasks_user_persona ON tasks(userId, personaId);
`);

// 초기 사용자 데이터 삽입 (없을 경우)
const insertUser = db.prepare(`
  INSERT OR IGNORE INTO users (username, id, password, name, avatar, statusMessage, gender, age, nationality)
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
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type']
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
  
  try {
    insertUser.run(username, id, password, name, avatar, statusMessage, gender, age, nationality);
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ success: false, message: '이미 존재하는 아이디입니다.' });
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

// 사용자의 모든 메시지 가져오기
app.get('/api/messages/:userId', (req, res) => {
  const { userId } = req.params;
  const messages = db.prepare(`
    SELECT * FROM messages WHERE userId = ? ORDER BY timestamp ASC
  `).all(userId);
  
  // personaId별로 그룹화
  const grouped = {};
  messages.forEach(msg => {
    if (!grouped[msg.personaId]) {
      grouped[msg.personaId] = [];
    }
    grouped[msg.personaId].push({
      id: msg.id,
      role: msg.role,
      text: msg.text,
      timestamp: msg.timestamp,
      senderName: msg.senderName,
      isError: !!msg.isError
    });
  });
  
  res.json(grouped);
});

// 메시지 저장
app.post('/api/messages/:userId/:personaId', (req, res) => {
  const { userId, personaId } = req.params;
  const { message } = req.body;
  
  const stmt = db.prepare(`
    INSERT INTO messages (id, userId, personaId, role, text, timestamp, senderName, isError)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  stmt.run(
    message.id,
    userId,
    personaId,
    message.role,
    message.text,
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
  
  const deleteStmt = db.prepare('DELETE FROM messages WHERE userId = ? AND personaId = ?');
  const insertStmt = db.prepare(`
    INSERT INTO messages (id, userId, personaId, role, text, timestamp, senderName, isError)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  const transaction = db.transaction(() => {
    deleteStmt.run(userId, personaId);
    for (const msg of messages) {
      insertStmt.run(
        msg.id,
        userId,
        personaId,
        msg.role,
        msg.text,
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
