import React from 'react';

const About = () => {
    const pillars = [
        {
            icon: (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                </svg>
            ),
            title: 'Education',
            description: 'Documenting learnings, best practices, and technical deep-dives across AI/ML, web development, and infrastructure.'
        },
        {
            icon: (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="12 2 2 7 12 12 22 7 12 2" />
                    <polyline points="2 17 12 22 22 17" />
                    <polyline points="2 12 12 17 22 12" />
                </svg>
            ),
            title: 'Solutions',
            description: 'Building practical tools that solve real problems—from SSL management to AI-powered note-taking to mobile games.'
        },
        {
            icon: (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 20V10" />
                    <path d="M18 20V4" />
                    <path d="M6 20v-4" />
                </svg>
            ),
            title: 'Assessment',
            description: 'Every project is evaluated for feasibility, monetization potential, and strategic fit using AI-powered analysis.'
        }
    ];

    return (
        <section id="about" className="section section-alt">
            <div className="container">
                {/* Section Header */}
                <div style={{ maxWidth: '720px', marginBottom: 'var(--space-12)' }}>
                    <span className="text-micro" style={{
                        color: 'var(--color-accent-primary)',
                        marginBottom: 'var(--space-4)',
                        display: 'block'
                    }}>
                        About
                    </span>
                    <h2 className="text-headline" style={{ marginBottom: 'var(--space-5)' }}>
                        Practical Affordable Solutions, <br />
                        <span style={{ color: 'var(--color-text-secondary)' }}>reimagined for the AI era</span>
                    </h2>
                    <p className="text-body-lg">
                        PAS AI is a personal portfolio and laboratory. A space to build, experiment,
                        and ship projects that bridge practical engineering with emerging AI capabilities.
                    </p>
                </div>

                {/* Pillars Grid */}
                <div className="grid grid-3" style={{ marginBottom: 'var(--space-12)' }}>
                    {pillars.map((pillar, i) => (
                        <div
                            key={i}
                            className="card"
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 'var(--space-4)'
                            }}
                        >
                            <div style={{
                                width: '48px',
                                height: '48px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                borderRadius: 'var(--radius-md)',
                                background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.1), rgba(99, 102, 241, 0.1))',
                                border: '1px solid rgba(168, 85, 247, 0.15)',
                                color: 'var(--color-accent-primary)'
                            }}>
                                {pillar.icon}
                            </div>
                            <h3 className="text-title" style={{ fontSize: '1.125rem' }}>{pillar.title}</h3>
                            <p className="text-body">{pillar.description}</p>
                        </div>
                    ))}
                </div>

                {/* Tech Stack Bar */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-6)',
                    padding: 'var(--space-5) var(--space-6)',
                    background: 'var(--color-bg-tertiary)',
                    borderRadius: 'var(--radius-lg)',
                    border: '1px solid var(--color-border-subtle)',
                    overflowX: 'auto'
                }}>
                    <span className="text-micro" style={{ flexShrink: 0 }}>Tech Stack</span>
                    <div style={{
                        display: 'flex',
                        gap: 'var(--space-4)',
                        flexWrap: 'wrap'
                    }}>
                        {['TypeScript', 'Python', 'React', 'Flutter', 'Node.js', 'PostgreSQL', 'OpenAI', 'LangChain'].map((tech) => (
                            <span
                                key={tech}
                                style={{
                                    padding: 'var(--space-2) var(--space-3)',
                                    fontSize: '0.8125rem',
                                    fontFamily: 'var(--font-mono)',
                                    color: 'var(--color-text-secondary)',
                                    background: 'var(--color-bg-secondary)',
                                    borderRadius: 'var(--radius-sm)',
                                    border: '1px solid var(--color-border-subtle)'
                                }}
                            >
                                {tech}
                            </span>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
};

export default About;
