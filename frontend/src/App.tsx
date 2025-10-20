import { useState, useEffect } from 'react';
import type { Email, EmailSearchResponse } from './types/email';
import { fetchAccounts, searchEmails, suggestReply, type SuggestedReplyResponse } from './services/api';
import './App.css';

function App() {
  const [emails, setEmails] = useState<Email[]>([]);
  const [accounts, setAccounts] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [suggestedReply, setSuggestedReply] = useState<SuggestedReplyResponse | null>(null);
  const [loadingReply, setLoadingReply] = useState(false);
  const [replyError, setReplyError] = useState<string | null>(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAccount, setSelectedAccount] = useState('');
  const [selectedFolder, setSelectedFolder] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
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
        category: selectedCategory || undefined,
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
  }, [currentPage, selectedAccount, selectedFolder, selectedCategory, searchQuery]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
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

  const handleEmailClick = (email: Email) => {
    setSelectedEmail(email);
  };

  const closeEmailModal = () => {
    setSelectedEmail(null);
    setSuggestedReply(null);
    setReplyError(null);
  };

  const handleSuggestReply = async () => {
    if (!selectedEmail) return;
    
    setLoadingReply(true);
    setReplyError(null);
    setSuggestedReply(null);
    
    try {
      const reply = await suggestReply(selectedEmail.id);
      setSuggestedReply(reply);
    } catch (err) {
      setReplyError(err instanceof Error ? err.message : 'Failed to generate reply suggestion');
    } finally {
      setLoadingReply(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Reply copied to clipboard!');
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

            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setCurrentPage(1);
              }}
              className="filter-select"
            >
              <option value="">All Categories</option>
              <option value="Interested">Interested</option>
              <option value="Meeting Booked">Meeting Booked</option>
              <option value="Not Interested">Not Interested</option>
              <option value="Spam">Spam</option>
              <option value="Out of Office">Out of Office</option>
            </select>

            {(searchQuery || selectedAccount || selectedFolder || selectedCategory) && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedAccount('');
                  setSelectedFolder('');
                  setSelectedCategory('');
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
              <div 
                key={email.id} 
                className="email-card"
                onClick={() => handleEmailClick(email)}
              >
                <div className="email-header">
                  <div className="email-meta">
                    <span className="email-account">📧 {email.accountId}</span>
                    <span className="email-date">🕒 {formatDate(email.date)}</span>
                  </div>
                  {email.aiCategory && (
                    <span className={`category-tag ${getCategoryColor(email.aiCategory)}`}>
                      {email.aiCategory}
                    </span>
                  )}
                </div>
                <h3 className="email-subject">{email.subject || '(No Subject)'}</h3>
                <p className="email-body">{truncateText(email.body || '', 150)}</p>
                <div className="email-footer">
                  <span className="folder-tag">📁 {email.folder}</span>
                  <span className="read-more">Click to read →</span>
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

      {selectedEmail && (
        <div className="email-modal-overlay" onClick={closeEmailModal}>
          <div className="email-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selectedEmail.subject || '(No Subject)'}</h2>
              <button className="close-button" onClick={closeEmailModal}>✕</button>
            </div>
            <div className="modal-meta">
              <div className="meta-row">
                <span className="meta-label">From:</span>
                <span className="meta-value">{selectedEmail.accountId}</span>
              </div>
              <div className="meta-row">
                <span className="meta-label">Date:</span>
                <span className="meta-value">{formatDate(selectedEmail.date)}</span>
              </div>
              <div className="meta-row">
                <span className="meta-label">Folder:</span>
                <span className="meta-value">{selectedEmail.folder}</span>
              </div>
              {selectedEmail.aiCategory && (
                <div className="meta-row">
                  <span className="meta-label">Category:</span>
                  <span className={`category-tag ${getCategoryColor(selectedEmail.aiCategory)}`}>
                    {selectedEmail.aiCategory}
                  </span>
                </div>
              )}
            </div>
            <div className="modal-body">
              <h3>Email Content</h3>
              <div className="email-content">
                {selectedEmail.body || 'No content available'}
              </div>
            </div>

            <div className="modal-actions">
              <button
                className="suggest-reply-button"
                onClick={handleSuggestReply}
                disabled={loadingReply}
              >
                {loadingReply ? '✨ Generating...' : '✨ Suggest Reply'}
              </button>
            </div>

            {replyError && (
              <div className="reply-error">
                <p>❌ {replyError}</p>
              </div>
            )}

            {suggestedReply && (
              <div className="suggested-reply-section">
                <div className="reply-header">
                  <h3>💡 AI-Suggested Reply</h3>
                  <span className="confidence-badge">
                    Confidence: {suggestedReply.confidence}
                  </span>
                </div>
                
                <div className="reply-content">
                  <div className="reply-text">
                    {suggestedReply.reply}
                  </div>
                  <button
                    className="copy-button"
                    onClick={() => copyToClipboard(suggestedReply.reply)}
                  >
                    📋 Copy Reply
                  </button>
                </div>

                {suggestedReply.context.length > 0 && (
                  <div className="context-section">
                    <h4>📚 Context Used:</h4>
                    <div className="context-items">
                      {suggestedReply.context.map((ctx, idx) => (
                        <div key={idx} className="context-item">
                          <div className="context-header">
                            <span className="context-category">{ctx.category}</span>
                            <span className="context-relevance">{ctx.relevance}</span>
                          </div>
                          <p className="context-text">{ctx.text.substring(0, 150)}...</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
