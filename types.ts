
export enum Role {
  USER = 'user',
  MODEL = 'model'
}

export interface Message {
  id: string;
  role: Role;
  text: string;
  timestamp: Date;
  isError?: boolean;
  senderName?: string;
}

export interface Persona {
  id: string;
  name: string;
  avatar: string;
  description: string;
  systemInstruction: string;
  lastMessage?: string;
  lastMessageTime?: Date;
  unreadCount?: number;
}

export interface ChatSession {
  personaId: string;
  messages: Message[];
}

export interface User {
  id: string;
  username: string;
  name: string;
  avatar: string;
  statusMessage?: string;
  gender?: string;
  age?: number;
  nationality?: string;
}

export interface Task {
  id: string;
  text: string;
  completed: boolean;
  timestamp: Date;
}
