import React, { useState, useEffect } from 'react';

// Format date
const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
};

// Truncate text
const truncate = (str, len = 60) => {
    if (!str) return '';
    return str.length > len ? str.substring(0, len) + '…' : str;
};

// Category Badge Component
const CategoryBadge = ({ category }) => {
    const styles = {
        Active: 'badge-active',
        Sandbox: 'badge-sandbox',
        Archived: 'badge-archived',
        Discontinued: 'badge-discontinued'
    };
    return <span className={`badge ${styles[category] || 'badge-mono'}`}>{category}</span>;
};

// Status Indicator
const StatusDot = ({ status }) => {
    const colors = {
        Production: 'var(--color-success)',
        Beta: '#3b82f6',
        Alpha: 'var(--color-accent-primary)',
        Development: 'var(--color-warning)',
        Prototype: '#f97316',
        default: 'var(--color-text-muted)'
    };
    return (
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: colors[status] || colors.default
            }} />
            <span className="text-micro">{status}</span>
        </span>
    );
};

// Project Card
const ProjectCard = ({ project }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    return (
        <article className="card card-glow" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Header */}
            <div className="card-header">
                <CategoryBadge category={project.category} />
                <StatusDot status={project.mvpStatus} />
            </div>

            {/* Title & Description */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <h3 style={{
                    fontSize: '1.125rem',
                    fontWeight: 600,
                    marginBottom: 'var(--space-2)',
                    color: 'var(--color-text-primary)'
                }}>
                    {project.name}
                    {project.isPrivate && (
                        <svg style={{ marginLeft: '8px', opacity: 0.4, width: '12px', height: '12px' }} viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 1C8.676 1 6 3.676 6 7v2H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V11a2 2 0 00-2-2h-2V7c0-3.324-2.676-6-6-6zm4 8H8V7a4 4 0 018 0v2z" />
                        </svg>
                    )}
                </h3>
            </div>
            <p className="text-body" style={{ marginBottom: 'var(--space-4)', lineHeight: 1.5, flex: 1 }}>
                {truncate(project.description, 100)}
            </p>

            {/* Tech Stack */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: 'var(--space-4)' }}>
                {(project.devTools || []).slice(0, 4).map((tech) => (
                    <span key={tech} className="badge badge-mono" style={{ fontSize: '0.625rem' }}>{tech}</span>
                ))}
            </div>

            {/* Metrics Row */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 'var(--space-3)',
                padding: 'var(--space-3) 0',
                borderTop: '1px solid var(--color-border-subtle)',
                borderBottom: '1px solid var(--color-border-subtle)',
                marginBottom: 'var(--space-4)'
            }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>{project.branches?.length || 0}</div>
                    <div className="text-micro">Branches</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>{formatDate(project.firstCommitDate)}</div>
                    <div className="text-micro">Started</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>{project.stars !== undefined ? project.stars : (project.repoStats?.stars || '-')}</div>
                    <div className="text-micro">Stars</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>{formatDate(project.latestCommit?.date)}</div>
                    <div className="text-micro">Updated</div>
                </div>
            </div>

            {/* Latest Commit */}
            {project.latestCommit?.message && (
                <div style={{
                    background: 'var(--color-bg-secondary)',
                    borderRadius: 'var(--radius-sm)',
                    padding: 'var(--space-3)',
                    marginBottom: 'var(--space-4)'
                }}>
                    <div className="text-micro" style={{ marginBottom: '4px' }}>Last Commit</div>
                    <p style={{
                        fontSize: '0.75rem',
                        fontFamily: 'var(--font-mono)',
                        color: 'var(--color-text-tertiary)',
                        lineHeight: 1.4
                    }}>
                        "{truncate(project.latestCommit.message, 50)}"
                    </p>
                </div>
            )}

            {/* Next Stage */}
            <div style={{ marginBottom: 'var(--space-4)' }}>
                <div className="text-micro" style={{ color: 'var(--color-accent-primary)', marginBottom: '4px' }}>Next Stage</div>
                <p className="text-caption" style={{ lineHeight: 1.4 }}>{truncate(project.nextStage, 60)}</p>
            </div>

            {/* Expandable AI Assessment */}
            <div style={{
                background: 'var(--color-bg-secondary)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border-subtle)',
                marginBottom: 'var(--space-4)',
                overflow: 'hidden'
            }}>
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: 'var(--space-3)',
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        color: 'var(--color-text-secondary)'
                    }}
                >
                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', fontWeight: 500 }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent-primary)" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" />
                            <path d="M12 16v-4M12 8h.01" />
                        </svg>
                        AI Assessment
                    </span>
                    <svg
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        style={{ transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 150ms' }}
                    >
                        <polyline points="6 9 12 15 18 9" />
                    </svg>
                </button>
                {isExpanded && (
                    <div style={{ padding: '0 var(--space-3) var(--space-3)', fontSize: '0.75rem' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
                            <div>
                                <span className="text-micro">Feasibility</span>
                                <div style={{
                                    color: project.aiAssessment?.feasibility === 'High' || project.aiAssessment?.feasibility === 'Proven'
                                        ? 'var(--color-success)'
                                        : 'var(--color-warning)',
                                    fontWeight: 500
                                }}>
                                    {project.aiAssessment?.feasibility}
                                </div>
                            </div>
                            <div>
                                <span className="text-micro">Monetization</span>
                                <div style={{ color: 'var(--color-text-secondary)' }}>
                                    {project.aiAssessment?.monetization?.split(' - ')[0]}
                                </div>
                            </div>
                        </div>
                        <p style={{ color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                            "{project.aiAssessment?.notes}"
                        </p>
                    </div>
                )}
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-2)', marginTop: 'auto' }}>
                <a
                    href={project.repoLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-secondary btn-sm"
                >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                    </svg>
                    Repository
                </a>
                <a href={project.agentLink} className="btn btn-primary btn-sm">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                    </svg>
                    Agent
                </a>
            </div>
        </article>
    );
};

// Section Component
const ProjectSection = ({ title, emoji, projects, colorVar }) => {
    if (!projects || projects.length === 0) return null;

    return (
        <div style={{ marginBottom: 'var(--space-12)' }}>
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-3)',
                marginBottom: 'var(--space-6)'
            }}>
                <span style={{ fontSize: '1.25rem' }}>{emoji}</span>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, color: colorVar }}>
                    {title}
                </h3>
                <span style={{
                    fontSize: '0.75rem',
                    color: 'var(--color-text-muted)',
                    fontWeight: 400
                }}>
                    {projects.length} project{projects.length !== 1 ? 's' : ''}
                </span>
            </div>
            <div className="grid grid-3">
                {projects.map((project) => (
                    <ProjectCard key={project.id} project={project} />
                ))}
            </div>
        </div>
    );
};

