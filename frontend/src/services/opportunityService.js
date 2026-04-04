// opportunityService.js — connects to FastAPI backend

import { splitCommaSeparated } from './profileUtils';

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000';

//  helpers 

export function profileToStudent(profile) {
  return {
    name: profile.fullName || 'Student',
    grade: profile.grade === 'high-school' ? 11 : (parseInt(profile.grade) || 11),
    school: profile.school || 'Palatine High School',
    location: profile.location || 'Palatine, IL',
    age: parseInt(profile.age) || 16,
    interests: splitCommaSeparated(profile.interests),
    schedule: profile.bio || 'Weekends',
    career_cluster: (profile.goals || '').split(' ').slice(0, 4).join(' ') || 'General',
    career_goals: profile.goals || '',
    skills: splitCommaSeparated(profile.skills),
    experience: splitCommaSeparated(profile.experience),
    resume_data: profile.resumeInsights || null,
  };
}

//  fetchMatchedOpportunities 
// Streams from /search/stream (personalised scrape + AI matching).

export const fetchMatchedOpportunities = async (profile) => {
  const student = profileToStudent(profile);
  try {
    const res = await fetch(`${API}/search/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ student }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = '';
    let resultPayload = null;

    outer: while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const lines = buf.split('\n');
      buf = lines.pop();
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const raw = line.slice(6).trim();
        if (raw === '[DONE]') break outer;
        try {
          const msg = JSON.parse(raw);
          if (msg.type === 'result') { resultPayload = msg.payload; break outer; }
        } catch { /* skip */ }
      }
    }

    if (!resultPayload) throw new Error('No result from stream');

    const coachMessage = resultPayload.coach_message || '';
    return (resultPayload.matches || []).map((m) => {
      const isInternship =
        (m.xp_category || '').toLowerCase().includes('intern') ||
        (m.org_name || '').toLowerCase().includes('intern') ||
        (m.org_name || '').toLowerCase().includes('hiwin') ||
        (m.org_name || '').toLowerCase().includes('chamber');
      return {
        id: (m.org_name || '').replace(/\s+/g, '-').toLowerCase() + '-' + Math.random().toString(36).slice(2, 7),
        title: m.org_name || 'Opportunity',
        organization: m.org_name || '',
        description: m.why_it_fits || '',
        type: isInternship ? 'internship' : 'research',
        location: 'Palatine, IL area',
        gradeLevel: 'High school students',
        tags: m.tags || [m.xp_category].filter(Boolean),
        matchScore: Math.min(98, Math.max(60, 60 + (m.xp_value || 15))),
        contact: m.contact || '',
        website: m.website || '',
        scheduleNote: m.schedule_ok ? 'Schedule fits ' : 'Check schedule',
        nextAction: m.next_action || '',
        xpValue: m.xp_value || 0,
        coachMessage,
        _raw: m,
      };
    }).sort((a, b) => b.matchScore - a.matchScore);

  } catch (err) {
    console.warn('Backend unavailable — using cached data:', err.message);
    const { fetchMatchedOpportunities: original } = await import('./opportunityService_backup.js');
    return original(profile);
  }
};

//  streamSearch — exposes SSE stream for Dashboard thought log 

export function streamSearch({ profile, onThought, onResult, onError, onDone }) {
  const student = profileToStudent(profile);
  const controller = new AbortController();

  fetch(`${API}/search/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ student }),
    signal: controller.signal,
  }).then(async (res) => {
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const lines = buf.split('\n');
      buf = lines.pop();
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const raw = line.slice(6).trim();
        if (raw === '[DONE]') { onDone?.(); return; }
        try {
          const msg = JSON.parse(raw);
          if (msg.type === 'thought') onThought?.(msg.payload);
          else if (msg.type === 'result') onResult?.(msg.payload);
          else if (msg.type === 'error') onError?.(msg.payload);
        } catch { /* skip */ }
      }
    }
    onDone?.();
  }).catch((err) => { if (err.name !== 'AbortError') onError?.(err.message); });

  return () => controller.abort();
}

