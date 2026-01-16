'use client';

import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import RemarkGfm from 'remark-gfm';
import { FileText, Search, Github, AlertTriangle, Loader2, BookOpen, Sun, Moon, History, Trash2, ArrowLeft } from 'lucide-react';
import { fetchRepoData, fetchMarkdown } from './lib/github';
import styles from './page.module.css';

export default function Home() {
  const [repoInput, setRepoInput] = useState('');
  const [currentRepo, setCurrentRepo] = useState(null); 
  const [selectedFile, setSelectedFile] = useState(null); 
  const [loading, setLoading] = useState(false); 
  const [fileLoading, setFileLoading] = useState(false); 
  const [error, setError] = useState(null);
  const [theme, setTheme] = useState('dark');
  
  // History State
  const [recentRepos, setRecentRepos] = useState([]);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    // Check system preference or default to dark
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.setAttribute('data-theme', savedTheme);
    } else {
      document.documentElement.setAttribute('data-theme', 'dark');
    }

    // Load recent repos
    try {
      const stored = localStorage.getItem('recentRepos');
      if (stored) {
        setRecentRepos(JSON.parse(stored));
      }
    } catch (e) {
      console.error("Failed to parse history", e);
    }

    // Check for last visited repo
    const lastRepo = localStorage.getItem('lastRepo');
    if (lastRepo) {
      setRepoInput(lastRepo);
      const [owner, repo] = lastRepo.split('/');
      if (owner && repo) {
        loadRepo(owner, repo, false); // Don't save to history on init to avoid dupes/reordering
      }
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
  };

  const addToHistory = (owner, repo) => {
    const fullName = `${owner}/${repo}`;
    const newHistory = [fullName, ...recentRepos.filter(r => r !== fullName)].slice(0, 10);
    setRecentRepos(newHistory);
    localStorage.setItem('recentRepos', JSON.stringify(newHistory));
    localStorage.setItem('lastRepo', fullName);
  };

  const clearHistory = () => {
    setRecentRepos([]);
    localStorage.removeItem('recentRepos');
  };

  const loadRepo = async (owner, repo, saveToHistory = true) => {
    setLoading(true);
    setError(null);
    setCurrentRepo(null);
    setSelectedFile(null);
    setShowHistory(false);
    
    try {
      const { files, branch } = await fetchRepoData(owner, repo);
      if (files.length === 0) {
        setError('No Markdown files found in this repository.');
        setCurrentRepo({ owner, repo, branch, full_name: `${owner}/${repo}`, files: [] });
      } else {
        setCurrentRepo({ owner, repo, branch, full_name: `${owner}/${repo}`, files });
        if (saveToHistory) {
          addToHistory(owner, repo);
        }
      }
    } catch (err) {
      console.error(err);
      setError(err.message === 'Failed to fetch' ? 'Network error. check your connection.' : err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!repoInput.trim()) return;

    // Parse owner/repo
    const parts = repoInput.split('/').filter(Boolean);
    if (parts.length < 2) {
      setError('Please use the format "owner/repo" inside the search box');
      return;
    }
    const [owner, repo] = parts.slice(-2); 
    setRepoInput('');
    loadRepo(owner, repo);
  };

  const handleHistoryClick = (fullName) => {
    setRepoInput(fullName);
    const [owner, repo] = fullName.split('/');
    loadRepo(owner, repo);
  };

  const handleFileClick = async (file) => {
    if (selectedFile?.path === file.path) return;
    
    setFileLoading(true);
    try {
      const content = await fetchMarkdown(file.rawUrl);
      setSelectedFile({ ...file, content });
    } catch (err) {
      console.error(err);
      alert(`Failed to load file: ${err.message}`);
    } finally {
      setFileLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.brand}>
          <Github size={24} />
          <span>MD Previewer</span>
        </div>
        <form onSubmit={handleSearch} className={styles.searchForm}>
          <div className={styles.inputWrapper}>
            <Search className={styles.searchIcon} size={16} />
            <input 
              className={styles.input}
              placeholder="Add repo"
              value={repoInput}
              onChange={(e) => setRepoInput(e.target.value)}
            />
          </div>
          <button type="submit" className={styles.button} disabled={loading || !repoInput.trim()}>
            {loading ? <Loader2 className={styles.loading} size={16} /> : 'Load Repo'}
          </button>
        </form>
        <button 
          onClick={toggleTheme} 
          className={styles.iconBtn} 
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
          {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
        </button>
      </header>
      
      <main className={styles.main}>
        {/* Sidebar */}
        <aside className={styles.sidebar}>
          <div className={styles.sidebarHeader}>
             <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1}}>
                {showHistory ? 'Recent Repos' : (currentRepo ? currentRepo.full_name : 'Repositories')}
             </div>
             <div>
               {showHistory && (
                 <button onClick={() => setShowHistory(false)} className={styles.miniBtn} title="Back to Files">
                   <ArrowLeft size={14} />
                 </button>
               )}
               {!showHistory && (
                 <button onClick={() => setShowHistory(true)} className={styles.miniBtn} title="View History">
                   <History size={14} />
                 </button>
               )}
             </div>
          </div>
          
          {loading && (
             <div className={styles.loadingOverlay}>
               <Loader2 className={styles.loading} size={24} />
             </div>
          )}

          {!loading && error && (
            <div className={styles.errorBanner}>
              <AlertTriangle size={18} />
              <span>{error}</span>
            </div>
          )}
          
          {/* History View */}
          {!loading && showHistory && (
             <>
                <ul className={styles.fileList}>
                  {recentRepos.length === 0 ? (
                    <li className={styles.fileItem} style={{cursor: 'default', color: 'var(--text-muted)'}}>No history yet</li>
                  ) : (
                    recentRepos.map(repoName => (
                      <li key={repoName} className={styles.fileItem} onClick={() => handleHistoryClick(repoName)}>
                        <Github className={styles.fileIcon} size={14} />
                        <span>{repoName}</span>
                      </li>
                    ))
                  )}
                </ul>
                {recentRepos.length > 0 && (
                   <div style={{padding: '1rem', borderTop: '1px solid var(--border-color)'}}>
                      <button onClick={clearHistory} className={styles.textBtn} style={{color: 'var(--error)', width: '100%', justifyContent: 'center'}}>
                         <Trash2 size={14} /> Clear History
                      </button>
                   </div>
                )}
             </>
          )}

          {/* Files View */}
          {!loading && !showHistory && currentRepo && (
            <ul className={styles.fileList}>
              {currentRepo.files.map((file) => (
                <li 
                  key={file.path} 
                  className={`${styles.fileItem} ${selectedFile?.path === file.path ? styles.active : ''}`}
                  onClick={() => handleFileClick(file)}
                >
                  <FileText className={`${styles.fileIcon} ${selectedFile?.path === file.path ? styles.activeIcon : ''}`} />
                  <span>{file.path}</span>
                </li>
              ))}
              {currentRepo.files.length === 0 && !error && (
                <li className={styles.fileItem} style={{cursor: 'default'}}>No md files</li>
              )}
            </ul>
          )}
          
          {!loading && !showHistory && !currentRepo && !error && (
             <div className={styles.placeholderState}>
               <p>Enter a repository to start</p>
               {recentRepos.length > 0 && (
                 <button onClick={() => setShowHistory(true)} className={styles.textBtn}>
                   <History size={14} /> View History
                 </button>
               )}
             </div>
          )}
        </aside>

        {/* Content Preview */}
        <section className={styles.contentPane}>
          {fileLoading ? (
            <div className={styles.loadingOverlay} style={{height: '100%'}}>
              <Loader2 className={styles.loading} size={40} />
            </div>
          ) : selectedFile ? (
            <div className="animate-fade-in"> 
              <div className={styles.repoInfo}>
                 <div className={styles.fileName}>{selectedFile.path.split('/').pop()}</div>
                 <div className={styles.filePath}>{selectedFile.path}</div>
              </div>
              <article className="markdown-body">
                <ReactMarkdown remarkPlugins={[RemarkGfm]} components={{
                    img: (props) => {
                      let src = props.src;
                      if (src && !src.startsWith('http') && !src.startsWith('//') && currentRepo && selectedFile) {
                        const { owner, repo, branch } = currentRepo;
                        const filePath = selectedFile.path;
                        const dirPath = filePath.includes('/') ? filePath.substring(0, filePath.lastIndexOf('/')) : '';
                        
                        // Handle simple relative paths
                        const cleanSrc = src.startsWith('./') ? src.slice(2) : src;
                        // Determine base. Note: raw.githubusercontent handles '..' reasonably well usually, or we validly construct it.
                        // Ideally we'd use a URL constuctor but simple concat works for most md cases.
                        src = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${dirPath ? dirPath + '/' : ''}${cleanSrc}`;
                      }
                      return <img {...props} src={src} style={{maxWidth: '100%'}} />;
                    }
                }}>
                  {selectedFile.content}
                </ReactMarkdown>
              </article>
            </div>
          ) : (
            <div className={styles.placeholder}>
              <BookOpen size={64} opacity={0.5} />
              <p>Select a file to preview its content</p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
