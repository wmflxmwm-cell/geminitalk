
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MoreVertical, Phone, Video, ChevronLeft, CheckSquare, Square, Plus, Trash2, ClipboardList, Calendar } from 'lucide-react';
import { Chat } from '@google/genai';
import { Sidebar } from './components/Sidebar';
import { ChatInput } from './components/ChatInput';
import { MessageBubble } from './components/MessageBubble';
import { Avatar } from './components/Avatar';
import { Login } from './components/Login';
import { createChatSession, sendMessageToGemini } from './services/geminiService';
import { 
  loginAPI, 
  getAllUsersAPI, 
  addUserAPI, 
  deleteUserAPI, 
  updatePasswordAPI,
  getUserMessagesAPI,
  saveMessageAPI,
  getUserTasksAPI,
  saveUserTasksAPI 
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

// Define initial personas
const INITIAL_PERSONAS: Persona[] = [
  {
    id: '1',
    name: '지민 (일상 친구)',
    avatar: 'https://picsum.photos/id/64/200/200',
    description: '편안하게 대화할 수 있는 다정한 친구',
    systemInstruction: '당신은 사용자의 친한 친구 "지민"입니다. 20대 중반의 여성으로 설정되어 있습니다. 항상 친절하고 공감능력이 뛰어나며, 이모티콘을 적절히 사용하여 따뜻한 말투를 사용합니다. 한국어로 대화합니다.',
    lastMessage: '오늘 하루는 어땠어? 😊',
    lastMessageTime: new Date(Date.now() - 1000 * 60 * 60 * 2),
  },
  {
    id: '2',
    name: 'Tech Guru (코딩 멘토)',
    avatar: 'https://picsum.photos/id/1/200/200',
    description: 'React, TypeScript 전문가',
    systemInstruction: '당신은 시니어 개발자 멘토 "Tech Guru"입니다. 전문적이고 간결하며 정확한 기술적 조언을 제공합니다. 사용자가 코드를 물어보면 최적화된 코드와 설명을 제공합니다. 한국어로 대화합니다.',
    lastMessage: '코드 리뷰가 필요하면 언제든 말해줘.',
    lastMessageTime: new Date(Date.now() - 1000 * 60 * 60 * 24),
  },
  {
    id: '3',
    name: '셰프 킴 (요리사)',
    avatar: 'https://picsum.photos/id/292/200/200',
    description: '오늘 뭐 먹지 고민 해결사',
    systemInstruction: '당신은 열정적인 요리사 "셰프 킴"입니다. 냉장고에 있는 재료로 만들 수 있는 최고의 레시피를 추천해줍니다. 말투는 활기차고 요리에 대한 사랑이 넘칩니다. 한국어로 대화합니다.',
    lastMessage: '배고프지 않아? 맛있는 거 해먹자!',
    lastMessageTime: new Date(Date.now() - 1000 * 60 * 60 * 5),
  },
];

const App: React.FC = () => {
  // Auth State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoginLoading, setIsLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | undefined>();
  const [allUsers, setAllUsers] = useState<Record<string, User & { password: string }>>(FALLBACK_USERS);
  const [isServerConnected, setIsServerConnected] = useState(false);

  // Chat State
  const [personas, setPersonas] = useState<Persona[]>(INITIAL_PERSONAS);
  const [activePersonaId, setActivePersonaId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Record<string, Message[]>>({});
  const [isChatLoading, setIsChatLoading] = useState(false);
  
  // Task State
  const [tasks, setTasks] = useState<Record<string, Task[]>>({});
  const [taskInput, setTaskInput] = useState('');
  
  // PWA Install State
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  const chatInstances = useRef<Record<string, Chat>>({});
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

  // 로그인 후 메시지 & 태스크 로드
  useEffect(() => {
    if (!currentUser || !isServerConnected) return;

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
  }, [currentUser, isServerConnected]);

  const handleLogin = async (username: string, password: string) => {
    setIsLoginLoading(true);
    setLoginError(undefined);

    try {
      if (isServerConnected) {
        // 서버 API로 로그인
        const result = await loginAPI(username, password);
        setCurrentUser(result.user);
        localStorage.setItem('geminiTalkUser', JSON.stringify(result.user));
      } else {
        // 폴백: 로컬 데이터로 로그인
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
      
      const updatedUsers = { ...allUsers };
      delete updatedUsers[username];
      setAllUsers(updatedUsers);
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

  const initializeChat = useCallback((persona: Persona) => {
    if (!chatInstances.current[persona.id]) {
      chatInstances.current[persona.id] = createChatSession(persona.systemInstruction);
    }
  }, []);

  const handleSelectPersona = (id: string) => {
    setActivePersonaId(id);
    const persona = personas.find(p => p.id === id);
    if (persona) {
      initializeChat(persona);
      if (!messages[id]) {
        setMessages(prev => ({ ...prev, [id]: [] }));
      }
    }
  };

  const handleCreateGroupChat = () => {
    const groupPersonaId = uuidv4();
    const groupName = "어벤져스 팀 (그룹)";
    const groupMembers = INITIAL_PERSONAS;
    
    const combinedSystemInstruction = `
      당신은 여러 AI 페르소나가 모인 그룹 채팅방의 중재자이자 참여자들입니다.
      상황에 따라 다음의 캐릭터들이 번갈아가며 대답해야 합니다:
      ${groupMembers.map(p => `- ${p.name}: ${p.description}`).join('\n')}
      
      사용자의 질문이 특정 캐릭터 전문 분야라면 그 캐릭터처럼 행동하여 대답하세요.
      대답할 때는 반드시 [캐릭터이름] 으로 시작하여 누가 말하는지 알려주세요.
      예: [지민] 안녕! 무슨 일이야?
    `;

    const newGroupPersona: Persona = {
      id: groupPersonaId,
      name: groupName,
      avatar: 'https://picsum.photos/id/10/200/200',
      description: `${groupMembers.length}명의 AI와 함께하는 대화`,
      systemInstruction: combinedSystemInstruction,
      lastMessage: '그룹 채팅방이 생성되었습니다.',
      lastMessageTime: new Date(),
    };

    setPersonas(prev => [newGroupPersona, ...prev]);
    setActivePersonaId(groupPersonaId);
    initializeChat(newGroupPersona);
    setMessages(prev => ({ ...prev, [groupPersonaId]: [] }));
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

    const newMessage: Message = {
      id: uuidv4(),
      role: Role.USER,
      text: text,
      timestamp: new Date(),
    };

    setMessages(prev => ({
      ...prev,
      [activePersonaId]: [...(prev[activePersonaId] || []), newMessage]
    }));
    updatePersonaLastMessage(activePersonaId, text);
    setIsChatLoading(true);

    // 서버에 사용자 메시지 저장
    if (isServerConnected) {
      saveMessageAPI(currentUser.id, activePersonaId, newMessage).catch(console.error);
    }

    try {
      const chat = chatInstances.current[activePersonaId];
      if (!chat) throw new Error("Chat session not initialized");

      const responseText = await sendMessageToGemini(chat, text);

      let senderName = undefined;
      let cleanText = responseText;
      
      const match = responseText.match(/^\[(.*?)\]\s*(.*)/s);
      if (match) {
        senderName = match[1];
        cleanText = match[2];
      }

      const aiMessage: Message = {
        id: uuidv4(),
        role: Role.MODEL,
        text: cleanText,
        timestamp: new Date(),
        senderName: senderName
      };

      setMessages(prev => ({
        ...prev,
        [activePersonaId]: [...(prev[activePersonaId] || []), aiMessage]
      }));
      updatePersonaLastMessage(activePersonaId, cleanText);

      // 서버에 AI 메시지 저장
      if (isServerConnected) {
        saveMessageAPI(currentUser.id, activePersonaId, aiMessage).catch(console.error);
      }

    } catch (error) {
      const errorMessage: Message = {
        id: uuidv4(),
        role: Role.MODEL,
        text: "죄송합니다. 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
        timestamp: new Date(),
        isError: true
      };
      setMessages(prev => ({
        ...prev,
        [activePersonaId]: [...(prev[activePersonaId] || []), errorMessage]
      }));
    } finally {
      setIsChatLoading(false);
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
          onCreateGroupChat={handleCreateGroupChat}
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
                      <MessageBubble key={msg.id} message={msg} />
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
