import { GoogleGenAI, Chat, Content } from "@google/genai";
import { Message, Role } from "../types";

// Initialize the Gemini API client
// Vite 환경변수 사용 (VITE_ 접두사 필요)
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';
const ai = new GoogleGenAI({ apiKey: API_KEY });

export const createChatSession = (systemInstruction: string) => {
  return ai.chats.create({
    model: 'gemini-2.5-flash',
    config: {
      systemInstruction: systemInstruction,
      temperature: 0.7,
    },
  });
};

export const sendMessageToGemini = async (
  chat: Chat, 
  message: string
): Promise<string> => {
  try {
    const response = await chat.sendMessage({ message });
    return response.text || "";
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};

export const formatHistoryForGemini = (messages: Message[]): Content[] => {
  return messages.map((msg) => ({
    role: msg.role === Role.USER ? 'user' : 'model',
    parts: [{ text: msg.text }],
  }));
};