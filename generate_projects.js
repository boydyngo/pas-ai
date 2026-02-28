
import fs from 'fs';

try {
    const rawData = fs.readFileSync('complete_repo_list.json', 'utf8');
    const allRepos = JSON.parse(rawData);

    // Filter for ONLY boydyngo owned repos (redundant check but safe)
    const myRepos = allRepos.filter(repo => repo.owner.login.toLowerCase() === 'boydyngo');

    const projects = myRepos.map((repo, index) => {
        // 1. Determine Status based on updates and key terms
        let status = 'Development';
        const desc = (repo.description || '').toLowerCase();
        const name = repo.name.toLowerCase();

        if (repo.name === 'Lumina' || repo.name === 'certbot-ssl-manager') {
            status = 'Live'; // High confidence these are key projects
        } else if (name.includes('test') || name.includes('config') || name.includes('workspace')) {
            status = 'Prototype';
        }

        // 2. Generate AI Assessment (Simulated Intelligence)
        let aiAssessment = {
            feasibility: "Medium",
            monetization: "Low - Niche utility.",
            notes: "Standard utility project."
        };

        // Custom Rules for specific projects to match USER persona
        if (name === 'lumina') {
            aiAssessment = {
                feasibility: "High",
                monetization: "Very High - SaaS potential for knowledge workers.",
                notes: "Flagship AI Note-taking app. Strong market fit."
            };
        } else if (name === 'aisdev' || name.includes('ai-')) {
            aiAssessment = {
                feasibility: "High",
                monetization: "Medium - Developer tooling.",
                notes: "Foundational AI infrastructure."
            };
        } else if (name.includes('game') || name.includes('tetris')) {
            aiAssessment = {
                feasibility: "High",
                monetization: "Low - Ad supported mobile potential.",
                notes: "High engagement, low barrier to entry."
            };
        } else if (name === 'certbot-ssl-manager') {
            aiAssessment = {
                feasibility: "Proven",
                monetization: "Low - Open source utility.",
                notes: "Excellent practical solution for ops teams."
            };
        }

        return {
            id: repo.id,
            name: repo.name, // Keep original casing
            description: repo.description || "Experimental project.",
            status: status,
            aiAssessment: aiAssessment,
            techStack: [repo.language || 'Code', ...(name.includes('react') ? ['React'] : [])].filter(Boolean),
            repoLink: repo.html_url,
            agentLink: `#agent-${repo.name}` // Placeholder for future agent interaction
        };
    });

    // Sort: Put Lumina first, then sorted by update time
    projects.sort((a, b) => {
        if (a.name === 'Lumina') return -1;
        if (b.name === 'Lumina') return 1;
        return 0; // Keep original sort (updated_at)
    });

    const fileContent = `export const projects = ${JSON.stringify(projects, null, 2)};`;

    fs.writeFileSync('src/data/projects.js', fileContent);
    console.log(`Successfully generated projects.js with ${projects.length} projects.`);

} catch (error) {
    console.error('Error generating projects:', error);
}
