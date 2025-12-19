// 백엔드 서버 API 서비스

// 서버 주소 설정 (localStorage에서 가져오거나 기본값 사용)
const getApiBase = () => {
  const savedServer = localStorage.getItem('geminiTalkServerAddress');
  if (!savedServer) {
    // 환경 변수 확인
    const envServer = import.meta.env.VITE_SERVER_ADDRESS;
    if (envServer) {
      const baseUrl = envServer.startsWith('http') ? envServer : `https://${envServer}`;
      return `${baseUrl}/api`;
    }
    return 'http://localhost:3001/api';
  }
  
  // ngrok 등 전체 URL인 경우
  if (savedServer.includes('ngrok') || savedServer.startsWith('http')) {
    const baseUrl = savedServer.startsWith('http') ? savedServer : `https://${savedServer}`;
    return `${baseUrl}/api`;
  }
  
  return `http://${savedServer}/api`;
};

// ngrok 브라우저 경고 페이지 우회를 위한 헤더
const getHeaders = (includeContentType: boolean = true) => {
  const headers: HeadersInit = {};
  
  if (includeContentType) {
    headers['Content-Type'] = 'application/json';
  }
  
  // Accept 헤더는 항상 추가 (ngrok 호환성)
  headers['Accept'] = 'application/json';
  
  // ngrok-skip-browser-warning 헤더는 CORS preflight에서 문제를 일으킬 수 있으므로 제거
  // 대신 서버에서 ngrok 경고 페이지를 처리하도록 함
  
  return headers;
};

// 응답이 JSON인지 확인하고 파싱
const parseJSONResponse = async (res: Response) => {
  const contentType = res.headers.get('content-type');
  
  // HTML이 반환되면 ngrok 경고 페이지일 가능성
  if (contentType && contentType.includes('text/html')) {
    const text = await res.text();
    if (text.includes('<!DOCTYPE') || text.includes('<html')) {
      throw new Error('서버에 연결할 수 없습니다. ngrok 경고 페이지가 표시되었습니다.');
    }
  }
  
  // JSON 파싱 시도
  try {
    return await res.json();
  } catch (error) {
    // JSON이 아니면 에러
    throw new Error('서버 응답이 올바르지 않습니다.');
  }
};

// 서버 주소 저장
export const setServerAddress = (address: string) => {
  localStorage.setItem('geminiTalkServerAddress', address);
};

// 현재 서버 주소 가져오기
export const getServerAddress = () => {
  return localStorage.getItem('geminiTalkServerAddress') || 'localhost:3001';
};

// 서버 연결 테스트
export const testServerConnection = async (address: string): Promise<boolean> => {
  try {
    // ngrok 등 전체 URL인 경우
    let url: string;
    if (address.includes('ngrok') || address.startsWith('http')) {
      const baseUrl = address.startsWith('http') ? address : `https://${address}`;
      url = `${baseUrl}/api/health`;
    } else {
      url = `http://${address}/api/health`;
    }
    
    const res = await fetch(url, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(5000) // 5초 타임아웃
    });
    return res.ok;
  } catch {
    return false;
  }
};

// 서버 주소 자동 감지
export const autoDetectServerAddress = async (): Promise<string | null> => {
  // 이미 저장된 주소가 있으면 사용
  const savedAddress = localStorage.getItem('geminiTalkServerAddress');
  if (savedAddress && savedAddress !== 'localhost:3001') {
    // 저장된 주소가 유효한지 확인
    const isValid = await testServerConnection(savedAddress);
    if (isValid) {
      return savedAddress;
    }
  }

  // 환경 변수에서 서버 주소 가져오기 (Vite 환경 변수)
  const envServerAddress = import.meta.env.VITE_SERVER_ADDRESS;
  if (envServerAddress) {
    const isValid = await testServerConnection(envServerAddress);
    if (isValid) {
      setServerAddress(envServerAddress);
      return envServerAddress;
    }
  }

  // 자동 감지: 여러 가능한 주소 시도
  const candidates = [
    'localhost:3001',
    // 일반적인 로컬 네트워크 IP 범위는 시도하지 않음 (너무 많음)
  ];

  // 각 후보 주소를 시도
  for (const candidate of candidates) {
    try {
      const url = `http://${candidate}/api/server-info`;
      const res = await fetch(url, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(2000) // 2초 타임아웃
      });
      
      if (res.ok) {
        const data = await res.json();
        if (data.serverAddress) {
          // 서버가 반환한 주소 사용
          setServerAddress(data.serverAddress);
          return data.serverAddress;
        }
        // 서버가 주소를 반환하지 않으면 후보 주소 사용
        setServerAddress(candidate);
        return candidate;
      }
    } catch {
      // 다음 후보 시도
      continue;
    }
  }

  return null;
};

