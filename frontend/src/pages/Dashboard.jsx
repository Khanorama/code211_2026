import { useDeferredValue, useRef, useState } from 'react';
import { useUser } from '../context/useUser';
import { getProfileCompletion } from '../services/profileUtils';
import { streamSearch, profileToStudent } from '../services/opportunityService';

// ── XP Bar ────────────────────────────────────────────────────────────────────

const XpBar = ({ xp, xpInLevel, xpForLevel, level }) => {
  const pct      = xpForLevel > 0 ? Math.min(100, Math.round((xpInLevel / xpForLevel) * 100)) : 0;
  const nextLevel = level + 1;
  const nearDone  = pct >= 80;

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 14,
      background: 'rgba(20,83,100,0.06)',
      border: '1px solid rgba(20,83,100,0.15)',
      borderRadius: 14, padding: '10px 18px',
      flex: 1, minWidth: 280, maxWidth: 520,
    }}>
      {/* Level badge */}
      <div style={{
        flexShrink: 0, width: 46, height: 46, borderRadius: 11,
        background: 'linear-gradient(135deg, #164e63 0%, #f97316 100%)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 2px 8px rgba(249,115,22,0.25)',
      }}>
        <span style={{ fontSize: '0.56rem', color: 'rgba(255,252,247,0.75)', textTransform: 'uppercase', letterSpacing: '0.08em', lineHeight: 1 }}>LVL</span>
        <span style={{ fontSize: '1.05rem', fontWeight: 800, color: '#fffdf9', lineHeight: 1.15, fontFamily: 'var(--font-display)' }}>{level}</span>
      </div>

      {/* Progress section */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Labels */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
          <span style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--color-ink)', fontFamily: 'var(--font-display)' }}>
            {xp} XP
          </span>
          <span style={{ fontSize: '0.67rem', color: nearDone ? '#f97316' : 'var(--color-muted)', fontFamily: 'monospace', fontWeight: nearDone ? 600 : 400 }}>
            {xpInLevel} / {xpForLevel} to Lv {nextLevel}{nearDone ? ' — nearly there' : ''}
          </span>
        </div>

        {/* Track */}
        <div style={{ height: 12, background: 'rgba(20,83,100,0.1)', borderRadius: 6, overflow: 'hidden', position: 'relative' }}>
          {/* Tick marks at 25 / 50 / 75 % */}
          {[25, 50, 75].map((mark) => (
            <div key={mark} style={{
              position: 'absolute', left: `${mark}%`, top: 0, bottom: 0,
              width: 1, background: 'rgba(255,252,247,0.22)', zIndex: 1,
            }} />
          ))}

          {/* Fill */}
          <div style={{
            height: '100%', width: `${pct}%`,
            background: 'linear-gradient(90deg, #145364 0%, #0e7490 40%, #f97316 100%)',
            borderRadius: 6,
            transition: 'width 0.9s cubic-bezier(0.34, 1.56, 0.64, 1)',
            position: 'relative', overflow: 'hidden',
          }}>
            {/* Gloss */}
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(255,255,255,0.22) 0%, transparent 52%)', borderRadius: 'inherit' }} />
          </div>
        </div>

        {/* Floor / ceiling labels */}
        <div style={{ marginTop: 5, display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '0.63rem', color: 'var(--color-muted)' }}>Lv {level}</span>
          <span style={{ fontSize: '0.63rem', color: 'var(--color-muted)' }}>{pct}%</span>
          <span style={{ fontSize: '0.63rem', color: 'var(--color-muted)' }}>Lv {nextLevel}</span>
        </div>
      </div>
    </div>
  );
};

// ── Email Modal ───────────────────────────────────────────────────────────────

