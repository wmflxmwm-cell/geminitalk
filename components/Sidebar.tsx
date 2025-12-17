
import React, { useState } from 'react';
import { Persona, User as UserType } from '../types';
import { Avatar } from './Avatar';
import { Search, User, MessageCircle, Settings, LogOut, ChevronRight, UserPlus, X, Save, Trash2, Download, Users, KeyRound, AlertCircle } from 'lucide-react';

interface SidebarProps {
  personas: Persona[];
  activePersonaId: string | null;
  onSelectPersona: (id: string) => void;
  currentUser: UserType;
  onLogout: () => void;
  onInstallPWA: () => void;
  canInstallPWA: boolean;
  onResetData: () => void;
  isAdmin: boolean;
  onAddUser: (user: UserType & { password: string }) => Promise<boolean>;
  allUsers: Record<string, UserType & { password: string }>;
  onDeleteUser: (username: string) => void;
  onUpdateUserPassword: (username: string, newPw: string) => void;
}

type Tab = 'friends' | 'chats' | 'settings';

export const Sidebar: React.FC<SidebarProps> = ({ 
  personas, 
  activePersonaId, 
  onSelectPersona,
  currentUser,
  onLogout,
  onInstallPWA,
  canInstallPWA,
  onResetData,
  isAdmin,
  onAddUser,
  allUsers,
  onDeleteUser,
  onUpdateUserPassword
}) => {
  const [activeTab, setActiveTab] = useState<Tab>('friends');
  
  // Modals State
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [showManageUsersModal, setShowManageUsersModal] = useState(false);
  const [editingPasswordUser, setEditingPasswordUser] = useState<string | null>(null); // username of user being edited
  
  // Form States
  const [newUser, setNewUser] = useState({ 
    id: '', 
    password: '', 
    name: '', 
    username: '',
    gender: 'male',
    age: 20,
    nationality: 'Korea'
  });
  const [addUserError, setAddUserError] = useState('');
  const [newPasswordInput, setNewPasswordInput] = useState('');

  const handleAddUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.username || !newUser.password || !newUser.name) {
      setAddUserError('모든 필드를 입력해주세요.');
      return;
    }
    
    const success = await onAddUser({
      id: newUser.username,
      username: newUser.username,
      password: newUser.password,
      name: newUser.name,
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(newUser.name)}&background=random`,
      statusMessage: '안녕하세요! 신규 사용자입니다.',
      gender: newUser.gender,
      age: newUser.age,
      nationality: newUser.nationality
    });

    if (success) {
      setShowAddUserModal(false);
      setNewUser({ 
        id: '', 
        password: '', 
        name: '', 
        username: '',
        gender: 'male',
        age: 20,
        nationality: 'Korea'
      });
      setAddUserError('');
      alert('사용자가 성공적으로 생성되었습니다.');
    } else {
      setAddUserError('이미 존재하는 아이디입니다.');
    }
  };

  const handlePasswordChangeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingPasswordUser && newPasswordInput) {
      onUpdateUserPassword(editingPasswordUser, newPasswordInput);
      setEditingPasswordUser(null);
      setNewPasswordInput('');
      alert('비밀번호가 변경되었습니다.');
    }
  };

  const handleDeleteUserClick = (targetUsername: string) => {
    if (targetUsername === currentUser.username) {
      alert('현재 접속 중인 계정은 삭제할 수 없습니다.');
      return;
    }
    if (window.confirm(`정말 '${targetUsername}' 사용자를 삭제하시겠습니까?`)) {
      onDeleteUser(targetUsername);
    }
  };

  const renderFriendsTab = () => (
    <div className="flex-1 overflow-y-auto no-scrollbar">
      {/* My Profile */}
      <div className="px-5 py-4 border-b border-gray-100">
        <h3 className="text-xs font-semibold text-gray-400 mb-3">내 프로필</h3>
        <div className="flex items-center group cursor-pointer hover:bg-gray-50 p-2 -mx-2 rounded-xl transition-colors">
          <Avatar src={currentUser.avatar} alt={currentUser.name} size="lg" />
          <div className="ml-3">
            <p className="text-base font-bold text-gray-900 flex items-center">
              {currentUser.name}
              {isAdmin && <span className="ml-2 text-[10px] bg-primary-100 text-primary-600 px-1.5 py-0.5 rounded font-bold">ADMIN</span>}
            </p>
            <p className="text-xs text-gray-500 group-hover:text-primary-600 transition-colors">
              {currentUser.statusMessage || "상태 메시지를 입력하세요"}
            </p>
            {currentUser.nationality && (
              <p className="text-[10px] text-gray-400 mt-0.5">
                {currentUser.nationality} / {currentUser.age}세
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Friends List */}
      <div className="px-5 py-4">
        <h3 className="text-xs font-semibold text-gray-400 mb-3">친구 {personas.length}</h3>
        <div className="space-y-1">
          {personas.map((persona) => (
            <button
              key={persona.id}
              onClick={() => onSelectPersona(persona.id)}
              className="w-full flex items-center hover:bg-gray-50 rounded-xl p-2 -mx-2 transition-colors"
            >
              <Avatar src={persona.avatar} alt={persona.name} size="md" isOnline={true} />
              <div className="ml-3 text-left">
                <p className="text-sm font-bold text-gray-900">{persona.name}</p>
                <p className="text-xs text-gray-500 line-clamp-1">{persona.description}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  const renderChatsTab = () => (
    <div className="flex-1 overflow-y-auto no-scrollbar px-3 space-y-1 py-2">
      {personas.length === 0 ? (
        <div className="text-center py-10 text-gray-400">
          <p className="text-sm">아직 대화가 없습니다.</p>
          <p className="text-xs mt-1">친구 탭에서 대화를 시작하세요!</p>
        </div>
      ) : null}

      {personas.map((persona) => (
        <button
          key={persona.id}
          onClick={() => onSelectPersona(persona.id)}
          className={`w-full flex items-center p-3 rounded-xl transition-all duration-200 group ${
            activePersonaId === persona.id 
              ? 'bg-primary-50' 
              : 'hover:bg-gray-50'
          }`}
        >
          <div className="relative">
            <Avatar src={persona.avatar} alt={persona.name} size="md" isOnline={true} />
            {persona.unreadCount && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-white">
                {persona.unreadCount}
              </span>
            )}
          </div>
          <div className="ml-3 flex-1 text-left min-w-0">
            <div className="flex justify-between items-baseline mb-0.5">
              <span className={`text-sm font-bold truncate ${activePersonaId === persona.id ? 'text-primary-700' : 'text-gray-900'}`}>
                {persona.name}
              </span>
              {persona.lastMessageTime && (
                <span className="text-[10px] text-gray-400 flex-shrink-0 ml-2">
                  {persona.lastMessageTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </div>
            <p className={`text-xs truncate ${activePersonaId === persona.id ? 'text-primary-600/80' : 'text-gray-500 group-hover:text-gray-600'}`}>
              {persona.lastMessage || persona.description}
            </p>
          </div>
        </button>
      ))}
    </div>
  );

  const renderSettingsTab = () => (
    <div className="flex-1 overflow-y-auto no-scrollbar bg-gray-50 relative">
      <div className="bg-white p-5 mb-2 flex items-center">
        <Avatar src={currentUser.avatar} alt={currentUser.name} size="lg" />
        <div className="ml-3">
          <p className="text-lg font-bold text-gray-900 flex items-center gap-2">
            {currentUser.name}
            {isAdmin && <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded-full">ADMIN</span>}
          </p>
          <p className="text-xs text-gray-500">ID: {currentUser.username}</p>
        </div>
      </div>

      {/* Admin Only Section */}
      {isAdmin && (
        <div className="bg-white mb-2">
          <div className="px-4 py-3 border-b border-gray-50 text-xs font-bold text-gray-400 uppercase tracking-wider">
            관리자 메뉴
          </div>
          <button 
            onClick={() => setShowAddUserModal(true)}
            className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors border-b border-gray-50"
          >
            <div className="flex items-center text-primary-700">
              <UserPlus className="w-5 h-5 mr-3" />
              <span className="text-sm font-medium">신규 사용자 생성</span>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </button>
          <button 
            onClick={() => setShowManageUsersModal(true)}
            className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center text-gray-700">
              <Users className="w-5 h-5 mr-3" />
              <span className="text-sm font-medium">사용자 관리 (리스트/수정)</span>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </button>
        </div>
      )}

      {/* General Settings */}
      <div className="bg-white mb-2">
        <div className="px-4 py-3 border-b border-gray-50 text-xs font-bold text-gray-400 uppercase tracking-wider">
          앱 설정
        </div>
        {canInstallPWA && (
          <button 
            onClick={onInstallPWA}
            className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors border-b border-gray-50"
          >
             <div className="flex items-center text-gray-700">
              <Download className="w-5 h-5 mr-3" />
              <span className="text-sm">앱 설치하기</span>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </button>
        )}
        <button className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors border-b border-gray-50">
          <span className="text-sm text-gray-700">공지사항</span>
          <ChevronRight className="w-4 h-4 text-gray-400" />
        </button>
        <button className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
          <span className="text-sm text-gray-700">버전 정보</span>
          <span className="text-xs text-gray-400">v1.2.0</span>
        </button>
      </div>

      <div className="bg-white">
        <button 
          onClick={onLogout}
          className="w-full flex items-center p-4 hover:bg-red-50 transition-colors text-red-600 border-b border-gray-50"
        >
          <LogOut className="w-5 h-5 mr-3" />
          <span className="text-sm font-medium">로그아웃</span>
        </button>
        
        <button 
          onClick={() => {
            if(window.confirm('정말 모든 데이터를 삭제하고 초기화하시겠습니까? (로그인 정보 포함)')) {
              onResetData();
            }
          }}
          className="w-full flex items-center p-4 hover:bg-red-50 transition-colors text-gray-400 hover:text-red-500"
        >
          <Trash2 className="w-5 h-5 mr-3" />
          <span className="text-sm font-medium">데이터 초기화 및 계정 삭제</span>
        </button>
      </div>

      {/* Add User Modal Overlay */}
      {showAddUserModal && (
        <div className="absolute inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-xl overflow-hidden animate-fadeIn">
            <div className="bg-primary-600 px-4 py-3 flex justify-between items-center">
              <h3 className="text-white font-bold flex items-center gap-2">
                <UserPlus className="w-4 h-4" /> 신규 사용자 생성
              </h3>
              <button onClick={() => setShowAddUserModal(false)} className="text-white/80 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddUserSubmit} className="p-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">아이디 (로그인 ID)</label>
                <input 
                  type="text" 
                  value={newUser.username}
                  onChange={e => setNewUser({...newUser, username: e.target.value})}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                  placeholder="예: user2"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">비밀번호</label>
                <input 
                  type="password"
                  value={newUser.password}
                  onChange={e => setNewUser({...newUser, password: e.target.value})}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                  placeholder="비밀번호"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">이름 (표시명)</label>
                <input 
                  type="text" 
                  value={newUser.name}
                  onChange={e => setNewUser({...newUser, name: e.target.value})}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                  placeholder="예: 홍길동"
                />
              </div>

              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-bold text-gray-500 mb-1">성별</label>
                  <select 
                    value={newUser.gender}
                    onChange={e => setNewUser({...newUser, gender: e.target.value})}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                  >
                    <option value="male">남성</option>
                    <option value="female">여성</option>
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-bold text-gray-500 mb-1">나이</label>
                  <input 
                    type="number" 
                    value={newUser.age}
                    onChange={e => setNewUser({...newUser, age: parseInt(e.target.value) || 0})}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                    placeholder="20"
                    min="1"
                    max="120"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">국가 (Nationality)</label>
                <select 
                  value={newUser.nationality}
                  onChange={e => setNewUser({...newUser, nationality: e.target.value})}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                >
                  <option value="Korea">대한민국 (South Korea)</option>
                  <option value="USA">미국 (USA)</option>
                  <option value="Japan">일본 (Japan)</option>
                  <option value="China">중국 (China)</option>
                  <option value="Vietnam">베트남 (Vietnam)</option>
                  <option value="UK">영국 (UK)</option>
                </select>
              </div>
              
              {addUserError && (
                <p className="text-xs text-red-500 font-medium">{addUserError}</p>
              )}

              <button 
                type="submit"
                className="w-full bg-primary-600 hover:bg-primary-700 text-white py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-colors mt-2"
              >
                <Save className="w-4 h-4" /> 계정 생성하기
              </button>
            </form>
          </div>
        </div>
      )}

      {/* User Management List Modal */}
      {showManageUsersModal && (
        <div className="absolute inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
           <div className="bg-white w-full h-[90%] sm:h-auto sm:max-h-[80%] sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-xl overflow-hidden flex flex-col animate-slideUp sm:animate-fadeIn">
            <div className="bg-gray-800 px-4 py-3 flex justify-between items-center flex-shrink-0">
              <h3 className="text-white font-bold flex items-center gap-2">
                <Users className="w-4 h-4" /> 사용자 관리 ({Object.keys(allUsers).length})
              </h3>
              <button onClick={() => setShowManageUsersModal(false)} className="text-white/80 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {Object.values(allUsers).map((user: UserType & { password: string }) => (
                <div key={user.username} className="flex items-center justify-between p-3 border border-gray-100 rounded-xl bg-gray-50">
                  <div className="flex items-center overflow-hidden mr-2">
                    <Avatar src={user.avatar} alt={user.name} size="md" />
                    <div className="ml-3 min-w-0">
                      <p className="text-sm font-bold text-gray-900 truncate">
                        {user.name}
                        {user.username === 'admin' && <span className="ml-1 text-[10px] bg-blue-100 text-blue-600 px-1 rounded">ADMIN</span>}
                      </p>
                      <p className="text-xs text-gray-500 truncate">ID: {user.username}</p>
                      {user.nationality && (
                         <p className="text-[10px] text-gray-400 mt-0.5">{user.nationality}, {user.age}세</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex gap-1 flex-shrink-0">
                    <button 
                      onClick={() => setEditingPasswordUser(user.username)}
                      className="p-2 text-gray-500 hover:bg-white hover:text-primary-600 rounded-lg border border-transparent hover:border-gray-200 transition-all"
                      title="비밀번호 변경"
                    >
                      <KeyRound className="w-4 h-4" />
                    </button>
                    {user.username !== currentUser.username ? (
                      <button 
                        onClick={() => handleDeleteUserClick(user.username)}
                        className="p-2 text-gray-500 hover:bg-white hover:text-red-600 rounded-lg border border-transparent hover:border-gray-200 transition-all"
                        title="사용자 삭제"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    ) : (
                      <div className="w-8 h-8 flex items-center justify-center opacity-20">
                        <AlertCircle className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {editingPasswordUser && (
        <div className="absolute inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xs rounded-2xl shadow-2xl p-4 animate-fadeIn">
            <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-primary-600" /> 
              비밀번호 변경
              <span className="text-xs font-normal text-gray-500 ml-auto">{editingPasswordUser}</span>
            </h4>
            
            <form onSubmit={handlePasswordChangeSubmit}>
              <input 
                type="password" 
                autoFocus
                value={newPasswordInput}
                onChange={(e) => setNewPasswordInput(e.target.value)}
                placeholder="새로운 비밀번호 입력"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary-500 outline-none mb-4"
              />
              <div className="flex gap-2">
                <button 
                  type="button" 
                  onClick={() => {
                    setEditingPasswordUser(null);
                    setNewPasswordInput('');
                  }}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-gray-100 text-gray-600 hover:bg-gray-200"
                >
                  취소
                </button>
                <button 
                  type="submit"
                  disabled={!newPasswordInput}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50"
                >
                  변경 완료
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );

  return (
    <div className="flex flex-col h-full bg-white border-r border-gray-200 w-full md:w-80">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-10">
        <h1 className="text-xl font-bold text-gray-800">
          {activeTab === 'friends' ? '친구' : activeTab === 'chats' ? '채팅' : '설정'}
        </h1>
        <div className="flex gap-2">
          <button className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors">
            <Search className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Content */}
      {activeTab === 'friends' && renderFriendsTab()}
      {activeTab === 'chats' && renderChatsTab()}
      {activeTab === 'settings' && renderSettingsTab()}

      {/* Bottom Tab Navigation */}
      <div className="px-2 py-3 border-t border-gray-100 bg-gray-50/50 flex justify-around items-center">
        <button 
          onClick={() => setActiveTab('friends')}
          className={`p-2 rounded-xl flex flex-col items-center gap-1 transition-colors w-16 ${activeTab === 'friends' ? 'text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}
        >
          <User className={`w-6 h-6 ${activeTab === 'friends' ? 'fill-current' : ''}`} />
          <span className="text-[10px] font-medium">친구</span>
        </button>
        <button 
          onClick={() => setActiveTab('chats')}
          className={`p-2 rounded-xl flex flex-col items-center gap-1 transition-colors w-16 ${activeTab === 'chats' ? 'text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}
        >
          <MessageCircle className={`w-6 h-6 ${activeTab === 'chats' ? 'fill-current' : ''}`} />
          <span className="text-[10px] font-medium">채팅</span>
        </button>
        <button 
          onClick={() => setActiveTab('settings')}
          className={`p-2 rounded-xl flex flex-col items-center gap-1 transition-colors w-16 ${activeTab === 'settings' ? 'text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}
        >
          <Settings className={`w-6 h-6 ${activeTab === 'settings' ? 'fill-current' : ''}`} />
          <span className="text-[10px] font-medium">설정</span>
        </button>
      </div>
    </div>
  );
};