// ============ 인증 API ============

export const loginAPI = async (username: string, password: string) => {
  const res = await fetch(`${getApiBase()}/login`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ username, password }),
  });
  
  if (!res.ok) {
    const error = await parseJSONResponse(res).catch(() => ({ message: '로그인에 실패했습니다.' }));
    throw new Error(error.message || '로그인에 실패했습니다.');
  }
  
  return parseJSONResponse(res);
};

// ============ 사용자 API ============

export const getAllUsersAPI = async () => {
  const res = await fetch(`${getApiBase()}/users`, {
    headers: getHeaders(false), // GET 요청은 Content-Type 불필요
  });
  if (!res.ok) {
    throw new Error('사용자 목록을 불러올 수 없습니다.');
  }
  return parseJSONResponse(res);
};

export const addUserAPI = async (user: any) => {
  const res = await fetch(`${getApiBase()}/users`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(user),
  });
  
  if (!res.ok) {
    const error = await parseJSONResponse(res).catch(() => ({ message: '사용자 추가에 실패했습니다.' }));
    throw new Error(error.message || '사용자 추가에 실패했습니다.');
  }
  
  return parseJSONResponse(res);
};

export const deleteUserAPI = async (username: string) => {
  const res = await fetch(`${getApiBase()}/users/${username}`, {
    method: 'DELETE',
    headers: getHeaders(false), // DELETE 요청은 Content-Type 불필요
  });
  if (!res.ok) {
    throw new Error('사용자 삭제에 실패했습니다.');
  }
  return parseJSONResponse(res);
};

export const updatePasswordAPI = async (username: string, newPassword: string) => {
  const res = await fetch(`${getApiBase()}/users/${username}/password`, {
    method: 'PATCH',
    headers: getHeaders(),
    body: JSON.stringify({ newPassword }),
  });
  if (!res.ok) {
    throw new Error('비밀번호 변경에 실패했습니다.');
  }
  return parseJSONResponse(res);
};

// ============ 메시지 API ============

export const getUserMessagesAPI = async (userId: string) => {
  const res = await fetch(`${getApiBase()}/messages/${userId}`, {
    headers: getHeaders(false), // GET 요청은 Content-Type 불필요
  });
  if (!res.ok) {
    throw new Error('메시지를 불러올 수 없습니다.');
  }
  return parseJSONResponse(res);
};

export const getPersonaMessagesAPI = async (userId: string, personaId: string) => {
  const res = await fetch(`${getApiBase()}/messages/${userId}/${personaId}`, {
    headers: getHeaders(false), // GET 요청은 Content-Type 불필요
  });
  if (!res.ok) {
    throw new Error('메시지를 불러올 수 없습니다.');
  }
  return parseJSONResponse(res);
};

export const saveMessageAPI = async (userId: string, personaId: string, message: any) => {
  const res = await fetch(`${getApiBase()}/messages/${userId}/${personaId}`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ message }),
  });
  if (!res.ok) {
    throw new Error('메시지 저장에 실패했습니다.');
  }
  return parseJSONResponse(res);
};

export const saveAllMessagesAPI = async (userId: string, personaId: string, messages: any[]) => {
  const res = await fetch(`${getApiBase()}/messages/${userId}/${personaId}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify({ messages }),
  });
  if (!res.ok) {
    throw new Error('메시지 저장에 실패했습니다.');
  }
  return parseJSONResponse(res);
};

// ============ 태스크 API ============

export const getUserTasksAPI = async (userId: string) => {
  const res = await fetch(`${getApiBase()}/tasks/${userId}`, {
    headers: getHeaders(false), // GET 요청은 Content-Type 불필요
  });
  if (!res.ok) {
    throw new Error('태스크를 불러올 수 없습니다.');
  }
  return parseJSONResponse(res);
};

export const saveUserTasksAPI = async (userId: string, tasks: any) => {
  const res = await fetch(`${getApiBase()}/tasks/${userId}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify({ tasks }),
  });
  if (!res.ok) {
    throw new Error('태스크 저장에 실패했습니다.');
  }
  return parseJSONResponse(res);
};

