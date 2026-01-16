
const BASE_URL = 'https://api.github.com';

export async function fetchRepoData(owner, repo) {
  try {
    // 1. Get repo info for default branch
    const repoRes = await fetch(`${BASE_URL}/repos/${owner}/${repo}`);
    if (repoRes.status === 404) throw new Error('Repository not found');
    if (repoRes.status === 403) throw new Error('API Rate limit exceeded');
    if (!repoRes.ok) throw new Error('Failed to fetch repository details');
    
    const repoData = await repoRes.json();
    const branch = repoData.default_branch;

    // 2. Get the tree recursively
    const treeRes = await fetch(`${BASE_URL}/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`);
    if (!treeRes.ok) throw new Error('Failed to fetch file tree');
    
    const treeData = await treeRes.json();
    
    // 3. Filter and sort .md files
    const mdFiles = treeData.tree
      .filter(node => node.path.endsWith('.md') && node.type === 'blob')
      .map(node => ({
        path: node.path,
        url: node.url, // API blob url
        // Construct raw url for easier fetching likely
        rawUrl: `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${node.path}`
      }));
      
    return { files: mdFiles, branch };
  } catch (err) {
    throw err;
  }
}

export async function fetchMarkdown(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch markdown content');
  return await res.text();
}
