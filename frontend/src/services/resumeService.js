// resumeService.js — connects to FastAPI backend

import { splitCommaSeparated } from './profileUtils';

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const parseResume = async (file, profile) => {
  const formData = new FormData();
  formData.append('file', file);

  try {
    const res = await fetch(`${API}/parse-resume`, { method: 'POST', body: formData });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const parsed = data.resume_data || {};

    const currentSkills = splitCommaSeparated(profile.skills);
    const currentInterests = splitCommaSeparated(profile.interests);
    const extractedSkills = Array.isArray(parsed.skills) ? parsed.skills : [];
    const extractedInterests = Array.isArray(parsed.interests) ? parsed.interests : [];

    return {
      recommendedTrack: parsed.career_goals || 'Profile extracted from resume',
      summary: `Resume parsed for ${parsed.name || file.name}. Skills and interests extracted by OpenAI.`,
      extractedSkills: [...new Set([...currentSkills, ...extractedSkills])].slice(0, 8),
      suggestedInterests: [...new Set([...currentInterests, ...extractedInterests])].slice(0, 6),
    };

  } catch (err) {
    console.warn('Resume parse failed, using fallback:', err.message);
    // Fallback — infer track from filename
    const { parseResume: original } = await import('./resumeService_backup.js');
    return original(file, profile);
  }
};

