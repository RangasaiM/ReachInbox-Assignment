import type { EmailSearchResponse, AccountsResponse } from '../types/email';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export async function fetchAccounts(): Promise<string[]> {
  const response = await fetch(`${API_URL}/api/accounts`);
  if (!response.ok) throw new Error('Failed to fetch accounts');
  const data: AccountsResponse = await response.json();
  return data.accounts;
}

export async function fetchEmails(page: number = 1, pageSize: number = 20): Promise<EmailSearchResponse> {
  const response = await fetch(`${API_URL}/api/emails?page=${page}&pageSize=${pageSize}`);
  if (!response.ok) throw new Error('Failed to fetch emails');
  return response.json();
}

export interface SearchParams {
  query?: string;
  account?: string;
  folder?: string;
  page?: number;
  pageSize?: number;
}

export async function searchEmails(params: SearchParams): Promise<EmailSearchResponse> {
  const searchParams = new URLSearchParams();
  
  if (params.query) searchParams.append('q', params.query);
  if (params.account) searchParams.append('account', params.account);
  if (params.folder) searchParams.append('folder', params.folder);
  if (params.page) searchParams.append('page', params.page.toString());
  if (params.pageSize) searchParams.append('pageSize', params.pageSize.toString());

  const response = await fetch(`${API_URL}/api/emails/search?${searchParams}`);
  if (!response.ok) throw new Error('Failed to search emails');
  return response.json();
}
