import { GoogleGenAI } from "@google/genai";

// Initialize the Gemini API client
// Vite 환경변수 사용 (VITE_ 접두사 필요)
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';
const ai = new GoogleGenAI({ apiKey: API_KEY });

// 국적 → 언어 매핑
const nationalityToLanguage: Record<string, string> = {
  'Korea': '한국어',
  'USA': 'English',
  'Japan': '日本語',
  'China': '中文',
  'Vietnam': 'Tiếng Việt',
  'UK': 'English',
};

interface TranslateOptions {
  text: string;
  targetNationality: string;
  targetGender: string;
  targetAge: number;
  senderName: string;
}

// 메시지 번역 함수
export const translateMessage = async (options: TranslateOptions): Promise<string> => {
  const { text, targetNationality, targetGender, targetAge, senderName } = options;
  const targetLanguage = nationalityToLanguage[targetNationality] || 'English';
  
  const genderText = targetGender === 'male' ? '남성' : '여성';
  
  const prompt = `
You are a professional translator. Translate the following message naturally.

Original message from ${senderName}: "${text}"

Target language: ${targetLanguage}
Target recipient: ${targetAge}세 ${genderText}

Rules:
1. Translate naturally, not word-by-word
2. Use appropriate politeness level for the recipient's age
3. Keep the original meaning and emotion
4. If already in the target language, return as-is
5. Only return the translated text, nothing else

Translated message:`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash-exp',
      contents: prompt,
    });
    
    return response.text?.trim() || text;
  } catch (error) {
    console.error("Translation Error:", error);
    return text; // 번역 실패 시 원본 반환
  }
};

// 언어 감지 함수
export const detectLanguage = async (text: string): Promise<string> => {
  const prompt = `Detect the language of this text and return only the language name in English (e.g., "Korean", "Vietnamese", "English"): "${text}"`;
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash-exp',
      contents: prompt,
    });
    
    return response.text?.trim() || 'Unknown';
  } catch (error) {
    console.error("Language Detection Error:", error);
    return 'Unknown';
  }
};