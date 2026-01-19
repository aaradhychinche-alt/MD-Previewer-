
const BASE_URL = 'https://api.github.com';

export async function fetchRepoData(owner, repo, token = null) {
  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  try {
    // 1. Get repo info for default branch
    const repoRes = await fetch(`${BASE_URL}/repos/${owner}/${repo}`, { headers });
    if (repoRes.status === 404) throw new Error('Repository not found');
    if (repoRes.status === 403) throw new Error('API Rate limit exceeded or Private Repo (Sign in required)');
    if (!repoRes.ok) throw new Error('Failed to fetch repository details');
    
    const repoData = await repoRes.json();
    const branch = repoData.default_branch;

    // 2. Get the tree recursively
    const treeRes = await fetch(`${BASE_URL}/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`, { headers });
    if (!treeRes.ok) throw new Error('Failed to fetch file tree');
    
    const treeData = await treeRes.json();
    
    // 3. Filter and sort .md files
    const mdFiles = treeData.tree
      .filter(node => node.path.endsWith('.md') && node.type === 'blob')
      .map(node => ({
        path: node.path,
        url: node.url, // API blob url
        // Use API contents URL to avoid CORS issues and enable auth for private repos
        rawUrl: `https://api.github.com/repos/${owner}/${repo}/contents/${node.path.split('/').map(encodeURIComponent).join('/')}?ref=${branch}`
      }));
      
    return { files: mdFiles, branch };
  } catch (err) {
    throw err;
  }
}

export async function fetchMarkdown(url, token = null) {
  const headers = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    'Accept': 'application/vnd.github.raw+json'
  };
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error('Failed to fetch markdown content');
  return await res.text();
}

export async function fetchUserForks(token) {
  if (!token) return [];
  const headers = { Authorization: `Bearer ${token}` };
  // Fetch up to 100 recently updated repos
  const res = await fetch(`${BASE_URL}/user/repos?sort=updated&per_page=100`, { headers });
  if (!res.ok) throw new Error('Failed to fetch forks');
  
  const repos = await res.json();
  // Filter for forks
  return repos.filter(repo => repo.fork).map(repo => ({
    full_name: repo.full_name,
    name: repo.name,
    owner: repo.owner.login
  }));
}
