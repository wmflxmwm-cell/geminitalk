
import React, { useState, useEffect, useRef } from 'react';
import { MoreVertical, Phone, Video, ChevronLeft, CheckSquare, Square, Plus, Trash2, ClipboardList, Calendar } from 'lucide-react';
import { Sidebar } from './components/Sidebar';
import { ChatInput } from './components/ChatInput';
import { MessageBubble } from './components/MessageBubble';
import { Avatar } from './components/Avatar';
import { Login } from './components/Login';
import { translateMessage } from './services/geminiService';
import { 
  loginAPI, 
  getAllUsersAPI, 
  addUserAPI, 
  deleteUserAPI, 
  updatePasswordAPI,
  getUserMessagesAPI,
  saveMessageAPI,
  getUserTasksAPI,
  saveUserTasksAPI,
  getServerAddress
} from './services/apiService';
import { Message, Persona, Role, User, Task } from './types';
import { v4 as uuidv4 } from 'uuid';

// 초기 사용자 데이터 (서버 연결 실패 시 폴백용)
const FALLBACK_USERS: Record<string, User & { password: string }> = {
  'user': {
    id: 'user1',
    username: 'user',
    password: '1234',
    name: '김철수',
    avatar: 'https://picsum.photos/id/1012/200/200',
    statusMessage: '오늘도 화이팅! 💪',
    gender: 'male',
    age: 25,
    nationality: 'Korea'
  },
  'admin': {
    id: 'admin1',
    username: 'admin',
    password: '1234',
    name: '관리자',
    avatar: 'https://picsum.photos/id/1074/200/200',
    statusMessage: '시스템 관리 중 🛠️',
    gender: 'male',
    age: 30,
    nationality: 'Korea'
  },
};

// 사용자를 친구 목록 형태로 변환
const userToFriend = (user: User): Persona => ({
  id: user.id,
  name: user.name,
  avatar: user.avatar,
  description: user.statusMessage || '',
  systemInstruction: '',
  lastMessage: '',
  lastMessageTime: new Date(),
});