const EmailModal = ({ draft, onClose }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(`Subject: ${draft.subject}\n\n${draft.body}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleMailto = () => {
    window.open(
      `mailto:${encodeURIComponent(draft.contactEmail || '')}?subject=${encodeURIComponent(draft.subject)}&body=${encodeURIComponent(draft.body)}`
    );
  };

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div style={{ background: 'var(--color-surface-strong)', border: '1px solid var(--color-border)', borderRadius: 24, width: '100%', maxWidth: 600, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 80px rgba(0,0,0,0.18)' }}>
        <div style={{ padding: '24px 28px 20px', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <p className="eyebrow">AI-drafted email</p>
            <h2 style={{ margin: '6px 0 4px' }}>Your outreach email</h2>
            {draft.org && (
              <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--color-muted)' }}>
                To: {draft.contactName || draft.org}{draft.contactEmail && ` · ${draft.contactEmail}`}
              </p>
            )}
          </div>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--color-muted)', fontSize: 24, cursor: 'pointer', padding: 0, lineHeight: 1 }}>x</button>
        </div>

        <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div>
            <p className="eyebrow" style={{ marginBottom: 8 }}>Subject</p>
            <div style={{ background: 'rgba(20,83,100,0.05)', border: '1px solid var(--color-border)', borderRadius: 12, padding: '10px 14px', fontWeight: 600, fontSize: '0.9rem', color: 'var(--color-ink)' }}>
              {draft.subject}
            </div>
          </div>
          <div>
            <p className="eyebrow" style={{ marginBottom: 8 }}>Message</p>
            <div style={{ background: 'rgba(20,83,100,0.03)', border: '1px solid var(--color-border)', borderRadius: 12, padding: '14px 16px', fontSize: '0.88rem', lineHeight: 1.8, whiteSpace: 'pre-wrap', color: 'var(--color-ink-soft)' }}>
              {draft.body}
            </div>
          </div>
          <div style={{ background: 'rgba(249,115,22,0.07)', border: '1px solid rgba(249,115,22,0.18)', borderRadius: 12, padding: '10px 14px', fontSize: '0.84rem', color: '#9a3412', lineHeight: 1.6 }}>
            <strong>Tip:</strong> Add one specific detail about the organisation before sending to make your email stand out.
          </div>
        </div>

        <div style={{ padding: '16px 28px 24px', display: 'flex', gap: 10, flexWrap: 'wrap', borderTop: '1px solid var(--color-border)' }}>
          <button className="button button--primary" type="button" onClick={handleMailto} style={{ flex: 1, minWidth: 160 }}>Open in mail app</button>
          <button className="button button--secondary" type="button" onClick={handleCopy} style={{ flex: 1, minWidth: 120 }}>{copied ? 'Copied' : 'Copy all'}</button>
        </div>
      </div>
    </div>
  );
};

// ── Thought Log ───────────────────────────────────────────────────────────────

const ThoughtLog = ({ thoughts, isStreaming }) => {
  const endRef = useRef(null);
  if (!thoughts.length) return null;
  return (
    <div className="panel" style={{ marginBottom: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        {isStreaming && <span className="status-dot" />}
        <p className="eyebrow" style={{ margin: 0 }}>{isStreaming ? 'Agent thought log — live' : 'Agent thought log'}</p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 200, overflowY: 'auto' }}>
        {thoughts.map((t, i) => (
          <div key={i} style={{ display: 'flex', gap: 12, padding: '6px 12px', borderRadius: 10, background: 'rgba(20,83,100,0.05)', borderLeft: '2px solid rgba(20,83,100,0.2)', fontFamily: 'monospace', fontSize: '0.82rem', color: 'var(--color-ink-soft)' }}>
            <span style={{ color: 'var(--color-muted)', flexShrink: 0 }}>{t.time}</span>
            <span>{t.text}</span>
          </div>
        ))}
        <div ref={endRef} />
      </div>
    </div>
  );
};

// ── Dashboard ─────────────────────────────────────────────────────────────────

const Dashboard = () => {
  const { profile, xp, xpInLevel, xpForLevel, level, opportunities, setOpportunities, addXp } = useUser();

  const [isLoading,    setIsLoading]    = useState(false);
  const [isStreaming,  setIsStreaming]  = useState(false);
  const [thoughts,     setThoughts]    = useState([]);
  const [coachMessage, setCoachMessage] = useState('');
  const [hasRun,       setHasRun]      = useState(!!opportunities);
  const [searchQuery,  setSearchQuery]  = useState('');
  const [trackFilter,  setTrackFilter]  = useState('all');
  const [sortBy,       setSortBy]      = useState('match');
  const [activeDraft,  setActiveDraft]  = useState(null);
  const [draftLoading, setDraftLoading] = useState(null);
  const [acceptedIds,  setAcceptedIds]  = useState(new Set());

  const deferredQuery  = useDeferredValue(searchQuery);
  const stopRef        = useRef(null);
  const completion     = getProfileCompletion(profile);
  const topOpportunity = (opportunities || [])[0];

  const handleRun = () => {
    if (stopRef.current) stopRef.current();
    setIsLoading(true);
    setIsStreaming(true);
    setThoughts([]);
    setOpportunities(null);
    setCoachMessage('');
    setHasRun(true);

    const stop = streamSearch({
      profile,
      onThought: (text) => {
        const time = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        setThoughts((prev) => [...prev, { text, time }]);
      },
      onResult: (data) => {
        setCoachMessage(data.coach_message || '');
        const cards = (data.matches || []).map((m) => ({
          id:           (m.org_name || '').replace(/\s+/g, '-').toLowerCase() + '-' + Math.random().toString(36).slice(2, 7),
          title:        m.org_name || 'Opportunity',
          organization: m.org_name || '',
          description:  m.why_it_fits || '',
          type:         (
                          (m.xp_category || '').toLowerCase().includes('intern') ||
                          (m.org_name    || '').toLowerCase().includes('intern') ||
                          (m.org_name    || '').toLowerCase().includes('hiwin')  ||
                          (m.org_name    || '').toLowerCase().includes('chamber')
                        ) ? 'internship' : 'research',
          location:     'Palatine, IL area',
          gradeLevel:   'High school',
          tags:         m.tags || [m.xp_category].filter(Boolean),
          matchScore:   Math.min(98, Math.max(60, 60 + (m.xp_value || 15))),
          contact:      m.contact   || '',
          website:      m.website   || '',
          nextAction:   m.next_action || '',
          xpValue:      m.xp_value  || 15,
          _raw:         m,
        }));
        setOpportunities(cards);
        setIsLoading(false);
      },
      onError:  (msg) => { console.error(msg); setIsLoading(false); setIsStreaming(false); },
      onDone:   ()    => { setIsStreaming(false); setIsLoading(false); },
    });
    stopRef.current = stop;
  };

  const handleDraftEmail = async (opp) => {
    setDraftLoading(opp.id);
    const API     = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    const student = profileToStudent(profile);
    try {
      const res       = await fetch(`${API}/draft-email`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ student, match: opp._raw || opp }) });
      const data      = await res.json();
      const emailText = data.email || '';
      const subMatch  = emailText.match(/Subject:\s*(.+)/i);
      const bodyStart = emailText.indexOf('\n\n');
      setActiveDraft({
        subject:      subMatch?.[1]?.trim() || `Volunteer Interest: ${opp.title}`,
        body:         bodyStart > -1 ? emailText.slice(bodyStart).trim() : emailText,
        contactEmail: opp.contact || '',
        contactName:  opp.organization,
        org:          opp.organization,
      });
    } catch {
      setActiveDraft({
        subject: `Volunteer Interest: ${opp.title} — ${profile.fullName || 'Student'}`,
        body:    `Dear ${opp.organization} Team,\n\nI am writing to express my interest in the ${opp.title} opportunity.\n\n${opp.nextAction || ''}\n\nThank you for your time.\n\nWarm regards,\n${profile.fullName || 'Student'}\n${profile.school || ''}`,
        contactEmail: opp.contact || '',
        contactName:  opp.organization,
        org:          opp.organization,
      });
    } finally {
      setDraftLoading(null);
    }
  };

  const handleAccept = async (opp) => {
    if (acceptedIds.has(opp.id)) return;
    setAcceptedIds((prev) => new Set([...prev, opp.id]));
    await addXp(opp.xpValue || 15);
  };

  const normalizedQuery = deferredQuery.trim().toLowerCase();
  const visibleOpps = (opportunities || []).filter((opp) => {
    const matchesFilter = trackFilter === 'all' || opp.type === trackFilter;
    const haystack = [opp.title, opp.organization, opp.description, opp.location, ...(opp.tags || [])].join(' ').toLowerCase();
    return matchesFilter && (!normalizedQuery || haystack.includes(normalizedQuery));
  });

  visibleOpps.sort((a, b) => {
    if (sortBy === 'title')        return a.title.localeCompare(b.title);
    if (sortBy === 'organization') return a.organization.localeCompare(b.organization);
    return b.matchScore - a.matchScore;
  });

  return (
    <section className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Matched opportunities</p>
          <h1 style={{ fontSize: 60 }}>Explore the best volunteer and internship roles for your profile.</h1>
          <p className="lead">
            The AI agent scrapes real local organisations based on your profile, ranks matches, and has your outreach email ready with one click.
          </p>
        </div>

        <div className="stat-grid">
          <article className="stat-card">
            <span className="stat-card__label">Total matches</span>
            <strong>{isLoading ? '...' : (opportunities || []).length}</strong>
            <p>Live-scraped to your profile.</p>
          </article>
          <article className="stat-card">
            <span className="stat-card__label">Best fit</span>
            <strong>{topOpportunity ? `${topOpportunity.matchScore}%` : 'N/A'}</strong>
            <p>{topOpportunity ? topOpportunity.title : 'Run a search to see results.'}</p>
          </article>
          <article className="stat-card">
            <span className="stat-card__label">Profile readiness</span>
            <strong>{completion}%</strong>
            <p>Richer profiles improve AI matches.</p>
          </article>
        </div>
      </header>

      {/* Search button + XP bar */}
      <div className="panel" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <button
            className="button button--primary"
            type="button"
            onClick={handleRun}
            disabled={isStreaming}
            style={{ minWidth: 220, flexShrink: 0 }}
          >
            {isStreaming ? 'Searching...' : hasRun ? 'Search again' : 'Find my opportunities'}
          </button>

          <XpBar xp={xp} xpInLevel={xpInLevel} xpForLevel={xpForLevel} level={level} />

          {completion < 40 && !hasRun && (
            <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--color-muted)', width: '100%' }}>
              Complete your Profile first for better matches.
            </p>
          )}
        </div>
      </div>

      <ThoughtLog thoughts={thoughts} isStreaming={isStreaming} />

      {coachMessage && (
        <div className="panel" style={{ marginBottom: 24, background: 'rgba(249,115,22,0.06)', border: '1px solid rgba(249,115,22,0.2)' }}>
          <p className="eyebrow">Coach summary</p>
          <p style={{ margin: 0 }}>{coachMessage}</p>
        </div>
      )}

      {hasRun && (
        <div className="panel stack-lg">
          <div className="dashboard-controls">
            <label className="field field--grow">
              <span>Search</span>
              <input className="input" type="search" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search title, organisation, tags, or location" />
            </label>
            <label className="field">
              <span>Track</span>
              <select className="input" value={trackFilter} onChange={(e) => setTrackFilter(e.target.value)}>
                <option value="all">All opportunities</option>
                <option value="internship">Internships</option>
                <option value="research">Volunteer / Research</option>
              </select>
            </label>
            <label className="field">
              <span>Sort</span>
              <select className="input" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                <option value="match">Highest match score</option>
                <option value="title">Title A-Z</option>
                <option value="organization">Organisation A-Z</option>
              </select>
            </label>
          </div>

          {isLoading ? (
            <div className="opportunity-grid">
              {[1, 2, 3].map((item) => (
                <article key={item} className="opportunity-card opportunity-card--skeleton">
                  <div className="skeleton skeleton--title" />
                  <div className="skeleton skeleton--text" />
                  <div className="skeleton skeleton--text skeleton--short" />
                  <div className="tag-row">
                    <span className="skeleton skeleton--tag" />
                    <span className="skeleton skeleton--tag" />
                    <span className="skeleton skeleton--tag" />
                  </div>
                </article>
              ))}
            </div>
          ) : visibleOpps.length ? (
            <div className="opportunity-grid">
              {visibleOpps.map((opp) => {
                const accepted = acceptedIds.has(opp.id);
                return (
                  <article key={opp.id} className="opportunity-card">
                    <div className="opportunity-card__header">
                      <div>
                        <p className="eyebrow">{opp.organization}</p>
                        <h2>{opp.title}</h2>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                        <span className="score-badge">{opp.matchScore}% match</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--color-muted)', fontFamily: 'monospace', fontWeight: 600 }}>+{opp.xpValue} XP</span>
                      </div>
                    </div>

                    <p>{opp.description}</p>

                    <div className="opportunity-card__meta">
                      <span>{opp.type === 'internship' ? 'Internship' : 'Volunteer'}</span>
                      <span>{opp.location}</span>
                      <span>{opp.gradeLevel}</span>
                    </div>

                    <div className="tag-row">
                      {(opp.tags || []).map((tag) => (
                        <span key={tag} className="tag">{tag}</span>
                      ))}
                    </div>

                    {opp.nextAction && (
                      <p style={{ fontSize: '0.86rem', color: 'var(--color-muted)', margin: '4px 0 0' }}>
                        <strong style={{ color: 'var(--color-ink-soft)' }}>Next step:</strong> {opp.nextAction}
                      </p>
                    )}

                    <div style={{ display: 'flex', gap: 8, marginTop: 'auto', paddingTop: 14, borderTop: '1px solid var(--color-border)', flexWrap: 'wrap' }}>
                      <button
                        className="button button--primary"
                        type="button"
                        onClick={() => handleDraftEmail(opp)}
                        disabled={draftLoading === opp.id}
                        style={{ flex: 1, minWidth: 130, fontSize: '0.88rem', padding: '10px' }}
                      >
                        {draftLoading === opp.id ? 'Drafting...' : 'Draft email'}
                      </button>

                      {opp.website && (
                        <a href={opp.website} target="_blank" rel="noopener noreferrer" className="button button--secondary" style={{ fontSize: '0.88rem', padding: '10px 14px' }}>
                          Visit site
                        </a>
                      )}

                      {opp.contact && opp.contact.includes('@') && (
                        <a href={`mailto:${opp.contact}`} className="button button--secondary" style={{ fontSize: '0.88rem', padding: '10px 14px' }} title={opp.contact}>
                          Apply
                        </a>
                      )}

                      <button
                        className={`button ${accepted ? 'button--secondary' : 'button--ghost'}`}
                        type="button"
                        onClick={() => handleAccept(opp)}
                        disabled={accepted}
                        style={{ fontSize: '0.88rem', padding: '10px 14px', minWidth: 90 }}
                      >
                        {accepted ? `+${opp.xpValue} XP earned` : `Accept (+${opp.xpValue} XP)`}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="empty-state">
              <h2>No matches for that filter</h2>
              <p>Try a broader keyword or switch back to all opportunity types.</p>
            </div>
          )}
        </div>
      )}

      {!hasRun && (
        <div className="empty-state">
          <h2>Ready to find your path</h2>
          <p>
            Hit <strong>Find my opportunities</strong> above. The AI scrapes real local organisations
            based on your interests and goals, ranks the best matches, and has your outreach email
            ready to send with one click. Accept an opportunity to earn XP and level up.
          </p>
        </div>
      )}

      {activeDraft && <EmailModal draft={activeDraft} onClose={() => setActiveDraft(null)} />}
    </section>
  );
};

export default Dashboard;
