
import React, { useState, useEffect } from 'react';
import { Lock, User as UserIcon, Loader2, Server, Settings, Check, X, Wifi, WifiOff } from 'lucide-react';
import { getServerAddress, setServerAddress, testServerConnection } from '../services/apiService';

interface LoginProps {
  onLogin: (username: string, password: string) => Promise<void>;
  isLoading: boolean;
  error?: string;
  isServerConnected: boolean;
}

export const Login: React.FC<LoginProps> = ({ onLogin, isLoading, error, isServerConnected }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showServerSettings, setShowServerSettings] = useState(false);
  const [serverAddress, setServerAddressState] = useState('');
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionTestResult, setConnectionTestResult] = useState<boolean | null>(null);

  useEffect(() => {
    setServerAddressState(getServerAddress());
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (username && password) {
      await onLogin(username, password);
    }
  };

  const handleTestConnection = async () => {
    setIsTestingConnection(true);
    setConnectionTestResult(null);
    
    const result = await testServerConnection(serverAddress);
    setConnectionTestResult(result);
    setIsTestingConnection(false);
  };

  const handleSaveServerAddress = () => {
    setServerAddress(serverAddress);
    setShowServerSettings(false);
    window.location.reload(); // 서버 주소 변경 후 새로고침
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      {/* 서버 연결 상태 표시 */}
      <div className="absolute top-4 right-4 flex items-center gap-2">
        <button
          onClick={() => setShowServerSettings(!showServerSettings)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all hover:scale-105"
          style={{
            backgroundColor: isServerConnected ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
            color: isServerConnected ? '#22c55e' : '#ef4444'
          }}
        >
          {isServerConnected ? (
            <>
              <Wifi className="w-3.5 h-3.5" />
              서버 연결됨
            </>
          ) : (
            <>
              <WifiOff className="w-3.5 h-3.5" />
              서버 연결 안됨
            </>
          )}
          <Settings className="w-3.5 h-3.5 ml-1" />
        </button>
      </div>

      {/* 서버 설정 모달 */}
      {showServerSettings && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-2xl p-6 w-full max-w-md mx-4 border border-slate-700 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Server className="w-5 h-5 text-blue-400" />
                서버 설정
              </h3>
              <button
                onClick={() => setShowServerSettings(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  서버 주소 (IP:포트)
                </label>
                <input
                  type="text"
                  value={serverAddress}
                  onChange={(e) => {
                    setServerAddressState(e.target.value);
                    setConnectionTestResult(null);
                  }}
                  placeholder="예: 192.168.0.100:3001"
                  className="w-full px-4 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-slate-500 mt-1.5">
                  남는 PC(서버)의 IP 주소와 포트를 입력하세요
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleTestConnection}
                  disabled={isTestingConnection || !serverAddress}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded-lg transition-colors"
                >
                  {isTestingConnection ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      테스트 중...
                    </>
                  ) : (
                    <>
                      <Wifi className="w-4 h-4" />
                      연결 테스트
                    </>
                  )}
                </button>
                <button
                  onClick={handleSaveServerAddress}
                  disabled={!serverAddress}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded-lg transition-colors"
                >
                  <Check className="w-4 h-4" />
                  저장
                </button>
              </div>

              {connectionTestResult !== null && (
                <div className={`p-3 rounded-lg ${connectionTestResult ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                  {connectionTestResult ? (
                    <p className="text-sm flex items-center gap-2">
                      <Check className="w-4 h-4" />
                      서버 연결 성공!
                    </p>
                  ) : (
                    <p className="text-sm flex items-center gap-2">
                      <X className="w-4 h-4" />
                      서버에 연결할 수 없습니다. 주소를 확인하세요.
                    </p>
                  )}
                </div>
              )}

              <div className="bg-slate-900/50 rounded-lg p-3 text-xs text-slate-400">
                <p className="font-semibold text-slate-300 mb-1">💡 서버 설정 방법</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>남는 PC에 <code className="bg-slate-700 px-1 rounded">server</code> 폴더를 복사</li>
                  <li>해당 PC에서 <code className="bg-slate-700 px-1 rounded">npm install</code> 실행</li>
                  <li><code className="bg-slate-700 px-1 rounded">npm start</code>로 서버 시작</li>
                  <li>서버 PC의 IP 주소 확인 (예: 192.168.0.100)</li>
                  <li>위 입력창에 <code className="bg-slate-700 px-1 rounded">IP:3001</code> 형태로 입력</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30">
            <span className="text-4xl">💬</span>
          </div>
        </div>
        <h2 className="mt-2 text-center text-3xl font-extrabold text-white">
          GeminiTalk
        </h2>
        <p className="mt-2 text-center text-sm text-slate-400">
          관리자에게 발급받은 계정으로 접속하세요
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-slate-800/50 backdrop-blur-xl py-8 px-4 shadow-2xl sm:rounded-2xl sm:px-10 border border-slate-700">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-slate-300">
                아이디
              </label>
              <div className="mt-1 relative rounded-lg shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <UserIcon className="h-5 w-5 text-slate-500" aria-hidden="true" />
                </div>
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="아이디 입력"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-300">
                비밀번호
              </label>
              <div className="mt-1 relative rounded-lg shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-500" aria-hidden="true" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="비밀번호 입력"
                />
              </div>
            </div>

            {error && (
              <div className="rounded-lg bg-red-500/20 border border-red-500/30 p-4">
                <div className="flex items-center gap-2 text-red-400">
                  <X className="w-5 h-5 flex-shrink-0" />
                  <p className="text-sm">{error}</p>
                </div>
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-500/25"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                    로그인 중...
                  </>
                ) : (
                  '로그인'
                )}
              </button>
            </div>
          </form>

        </div>
      </div>
    </div>
  );
};