const App: React.FC = () => {
  // Auth State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoginLoading, setIsLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | undefined>();
  const [allUsers, setAllUsers] = useState<Record<string, User & { password: string }>>(FALLBACK_USERS);
  const [isServerConnected, setIsServerConnected] = useState(false);

  // Chat State - 실제 사용자 목록을 친구로 표시
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [activePersonaId, setActivePersonaId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Record<string, Message[]>>({});
  const [isChatLoading, setIsChatLoading] = useState(false);
  
  // Task State
  const [tasks, setTasks] = useState<Record<string, Task[]>>({});
  const [taskInput, setTaskInput] = useState('');
  
  // PWA Install State
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 서버에서 초기 데이터 로드
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        // 서버에서 사용자 목록 가져오기
        const users = await getAllUsersAPI();
        setAllUsers(users);
        setIsServerConnected(true);
        console.log('✅ 백엔드 서버 연결됨');
      } catch (error) {
        console.warn('⚠️ 백엔드 서버 연결 실패, 로컬 모드로 동작합니다.');
        setIsServerConnected(false);
      }
    };

    loadInitialData();

    // 세션 복구 (localStorage)
    const savedUser = localStorage.getItem('geminiTalkUser');
    if (savedUser) {
      setCurrentUser(JSON.parse(savedUser));
    }

    // PWA Install Event Listener
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  // 로그인 후 메시지 & 태스크 & 친구 목록 로드
  useEffect(() => {
    if (!currentUser) return;

    // 다른 사용자들을 친구 목록으로 표시
    const otherUsers = Object.values(allUsers)
      .filter(u => u.username !== currentUser.username)
      .map(u => userToFriend(u));
    setPersonas(otherUsers);

    if (!isServerConnected) return;

    const loadUserData = async () => {
      try {
        // 서버에서 메시지 로드
        const serverMessages = await getUserMessagesAPI(currentUser.id);
        if (Object.keys(serverMessages).length > 0) {
          setMessages(serverMessages);
        }

        // 서버에서 태스크 로드
        const serverTasks = await getUserTasksAPI(currentUser.id);
        if (Object.keys(serverTasks).length > 0) {
          setTasks(serverTasks);
        }
      } catch (error) {
        console.error('데이터 로드 실패:', error);
      }
    };

    loadUserData();
  }, [currentUser, isServerConnected, allUsers]);

  const handleLogin = async (username: string, password: string) => {
    setIsLoginLoading(true);
    setLoginError(undefined);

    try {
      // 서버 주소가 명시적으로 설정되어 있는지 확인
      const savedServerAddress = localStorage.getItem('geminiTalkServerAddress');
      const hasCustomServerAddress = savedServerAddress && savedServerAddress !== 'localhost:3001';
      
      // 서버 주소가 설정되어 있거나 서버가 연결되어 있으면 항상 서버로 로그인 시도
      if (hasCustomServerAddress || isServerConnected) {
        // 서버 API로 로그인 시도
        try {
          const result = await loginAPI(username, password);
          setCurrentUser(result.user);
          localStorage.setItem('geminiTalkUser', JSON.stringify(result.user));
          
          // 서버 연결 성공 시 사용자 목록도 다시 로드
          try {
            const users = await getAllUsersAPI();
            setAllUsers(users);
            setIsServerConnected(true);
          } catch (e) {
            console.warn('사용자 목록 로드 실패:', e);
          }
        } catch (serverError: any) {
          // 서버 로그인 실패 시 에러 표시
          const errorMsg = serverError.message || "서버에 연결할 수 없습니다.";
          if (hasCustomServerAddress) {
            throw new Error(`${errorMsg} 서버 주소(${savedServerAddress})를 확인하세요.`);
          } else {
            throw new Error(errorMsg);
          }
        }
      } else {
        // 서버 주소가 없고 서버 연결도 안 되어 있으면 로컬 데이터로 로그인
        await new Promise(resolve => setTimeout(resolve, 500));
        const user = allUsers[username];
        if (user && user.password === password) {
          const { password: _, ...safeUser } = user;
          setCurrentUser(safeUser);
          localStorage.setItem('geminiTalkUser', JSON.stringify(safeUser));
        } else {
          throw new Error("아이디 또는 비밀번호가 올바르지 않습니다.");
        }
      }
    } catch (error: any) {
      setLoginError(error.message || "로그인에 실패했습니다.");
    }
    setIsLoginLoading(false);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setActivePersonaId(null);
    setMessages({});
    chatInstances.current = {};
    localStorage.removeItem('geminiTalkUser');
  };

  const handleResetData = () => {
    localStorage.clear();
    setAllUsers(INITIAL_MOCK_USERS);
    handleLogout();
    window.location.reload();
  };

  const handleInstallPWA = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  // 관리자 기능: 사용자 추가
  const handleAddUser = async (newUser: User & { password: string }): Promise<boolean> => {
    if (allUsers[newUser.username]) {
      return false; // 이미 존재하는 아이디
    }

    try {
      if (isServerConnected) {
        await addUserAPI(newUser);
      }
      
      const updatedUsers = {
        ...allUsers,
        [newUser.username]: newUser
      };
      setAllUsers(updatedUsers);
      
      // 친구 목록에도 즉시 반영 (본인 제외)
      if (currentUser && newUser.username !== currentUser.username) {
        setPersonas(prev => [...prev, userToFriend(newUser)]);
      }
      
      return true;
    } catch (error) {
      console.error('사용자 추가 실패:', error);
      return false;
    }
  };

  // 관리자 기능: 사용자 삭제
  const handleDeleteUser = async (username: string) => {
    if (username === currentUser?.username) return; // 자기 자신 삭제 불가

    try {
      if (isServerConnected) {
        await deleteUserAPI(username);
      }
      
      const deletedUser = allUsers[username];
      const updatedUsers = { ...allUsers };
      delete updatedUsers[username];
      setAllUsers(updatedUsers);
      
      // 친구 목록에서도 즉시 제거
      if (deletedUser) {
        setPersonas(prev => prev.filter(p => p.id !== deletedUser.id));
      }
    } catch (error) {
      console.error('사용자 삭제 실패:', error);
    }
  };

  // 관리자 기능: 비밀번호 변경
  const handleUpdateUserPassword = async (username: string, newPw: string) => {
    if (!allUsers[username]) return;

    try {
      if (isServerConnected) {
        await updatePasswordAPI(username, newPw);
      }
      
      const updatedUsers = {
        ...allUsers,
        [username]: {
          ...allUsers[username],
          password: newPw
        }
      };
      setAllUsers(updatedUsers);
    } catch (error) {
      console.error('비밀번호 변경 실패:', error);
    }
  };

  const activePersona = activePersonaId ? personas.find(p => p.id === activePersonaId) : null;
  const currentMessages = activePersonaId ? (messages[activePersonaId] || []) : [];
  const currentTasks = activePersonaId ? (tasks[activePersonaId] || []) : [];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activePersonaId, isChatLoading]);

  const handleSelectPersona = (id: string) => {
    setActivePersonaId(id);
    if (!messages[id]) {
      setMessages(prev => ({ ...prev, [id]: [] }));
    }
  };

  const handleBackToStart = () => {
    setActivePersonaId(null);
  };

  const updatePersonaLastMessage = (id: string, text: string) => {
    setPersonas(prev => prev.map(p => {
      if (p.id === id) {
        return {
          ...p,
          lastMessage: text,
          lastMessageTime: new Date(),
        };
      }
      return p;
    }));
  };

  const handleSendMessage = async (text: string) => {
    if (!activePersonaId || !activePersona || !currentUser) return;

    // 상대방 정보 가져오기
    const targetUser = Object.values(allUsers).find(u => u.id === activePersonaId);
    
    // 번역 수행 (상대방 국적에 맞게)
    let translatedText = text;
    if (targetUser && targetUser.nationality !== currentUser.nationality) {
      setIsChatLoading(true);
      try {
        translatedText = await translateMessage({
          text: text,
          targetNationality: targetUser.nationality || 'Korea',
          targetGender: targetUser.gender || 'male',
          targetAge: targetUser.age || 25,
          senderName: currentUser.name
        });
      } catch (error) {
        console.error('번역 실패:', error);
      }
      setIsChatLoading(false);
    }

    const newMessage: Message = {
      id: uuidv4(),
      role: Role.USER,
      text: text,                    // 원본 (보낸 사람이 볼 내용)
      translatedText: translatedText, // 번역본 (받는 사람이 볼 내용)
      timestamp: new Date(),
      senderId: currentUser.id,
      senderName: currentUser.name,
    };

    setMessages(prev => ({
      ...prev,
      [activePersonaId]: [...(prev[activePersonaId] || []), newMessage]
    }));
    updatePersonaLastMessage(activePersonaId, text);

    // 서버에 메시지 저장 (서버에서 대화방 ID를 자동 생성)
    if (isServerConnected) {
      saveMessageAPI(currentUser.id, activePersonaId, newMessage).catch(console.error);
    }
  };

  // --- Task Management Logic ---
  const handleAddTask = () => {
    if (!activePersonaId || !taskInput.trim() || !currentUser) return;

    const newTask: Task = {
      id: uuidv4(),
      text: taskInput.trim(),
      completed: false,
      timestamp: new Date()
    };

    const updatedTasks = {
      ...tasks,
      [activePersonaId]: [...(tasks[activePersonaId] || []), newTask]
    };

    setTasks(updatedTasks);
    setTaskInput('');

    // 서버에 태스크 저장
    if (isServerConnected) {
      saveUserTasksAPI(currentUser.id, updatedTasks).catch(console.error);
    }
  };

  const handleToggleTask = (taskId: string) => {
    if (!activePersonaId || !currentUser) return;

    const updatedTasks = {
      ...tasks,
      [activePersonaId]: tasks[activePersonaId].map(t => 
        t.id === taskId ? { ...t, completed: !t.completed } : t
      )
    };
    
    setTasks(updatedTasks);

    // 서버에 태스크 저장
    if (isServerConnected) {
      saveUserTasksAPI(currentUser.id, updatedTasks).catch(console.error);
    }
  };

  const handleDeleteTask = (taskId: string) => {
    if (!activePersonaId || !currentUser) return;
    
    const updatedTasks = {
      ...tasks,
      [activePersonaId]: tasks[activePersonaId].filter(t => t.id !== taskId)
    };

    setTasks(updatedTasks);

    // 서버에 태스크 저장
    if (isServerConnected) {
      saveUserTasksAPI(currentUser.id, updatedTasks).catch(console.error);
    }
  };

  if (!currentUser) {
    return <Login onLogin={handleLogin} isLoading={isLoginLoading} error={loginError} isServerConnected={isServerConnected} />;
  }

  const isAdmin = currentUser.username === 'admin';

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar Area */}
      <div className={`
        w-full md:w-auto md:flex md:flex-shrink-0 bg-white z-20 border-r border-gray-200
        ${activePersonaId ? 'hidden md:flex' : 'flex'}
      `}>
        <Sidebar 
          personas={personas} 
          activePersonaId={activePersonaId} 
          onSelectPersona={handleSelectPersona}
          currentUser={currentUser}
          onLogout={handleLogout}
          onInstallPWA={handleInstallPWA}
          canInstallPWA={!!deferredPrompt}
          onResetData={handleResetData}
          isAdmin={isAdmin}
          onAddUser={handleAddUser}
          allUsers={allUsers}
          onDeleteUser={handleDeleteUser}
          onUpdateUserPassword={handleUpdateUserPassword}
        />
      </div>

      {/* Main Content Area (Chat + Tasks) */}
      <div className={`
        flex-1 flex flex-col min-w-0 bg-white h-full relative
        ${!activePersonaId ? 'hidden md:flex' : 'flex'}
      `}>
        {activePersona ? (
          <div className="flex h-full w-full">
            {/* Left Half: Chat Area (50%) */}
            <div className="w-full md:w-1/2 flex flex-col h-full border-r border-gray-200">
              {/* Chat Header */}
              <div className="h-16 px-4 md:px-6 border-b border-gray-100 flex items-center justify-between bg-white/90 backdrop-blur-md sticky top-0 z-20 shadow-sm flex-shrink-0">
                <div className="flex items-center">
                  <button 
                    onClick={handleBackToStart}
                    className="mr-2 md:hidden p-2 -ml-2 text-gray-500 hover:bg-gray-100 rounded-full"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                  <Avatar src={activePersona.avatar} alt={activePersona.name} size="sm" isOnline={true} />
                  <div className="ml-3">
                    <h2 className="text-base font-bold text-gray-900 leading-tight line-clamp-1">{activePersona.name}</h2>
                    <p className="text-xs text-green-500 font-medium">활동 중</p>
                  </div>
                </div>
                <div className="flex items-center space-x-1 text-primary-500">
                  <button className="p-2 hover:bg-primary-50 rounded-full transition-colors hidden sm:block">
                    <Phone className="w-5 h-5" />
                  </button>
                  <button className="p-2 hover:bg-primary-50 rounded-full transition-colors hidden sm:block">
                    <Video className="w-5 h-5" />
                  </button>
                  <button className="p-2 hover:bg-gray-100 text-gray-500 rounded-full transition-colors">
                    <MoreVertical className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-4 bg-[#b2c7da]/20">
                {currentMessages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-4">
                    <Avatar src={activePersona.avatar} alt={activePersona.name} size="xl" />
                    <p className="text-sm font-medium">{activePersona.name}님과 대화를 시작해보세요!</p>
                  </div>
                ) : (
                  <div className="space-y-4 max-w-3xl mx-auto pb-4">
                    {currentMessages.map((msg) => (
                      <MessageBubble key={msg.id} message={msg} currentUserId={currentUser?.id} />
                    ))}
                    {isChatLoading && (
                      <div className="flex w-full justify-start animate-pulse">
                        <div className="bg-white border border-gray-100 px-4 py-3 rounded-2xl rounded-tl-none shadow-sm flex space-x-1 items-center">
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>

              {/* Chat Input Area */}
              <div className="sticky bottom-0 z-20 flex-shrink-0">
                <ChatInput onSendMessage={handleSendMessage} isLoading={isChatLoading} />
              </div>
            </div>

            {/* Right Half: Task/Work Board (50%) - Hidden on mobile unless toggled (simplified for now to be hidden on mobile) */}
            <div className="hidden md:flex md:w-1/2 flex-col h-full bg-white relative">
              {/* Task Header */}
              <div className="h-16 px-6 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0 z-20">
                <div className="flex items-center gap-2 text-gray-800">
                  <ClipboardList className="w-5 h-5 text-primary-600" />
                  <h2 className="text-base font-bold">업무 공유 / 할 일</h2>
                </div>
                <div className="text-xs text-gray-400 font-medium bg-gray-100 px-3 py-1 rounded-full flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {new Date().toLocaleDateString()}
                </div>
              </div>

              {/* Task Content */}
              <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
                <div className="space-y-3">
                  {currentTasks.length === 0 ? (
                    <div className="text-center py-20 text-gray-400">
                      <div className="bg-white p-4 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-3 shadow-sm">
                        <ClipboardList className="w-8 h-8 text-gray-300" />
                      </div>
                      <p className="text-sm font-medium text-gray-500">등록된 업무가 없습니다.</p>
                      <p className="text-xs mt-1">아래 입력창을 통해 할 일을 추가하고 공유하세요.</p>
                    </div>
                  ) : (
                    currentTasks.map(task => (
                      <div 
                        key={task.id} 
                        className={`group flex items-start p-4 rounded-xl border transition-all duration-200 ${
                          task.completed 
                            ? 'bg-gray-100 border-gray-100 opacity-60' 
                            : 'bg-white border-gray-200 shadow-sm hover:shadow-md hover:border-primary-200'
                        }`}
                      >
                        <button 
                          onClick={() => handleToggleTask(task.id)}
                          className={`mt-0.5 flex-shrink-0 transition-colors ${
                            task.completed ? 'text-green-500' : 'text-gray-300 hover:text-primary-500'
                          }`}
                        >
                          {task.completed ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
                        </button>
                        
                        <div className="ml-3 flex-1 min-w-0">
                          <p className={`text-sm leading-relaxed ${task.completed ? 'text-gray-500 line-through' : 'text-gray-800 font-medium'}`}>
                            {task.text}
                          </p>
                          <p className="text-[10px] text-gray-400 mt-1">
                            {new Date(task.timestamp).toLocaleString()}
                          </p>
                        </div>

                        <button 
                          onClick={() => handleDeleteTask(task.id)}
                          className="ml-2 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Task Input Area */}
              <div className="p-4 bg-white border-t border-gray-100">
                <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-xl border border-gray-200 focus-within:border-primary-500 focus-within:ring-1 focus-within:ring-primary-500 transition-all">
                  <input
                    type="text"
                    value={taskInput}
                    onChange={(e) => setTaskInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
                    placeholder="새로운 업무를 입력하세요..."
                    className="flex-1 bg-transparent border-none focus:ring-0 text-sm py-2 px-2"
                  />
                  <button 
                    onClick={handleAddTask}
                    disabled={!taskInput.trim()}
                    className="p-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Empty State (Desktop only) */
          <div className="flex-1 flex flex-col items-center justify-center bg-gray-50 text-center p-8">
            <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mb-6 text-primary-500 animate-pulse">
               <span className="text-4xl">💬</span>
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">GeminiTalk</h2>
            <p className="text-gray-500 max-w-md">
              안녕하세요, {currentUser.name}님!<br/>
              왼쪽 목록에서 친구를 선택하여 대화를 시작하세요.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
