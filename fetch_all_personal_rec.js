
import fs from 'fs';
import https from 'https';

// TOKEN RETRIEVED SECURELY FROM USER ENVIRONMENT
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || readEnvToken();

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
const username = 'boydyngo';

const options = {
    hostname: 'api.github.com',
    path: `/user/repos?sort=updated&per_page=100&visibility=all&affiliation=owner`, // Force "owner" affiliation to get ALL personal repos
    method: 'GET',
    headers: {
        'User-Agent': 'PAS-AI-Fetcher',
        'Accept': 'application/vnd.github.v3+json',
        'Authorization': `token ${GITHUB_TOKEN}`
    }
};

const req = https.request(options, (res) => {
    let data = '';

    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        if (res.statusCode === 200) {
            try {
                let repos = JSON.parse(data);

                // Strict filter to ensure ownership is "boydyngo"
                const personalRepos = repos.filter(repo => repo.owner.login.toLowerCase() === username.toLowerCase());

                console.log(JSON.stringify(personalRepos, null, 2));
            } catch (e) {
                console.error('Error parsing JSON:', e);
            }
        } else {
            console.error(`Failed to fetch repos. Status code: ${res.statusCode}`);
            console.error('Body:', data);
        }
    });
});

req.on('error', (e) => {
    console.error(`Problem with request: ${e.message}`);
});

req.end();