// Main Portfolio Component
const Portfolio = ({ projects: initialProjects }) => {
    const [projectsData, setProjectsData] = useState(initialProjects);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [lastUpdated, setLastUpdated] = useState(null);

    const refreshProjects = async () => {
        setIsRefreshing(true);
        const updatedProjects = await Promise.all(projectsData.map(async (p) => {
            // Only fetch for public repos to avoid auth complexity on client side if possible, 
            // or just skip private ones that would 404 without a token.
            // We can use the 'isPrivate' flag to skip.
            if (p.isPrivate) return p;

            try {
                const res = await fetch(`https://api.github.com/repos/boydyngo/${p.name}`);
                if (res.ok) {
                    const data = await res.json();
                    return {
                        ...p,
                        stars: data.stargazers_count,
                        repoStats: { stars: data.stargazers_count, forks: data.forks_count },
                        latestCommit: { ...p.latestCommit, date: data.pushed_at } // approximate update
                    };
                }
            } catch (e) {
                console.warn(`Failed to refresh ${p.name}`, e);
            }
            return p;
        }));

        setProjectsData(updatedProjects);
        setLastUpdated(new Date());
        setIsRefreshing(false);
    };

    const active = projectsData.filter(p => p.category === 'Active');
    const sandbox = projectsData.filter(p => p.category === 'Sandbox');
    const archived = projectsData.filter(p => p.category === 'Archived');
    const discontinued = projectsData.filter(p => p.category === 'Discontinued');

    return (
        <section id="portfolio" className="section">
            <div className="container container-lg">
                {/* Section Header */}
                <div style={{ textAlign: 'center', maxWidth: '640px', margin: '0 auto var(--space-12)' }}>
                    <span className="text-micro" style={{
                        color: 'var(--color-accent-primary)',
                        marginBottom: 'var(--space-4)',
                        display: 'block'
                    }}>
                        Portfolio
                    </span>
                    <h2 className="text-headline" style={{ marginBottom: 'var(--space-4)' }}>
                        Projects & <span className="text-gradient">Experiments</span>
                    </h2>
                    <p className="text-body-lg">
                        A comprehensive view of active development, experimental labs, and archived work.
                        Each project includes live GitHub data and AI-powered assessments.
                    </p>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap', marginTop: 'var(--space-4)' }}>
                        <button
                            onClick={refreshProjects}
                            disabled={isRefreshing}
                            className="btn btn-secondary btn-sm"
                            style={{ gap: '8px' }}
                        >
                            <svg
                                width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                                style={{ animation: isRefreshing ? 'spin 1s linear infinite' : 'none' }}
                            >
                                <path d="M23 4v6h-6M1 20v-6h6" />
                                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                            </svg>
                            {isRefreshing ? 'Checking GitHub...' : 'Refresh Live Data'}
                        </button>
                        {lastUpdated && (
                            <span className="text-caption" style={{ alignSelf: 'center' }}>
                                Updated: {lastUpdated.toLocaleTimeString()}
                            </span>
                        )}
                    </div>
                </div>

                <style>{`
                    @keyframes spin { 100% { transform: rotate(360deg); } }
                `}</style>

                {/* Project Sections */}
                <ProjectSection title="Active Development" emoji="🚀" projects={active} colorVar="var(--color-success)" />
                <ProjectSection title="Sandbox & Labs" emoji="🧪" projects={sandbox} colorVar="var(--color-warning)" />
                <ProjectSection title="Archived" emoji="📦" projects={archived} colorVar="var(--color-text-tertiary)" />
                <ProjectSection title="Discontinued" emoji="🛑" projects={discontinued} colorVar="var(--color-danger)" />
            </div>
        </section>
    );
};

export default Portfolio;
