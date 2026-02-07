export interface Credential {
  id: string;
  key: string;
  value: string;
  appName: string;
  category?: string;
  createdAt: number;
}

export type ViewState = 'dashboard' | 'import' | 'export' | 'settings';

export interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

export interface SmartParseResult {
  key: string;
  value: string;
  appName?: string;
}