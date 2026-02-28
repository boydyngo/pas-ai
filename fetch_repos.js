
import fs from 'fs';
import https from 'https';

const username = 'boydyngo';
const options = {
    hostname: 'api.github.com',
    path: `/users/${username}/repos?sort=updated&per_page=100`,
    method: 'GET',
    headers: {
        'User-Agent': 'Node.js Script',
        'Accept': 'application/vnd.github.v3+json'
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
                const repos = JSON.parse(data);
                console.log(JSON.stringify(repos, null, 2));
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
