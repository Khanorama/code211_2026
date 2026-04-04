// workshopService.js — connects to FastAPI backend

import { getDisplayName } from './profileUtils';

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const workshopTools = [
  {
    id: 'essay',
    label: 'Essay drafting',
    description: 'Turn activities and goals into a stronger personal narrative.',
    heading: 'Shape your story into an application essay draft',
    helperText: 'Share the prompt, your target program, and a few moments or values you want featured.',
    placeholder:
      'Example: Draft a 250-word essay for a biomedical research program about how my robotics club taught me to love experimentation and iteration.',
    cta: 'Draft essay',
  },
  {
    id: 'email',
    label: 'Email drafting',
    description: 'Create polished outreach or follow-up messages quickly.',
    heading: 'Generate outreach emails for coordinators, recruiters, or labs',
    helperText: 'Mention who you are writing to, why you are reaching out, and the tone you want.',
    placeholder:
      'Example: Write an email to the Palatine Park District asking about Saturday volunteer shifts for a 16-year-old interested in community service.',
    cta: 'Draft email',
  },
  {
    id: 'guidance',
    label: 'Application guidance',
    description: 'Get a practical game plan for next steps and preparation.',
    heading: 'Build a concrete application plan',
    helperText: 'Describe the opportunity you are targeting and where you feel blocked.',
    placeholder:
      'Example: Help me prepare to apply for the Hiwin engineering internship when I only have school projects and one club role.',
    cta: 'Generate guidance',
  },
];

export const generateWorkshopResponse = async ({ tool, prompt, profile }) => {
  const firstName = getDisplayName({ fullName: profile.fullName || 'Student' }).split(' ')[0];

  try {
    const student = {
      name: firstName,
      grade: profile.grade === 'high-school' ? 11 : (parseInt(profile.grade) || 11),
      school: profile.school || 'Palatine High School',
      skills: (profile.skills || '').split(',').map((s) => s.trim()).filter(Boolean),
      interests: (profile.interests || '').split(',').map((s) => s.trim()).filter(Boolean),
      career_goals: profile.goals || '',
    };

    // Email tool uses /draft-email; everything else uses /workshop
    if (tool === 'email') {
      const res = await fetch(`${API}/draft-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student,
          match: { org_name: prompt, why_it_fits: '', contact: '' },
          custom_prompt: prompt,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const emailText = data.email || '';
      const subjectMatch = emailText.match(/Subject:\s*(.+)/i);
      const bodyStart = emailText.indexOf('\n\n');

      return {
        title: 'AI-drafted outreach email',
        summary: 'Generated using your profile and OpenAI GPT-4o-mini.',
        sections: [
          {
            label: subjectMatch?.[1]?.trim() || 'Email draft',
            text: bodyStart > -1 ? emailText.slice(bodyStart).trim() : emailText,
          },
          {
            label: 'Coach notes',
            text: 'Keep the final version under 150 words, personalise one sentence about the recipient, and end with a low-friction ask.',
          },
        ],
      };
    }

    const res = await fetch(`${API}/workshop`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tool, prompt, student }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();

  } catch (err) {
    console.warn('Workshop backend unavailable, using fallback:', err.message);
    const { generateWorkshopResponse: original } = await import('./workshopService_backup.js');
    return original({ tool, prompt, profile });
  }
};

