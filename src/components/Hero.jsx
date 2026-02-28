import React from 'react';

const Hero = () => {
    return (
        <section className="section" style={{ paddingTop: '10rem', paddingBottom: '8rem' }}>
            {/* Background Gradient Orbs */}
            <div style={{
                position: 'absolute',
                top: '10%',
                left: '10%',
                width: '600px',
                height: '600px',
                background: 'radial-gradient(circle, rgba(168, 85, 247, 0.08) 0%, transparent 70%)',
                filter: 'blur(60px)',
                pointerEvents: 'none',
                zIndex: 0
            }} />
            <div style={{
                position: 'absolute',
                bottom: '20%',
                right: '5%',
                width: '500px',
                height: '500px',
                background: 'radial-gradient(circle, rgba(99, 102, 241, 0.06) 0%, transparent 70%)',
                filter: 'blur(60px)',
                pointerEvents: 'none',
                zIndex: 0
            }} />

            <div className="container" style={{ position: 'relative', zIndex: 1 }}>
                {/* Eyebrow */}
                <div className="animate-fade-in" style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-3)',
                    marginBottom: 'var(--space-6)'
                }}>
                    <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 'var(--space-2)',
                        padding: 'var(--space-2) var(--space-4)',
                        background: 'rgba(168, 85, 247, 0.08)',
                        border: '1px solid rgba(168, 85, 247, 0.15)',
                        borderRadius: 'var(--radius-full)',
                        fontSize: '0.8125rem',
                        color: 'var(--color-accent-primary)',
                        fontWeight: 500
                    }}>
                        <span style={{
                            width: '6px',
                            height: '6px',
                            borderRadius: '50%',
                            background: 'var(--color-success)',
                            animation: 'pulse 2s infinite'
                        }} />
                        20 Projects • 4 Active
                    </span>
                </div>

                {/* Main Headline */}
                <h1 className="text-display animate-fade-in animate-delay-1" style={{
                    maxWidth: '900px',
                    marginBottom: 'var(--space-6)'
                }}>
                    <span style={{ color: 'var(--color-text-primary)' }}>Building the future with </span>
                    <span className="text-gradient">Practical AI Solutions</span>
                </h1>

                {/* Subheadline */}
                <p className="text-body-lg animate-fade-in animate-delay-2" style={{
                    maxWidth: '600px',
                    marginBottom: 'var(--space-8)'
                }}>
                    A curated portfolio of AI-powered tools, applications, and experiments.
                    Each project assessed for technical feasibility and commercial viability.
                </p>

                {/* CTAs */}
                <div className="animate-fade-in animate-delay-3" style={{
                    display: 'flex',
                    gap: 'var(--space-4)',
                    flexWrap: 'wrap'
                }}>
                    <a href="#portfolio" className="btn btn-primary" style={{ fontSize: '0.9375rem', padding: 'var(--space-4) var(--space-6)' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M6 9l6 6 6-6" />
                        </svg>
                        View Projects
                    </a>
                    <a href="#about" className="btn btn-secondary" style={{ fontSize: '0.9375rem', padding: 'var(--space-4) var(--space-6)' }}>
                        About PAS AI
                    </a>
                </div>

                {/* Stats Row */}
                <div className="animate-fade-in" style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                    gap: 'var(--space-6)',
                    marginTop: 'var(--space-12)',
                    paddingTop: 'var(--space-8)',
                    borderTop: '1px solid var(--color-border-subtle)',
                    maxWidth: '600px'
                }}>
                    {[
                        { value: '4', label: 'Active Projects' },
                        { value: '5', label: 'Sandbox Labs' },
                        { value: '6', label: 'Languages' },
                        { value: '16+', label: 'Branches' }
                    ].map((stat, i) => (
                        <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
                            <span style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>{stat.value}</span>
                            <span className="text-caption">{stat.label}</span>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default Hero;
