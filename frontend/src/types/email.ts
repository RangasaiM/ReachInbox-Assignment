export interface Email {
  id: string;
  subject: string;
  body: string;
  accountId: string;
  folder: string;
  aiCategory?: string;
  date: string;
  indexedAt: string;
}

export interface EmailSearchResponse {
  emails: Email[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface AccountsResponse {
  accounts: string[];
}
