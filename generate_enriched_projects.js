
import fs from 'fs';
import https from 'https';

const GITHUB_TOKEN = process.env.GITHUB_TOKEN || readEnvToken();
const username = 'boydyngo';

// Helper to read token from .env file if not in process.env
function readEnvToken() {
    try {
        if (fs.existsSync('.env')) {
            const envConfig = fs.readFileSync('.env', 'utf8');
            const match = envConfig.match(/GITHUB_TOKEN=(.*)/);
            return match ? match[1].trim() : '';
        }
    } catch (e) {
        return '';
    }
    return '';
}

// Helper to make authenticated GitHub API requests
function githubRequest(path) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'api.github.com',
            path: path,
            method: 'GET',
            headers: {
                'User-Agent': 'PAS-AI-Fetcher',
                'Accept': 'application/vnd.github.v3+json',
                'Authorization': `token ${GITHUB_TOKEN}`
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                if (res.statusCode === 200) {
                    try {
                        resolve(JSON.parse(data));
                    } catch (e) {
                        resolve(null);
                    }
                } else {
                    resolve(null);
                }
            });
        });
        req.on('error', () => resolve(null));
        req.end();
    });
}

// Fetch languages/dev tools for a repo
async function getLanguages(owner, repo) {
    const data = await githubRequest(`/repos/${owner}/${repo}/languages`);
    return data ? Object.keys(data) : [];
}

// Fetch branches for a repo
async function getBranches(owner, repo) {
    const data = await githubRequest(`/repos/${owner}/${repo}/branches`);
    return data ? data.map(b => b.name) : [];
}

// Fetch commits (first and latest)
async function getCommitInfo(owner, repo) {
    // Get latest commit
    const latestCommits = await githubRequest(`/repos/${owner}/${repo}/commits?per_page=1`);
    let latestCommit = null;
    if (latestCommits && latestCommits.length > 0) {
        latestCommit = {
            date: latestCommits[0].commit.author.date,
            message: latestCommits[0].commit.message.split('\n')[0], // First line only
            author: latestCommits[0].commit.author.name
        };
    }

    // Get first commit (we need to paginate to the end)
    // Alternative: use the commits API with until parameter from repo creation
    const repoData = await githubRequest(`/repos/${owner}/${repo}`);
    let firstCommitDate = repoData ? repoData.created_at : null;

    return { latestCommit, firstCommitDate };
}

