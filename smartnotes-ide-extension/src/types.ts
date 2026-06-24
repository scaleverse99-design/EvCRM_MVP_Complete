export interface SNote {
  id: string;
  created_at: string;
  updated_at: string;
  source_tool: string;
  session_url: string;
  title: string;
  summary: string;
  full_content: string;
  snippets: CodeSnippet[];
  tags: string[];
  entities: Entities;
  actions: ActionItem[];
  context_links: string[];
  pinned: boolean;
  format_ver: string;
  project_id?: string;
  duration_minutes?: number;
  attachments?: Attachment[];
}

export interface CodeSnippet {
  type: 'code';
  language: string;
  content: string;
}

export interface Entities {
  people: string[];
  companies: string[];
  projects: string[];
  deals: string[];
}

export interface ActionItem {
  id: string;
  text: string;
  due: string | null;
  done: boolean;
  snoozed: boolean;
  snoozeUntil: string | null;
  source_line?: string;
  snote_id?: string;
  snote_title?: string;
  source_tool?: string;
}

export interface Attachment {
  name: string;
  type: string;
  size: string;
}
