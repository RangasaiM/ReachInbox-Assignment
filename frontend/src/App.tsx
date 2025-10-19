import { useState, useEffect } from 'react';
import type { Email, EmailSearchResponse } from './types/email';
import { fetchAccounts, searchEmails } from './services/api';
import './App.css';

function App() {
  const [emails, setEmails] = useState<Email[]>([]);
  const [accounts, setAccounts] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAccount, setSelectedAccount] = useState('');
  const [selectedFolder, setSelectedFolder] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const loadAccounts = async () => {
    try {
      const accountsList = await fetchAccounts();
      setAccounts(accountsList);
    } catch (err) {
      console.error('Error loading accounts:', err);
    }
  };

  const loadEmails = async () => {
    setLoading(true);
    setError(null);
    try {
      const response: EmailSearchResponse = await searchEmails({
        query: searchQuery || undefined,
        account: selectedAccount || undefined,
        folder: selectedFolder || undefined,
        page: currentPage,
        pageSize: 20
      });
      setEmails(response.emails);
      setTotalPages(response.totalPages);
      setTotal(response.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load emails');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAccounts();
  }, []);

  useEffect(() => {
    loadEmails();
  }, [currentPage, selectedAccount, selectedFolder]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    loadEmails();
  };

  const getCategoryColor = (category?: string) => {
    switch (category) {
      case 'Interested':
        return 'category-interested';
      case 'Meeting Booked':
        return 'category-meeting';
      case 'Not Interested':
        return 'category-not-interested';
      case 'Spam':
        return 'category-spam';
      case 'Out of Office':
        return 'category-ooo';
      default:
        return 'category-uncategorized';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <h1>ReachInbox Onebox</h1>
          <p className="header-subtitle">AI-Powered Email Management</p>
        </div>
      </header>

      <div className="container">
        <div className="controls-section">
          <form onSubmit={handleSearch} className="search-form">
            <input
              type="text"
              placeholder="Search emails..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
            <button type="submit" className="search-button">
              Search
            </button>
          </form>

          <div className="filters">
            <select
              value={selectedAccount}
              onChange={(e) => {
                setSelectedAccount(e.target.value);
                setCurrentPage(1);
              }}
              className="filter-select"
            >
              <option value="">All Accounts</option>
              {accounts.map((account) => (
                <option key={account} value={account}>
                  {account}
                </option>
              ))}
            </select>

            <select
              value={selectedFolder}
              onChange={(e) => {
                setSelectedFolder(e.target.value);
                setCurrentPage(1);
              }}
              className="filter-select"
            >
              <option value="">All Folders</option>
              <option value="INBOX">INBOX</option>
              <option value="Sent">Sent</option>
              <option value="Drafts">Drafts</option>
              <option value="Spam">Spam</option>
            </select>

            {(searchQuery || selectedAccount || selectedFolder) && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedAccount('');
                  setSelectedFolder('');
                  setCurrentPage(1);
                }}
                className="clear-filters"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>

        <div className="results-info">
          <p>{total} email{total !== 1 ? 's' : ''} found</p>
        </div>

        {loading && (
          <div className="loading">
            <div className="spinner"></div>
            <p>Loading emails...</p>
          </div>
        )}

        {error && (
          <div className="error">
            <p>{error}</p>
            <button onClick={loadEmails} className="retry-button">
              Retry
            </button>
          </div>
        )}

        {!loading && !error && emails.length === 0 && (
          <div className="empty-state">
            <svg className="empty-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <h2>No emails found</h2>
            <p>Try adjusting your search or filters</p>
          </div>
        )}

        {!loading && !error && emails.length > 0 && (
          <div className="email-list">
            {emails.map((email) => (
              <div key={email.id} className="email-card">
                <div className="email-header">
                  <div className="email-meta">
                    <span className="email-account">{email.accountId}</span>
                    <span className="email-date">{formatDate(email.date)}</span>
                  </div>
                  {email.aiCategory && (
                    <span className={`category-tag ${getCategoryColor(email.aiCategory)}`}>
                      {email.aiCategory}
                    </span>
                  )}
                </div>
                <h3 className="email-subject">{email.subject || '(No Subject)'}</h3>
                <p className="email-body">{truncateText(email.body || '', 200)}</p>
                <div className="email-footer">
                  <span className="folder-tag">{email.folder}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && !error && totalPages > 1 && (
          <div className="pagination">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="pagination-button"
            >
              Previous
            </button>
            <span className="pagination-info">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="pagination-button"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