// Main project definitions with enhanced metadata
const projectDefinitions = {
    'Lumina': {
        category: 'Active',
        mvpStatus: 'Beta',
        description: 'AI-powered note-taking application featuring semantic search capabilities, smart writing assistance with context-aware suggestions, and modern hierarchical organization.',
        overview: 'Flagship product leveraging LLMs for real-time writing enhancement, automatic tagging, and cross-note linking through semantic embeddings.',
        nextStage: 'Implement collaborative editing and real-time sync between devices',
        nextUpdate: 'Add keyboard shortcuts and markdown export functionality',
        roadmap: ['v1.0 - Core AI search', 'v1.1 - Collaboration', 'v1.2 - Mobile app', 'v2.0 - Enterprise SSO'],
        aiAssessment: { feasibility: 'High', monetization: 'Very High - SaaS subscription model', notes: 'Prime commercialization candidate' }
    },
    'solar-tetris-flutter': {
        category: 'Active',
        mvpStatus: 'Alpha',
        description: '🎮 Planetary Block Blast - Space-themed puzzle game with drag-and-drop mechanics, multi-cell pieces, and stunning planetary visuals.',
        overview: 'Creative mobile game exploring Flutter\'s game dev capabilities with engaging casual gameplay.',
        nextStage: 'Implement leaderboard system and Google Play Games integration',
        nextUpdate: 'Add sound effects and haptic feedback',
        roadmap: ['Alpha - Core mechanics', 'Beta - Leaderboards', 'v1.0 - App Store', 'v1.1 - Multiplayer'],
        aiAssessment: { feasibility: 'High', monetization: 'Medium - Ad-supported with premium tier', notes: 'High engagement potential' }
    },
    'certbot-ssl-manager': {
        category: 'Active',
        mvpStatus: 'Production',
        description: 'Web-based SSL Certificate Management Interface for Certbot with automated renewals and multi-domain monitoring.',
        overview: 'Production tool simplifying SSL certificate lifecycle management for DevOps teams.',
        nextStage: 'Add Kubernetes operator for automated certificate injection',
        nextUpdate: 'Implement email alerting for expiring certificates',
        roadmap: ['v1.0 - Certificate management ✓', 'v1.1 - Multi-server', 'v1.2 - Alerting', 'v2.0 - K8s operator'],
        aiAssessment: { feasibility: 'Proven', monetization: 'Low - Open source utility', notes: 'Demonstrates infrastructure expertise' }
    },
    'flagfinder-dev': {
        category: 'Active',
        mvpStatus: 'Development',
        description: 'FlagFinder - Web application for flag-based searches and geopolitical analysis with visual recognition.',
        overview: 'Educational tool combining computer vision with world flags dataset.',
        nextStage: 'Integrate TensorFlow.js for client-side flag recognition',
        nextUpdate: 'Add historical flag timeline view',
        roadmap: ['MVP - Search & display', 'v1.0 - Image recognition', 'v1.1 - Timeline', 'v2.0 - AR identification'],
        aiAssessment: { feasibility: 'High', monetization: 'Low - Educational niche', notes: 'Good portfolio piece' }
    },
    'AISDEV': {
        category: 'Sandbox',
        mvpStatus: 'Prototype',
        description: 'AI development sandbox - collection of scripts, notebooks, and utilities for ML exploration.',
        overview: 'Personal laboratory for AI/ML experimentation and API integration tests.',
        nextStage: 'Document successful patterns into reusable library',
        nextUpdate: 'Add LangChain agent examples',
        roadmap: ['Ongoing research', 'Extract reusable components'],
        aiAssessment: { feasibility: 'High', monetization: 'None - Internal tooling', notes: 'Seeds ideas for production projects' }
    },
    'ai-ide': {
        category: 'Sandbox',
        mvpStatus: 'Concept',
        description: 'AI-assisted IDE exploration with code completion, intelligent refactoring, and contextual documentation.',
        overview: 'Research project investigating AI-enhanced developer experience within custom IDE shell.',
        nextStage: 'Evaluate build-vs-extend decision for existing IDE platforms',
        nextUpdate: 'Prototype AI code completion with local LLM',
        roadmap: ['Concept - Editor shell', 'Prototype - AI completion', 'Evaluate: Build vs extend'],
        aiAssessment: { feasibility: 'Medium', monetization: 'Uncertain - Crowded market', notes: 'Learning project for IDE internals' }
    },
    'Clipboard-Agent': {
        category: 'Sandbox',
        mvpStatus: 'Prototype',
        description: 'Intelligent clipboard monitoring with AI-powered transformations based on content type.',
        overview: 'Productivity automation using clipboard as trigger for AI workflows.',
        nextStage: 'Build macOS menubar app with system tray integration',
        nextUpdate: 'Add content type detection for images and code',
        roadmap: ['v0.1 - Monitoring', 'v0.2 - Content detection', 'v0.3 - AI pipeline'],
        aiAssessment: { feasibility: 'High', monetization: 'Low - Utility tool', notes: 'Cross-platform potential' }
    },
    'github-mcp-server': {
        category: 'Sandbox',
        mvpStatus: 'Prototype',
        description: 'Model Context Protocol server for GitHub - enables AI assistants to interact with repos, issues, and PRs.',
        overview: 'Infrastructure component bridging LLMs with GitHub APIs.',
        nextStage: 'Implement PR creation and code review capabilities',
        nextUpdate: 'Add issue management tools',
        roadmap: ['v0.1 - Read operations', 'v0.2 - Issue/PR management', 'v1.0 - Full API coverage'],
        aiAssessment: { feasibility: 'High', monetization: 'None - Open tooling', notes: 'Strategic AI infrastructure investment' }
    },
    'ai-config': {
        category: 'Sandbox',
        mvpStatus: 'Utility',
        description: 'Configuration management scripts for AI dev environments across multiple machines.',
        overview: 'DevOps automation ensuring consistent AI tool setup.',
        nextStage: 'Add cross-platform support for Linux environments',
        nextUpdate: 'Update for latest Claude and GPT model configurations',
        roadmap: ['Maintain as tooling evolves'],
        aiAssessment: { feasibility: 'Proven', monetization: 'None - Personal infrastructure', notes: 'Essential DevOps hygiene' }
    },
    'getty-samba-management': {
        category: 'Archived',
        mvpStatus: 'Production',
        description: 'Enterprise Samba server management for Getty infrastructure with web dashboard.',
        overview: 'Internal tool successfully deployed in production at Getty.',
        nextStage: 'Maintenance mode - security patches only',
        nextUpdate: 'No planned updates',
        roadmap: ['Maintenance mode'],
        aiAssessment: { feasibility: 'Proven', monetization: 'None - Internal tool', notes: 'Reference implementation' }
    },
    'TextAlchemy-Electron': {
        category: 'Archived',
        mvpStatus: 'Prototype',
        description: 'Desktop text transformation utility with case conversion, encoding, and formatting.',
        overview: 'Utility experiment superseded by web alternatives.',
        nextStage: 'No active development planned',
        nextUpdate: 'Archived',
        roadmap: ['Archived'],
        aiAssessment: { feasibility: 'Proven', monetization: 'None - Superseded', notes: 'Electron learning project' }
    },
    'clipmon': {
        category: 'Archived',
        mvpStatus: 'Prototype',
        description: 'Clipboard monitoring utility - predecessor to Clipboard-Agent.',
        overview: 'Early iteration evolved into Clipboard-Agent.',
        nextStage: 'Succeeded by Clipboard-Agent',
        nextUpdate: 'No updates - superseded',
        roadmap: ['Archived'],
        aiAssessment: { feasibility: 'Proven', monetization: 'None', notes: 'Code patterns reused in successor' }
    },
    'claude-dev-test': {
        category: 'Discontinued',
        mvpStatus: 'Test',
        description: 'Test repository for Claude AI integration experiments.',
        overview: 'Temporary test environment - purpose fulfilled.',
        nextStage: 'Consider deletion',
        nextUpdate: 'None',
        roadmap: [],
        aiAssessment: { feasibility: 'N/A', monetization: 'None', notes: 'Can be deleted' }
    },
    'claudedevworkspace': {
        category: 'Discontinued',
        mvpStatus: 'Test',
        description: 'Development workspace configuration for Claude coding sessions.',
        overview: 'Superseded by improved workflows.',
        nextStage: 'Consider deletion',
        nextUpdate: 'None',
        roadmap: [],
        aiAssessment: { feasibility: 'N/A', monetization: 'None', notes: 'Obsolete workspace' }
    },
    'myorator': {
        category: 'Active',
        mvpStatus: 'Development',
        description: 'Custom automation and orchestration tool for personal workflow management.',
        overview: 'Personal productivity automation platform.',
        nextStage: 'Implement webhook triggers',
        nextUpdate: 'Add API endpoint documentation',
        roadmap: ['MVP - Core automation', 'v1.0 - Webhooks', 'v1.1 - Dashboard'],
        aiAssessment: { feasibility: 'Medium', monetization: 'Low - Personal tool', notes: 'Internal productivity' }
    },
    'FlagFinder': {
        category: 'Archived',
        mvpStatus: 'Prototype',
        description: 'Original FlagFinder prototype - evolved into flagfinder-dev.',
        overview: 'Initial concept that led to active development version.',
        nextStage: 'Superseded by flagfinder-dev',
        nextUpdate: 'None',
        roadmap: ['Archived'],
        aiAssessment: { feasibility: 'N/A', monetization: 'None', notes: 'Predecessor to active project' }
    },
    'windows-search-tool': {
        category: 'Sandbox',
        mvpStatus: 'Prototype',
        description: 'Windows file search utility with advanced filtering and indexing capabilities.',
        overview: 'Experimental Windows-specific search enhancement.',
        nextStage: 'Evaluate viability vs native Windows Search',
        nextUpdate: 'Add file content indexing',
        roadmap: ['Prototype', 'Evaluate continuation'],
        aiAssessment: { feasibility: 'Medium', monetization: 'Low', notes: 'Platform-specific utility' }
    },
    'text-conversion-app': {
        category: 'Archived',
        mvpStatus: 'Prototype',
        description: 'Text format conversion web application.',
        overview: 'Simple utility for text transformations.',
        nextStage: 'Merged into TextAlchemy concepts',
        nextUpdate: 'None',
        roadmap: ['Archived'],
        aiAssessment: { feasibility: 'Proven', monetization: 'None', notes: 'Utility experiment' }
    },
    'text-conversion-tools': {
        category: 'Archived',
        mvpStatus: 'Prototype',
        description: 'CLI text conversion utilities collection.',
        overview: 'Command-line text processing tools.',
        nextStage: 'Archived',
        nextUpdate: 'None',
        roadmap: ['Archived'],
        aiAssessment: { feasibility: 'Proven', monetization: 'None', notes: 'CLI utilities' }
    },
    'brave-access-server': {
        category: 'Sandbox',
        mvpStatus: 'Prototype',
        description: 'Access server for Brave browser integrations and extensions.',
        overview: 'Custom server for browser extension backends.',
        nextStage: 'Evaluate MCP integration',
        nextUpdate: 'Add authentication layer',
        roadmap: ['Prototype', 'Security hardening'],
        aiAssessment: { feasibility: 'Medium', monetization: 'None', notes: 'Browser integration experiment' }
    }
};

