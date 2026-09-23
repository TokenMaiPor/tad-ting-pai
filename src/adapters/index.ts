import { chatgptAdapter } from './chatgpt';
import { claudeAdapter } from './claude';
import { geminiAdapter } from './gemini';
import type { SiteAdapter } from './types';

export const adapters: SiteAdapter[] = [chatgptAdapter, claudeAdapter, geminiAdapter];

export { adapterForHost, getInputText, setInputText } from './types';
export type { SiteAdapter } from './types';