async function enrichProject(repoName) {
    console.log(`Fetching data for ${repoName}...`);

    const [languages, branches, commitInfo] = await Promise.all([
        getLanguages(username, repoName),
        getBranches(username, repoName),
        getCommitInfo(username, repoName)
    ]);

    return {
        devTools: languages,
        branches: branches,
        firstCommitDate: commitInfo.firstCommitDate,
        latestCommit: commitInfo.latestCommit
    };
}

async function main() {
    // Read the existing repo list
    const rawData = fs.readFileSync('complete_repo_list.json', 'utf8');
    const allRepos = JSON.parse(rawData);
    const myRepos = allRepos.filter(repo => repo.owner.login.toLowerCase() === username.toLowerCase());

    const enrichedProjects = [];

    for (const repo of myRepos) {
        const definition = projectDefinitions[repo.name] || {
            category: 'Sandbox',
            mvpStatus: 'Prototype',
            description: repo.description || 'Experimental project.',
            overview: 'Exploration and experimentation.',
            nextStage: 'Evaluate project direction',
            nextUpdate: 'TBD',
            roadmap: ['Under evaluation'],
            aiAssessment: { feasibility: 'Medium', monetization: 'Low', notes: 'Requires assessment' }
        };

        // Fetch live data from GitHub
        const liveData = await enrichProject(repo.name);

        const project = {
            id: repo.id,
            name: repo.name,
            category: definition.category,
            mvpStatus: definition.mvpStatus,
            description: definition.description,
            overview: definition.overview,
            nextStage: definition.nextStage,
            nextUpdate: definition.nextUpdate,
            roadmap: definition.roadmap,
            aiAssessment: definition.aiAssessment,

            // GitHub metadata
            repoLink: repo.html_url,
            agentLink: `#agent-${repo.name}`,

            // Enhanced fields from API
            devTools: liveData.devTools.length > 0 ? liveData.devTools : [repo.language || 'Unknown'],
            branches: liveData.branches,
            firstCommitDate: liveData.firstCommitDate || repo.created_at,
            latestCommit: liveData.latestCommit || {
                date: repo.pushed_at,
                message: 'No commit data available',
                author: 'Unknown'
            },

            // Repo stats
            stars: repo.stargazers_count,
            forks: repo.forks_count,
            openIssues: repo.open_issues_count,
            isPrivate: repo.private
        };

        enrichedProjects.push(project);
    }

    // Sort: Active first, then by category
    const categoryOrder = ['Active', 'Sandbox', 'Archived', 'Discontinued'];
    enrichedProjects.sort((a, b) => {
        const orderA = categoryOrder.indexOf(a.category);
        const orderB = categoryOrder.indexOf(b.category);
        if (orderA !== orderB) return orderA - orderB;
        if (a.name === 'Lumina') return -1;
        if (b.name === 'Lumina') return 1;
        return 0;
    });

    const fileContent = `export const projects = ${JSON.stringify(enrichedProjects, null, 2)};`;
    fs.writeFileSync('src/data/projects.js', fileContent);
    console.log(`\nSuccessfully generated projects.js with ${enrichedProjects.length} enriched projects.`);
}

main().catch(console.error);
