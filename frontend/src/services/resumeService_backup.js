import { splitCommaSeparated } from './profileUtils';

const wait = (duration) => new Promise((resolve) => setTimeout(resolve, duration));

const tracks = {
  research: {
    recommendedTrack: 'Research-ready profile',
    summary:
      'Your resume suggests strong curiosity-driven work. Lean into methods, lab experience, and questions you want to investigate.',
    extractedSkills: ['Python', 'data analysis', 'literature review', 'experimentation'],
    suggestedInterests: ['machine learning', 'biomedical research', 'human-centered AI'],
  },
  community: {
    recommendedTrack: 'People and impact profile',
    summary:
      'This resume reads well for mission-driven internships where communication, coordination, and service matter.',
    extractedSkills: ['project coordination', 'writing', 'outreach', 'event planning'],
    suggestedInterests: ['education equity', 'public policy', 'community health'],
  },
  engineering: {
    recommendedTrack: 'Technical internship profile',
    summary:
      'The resume points toward product-building and engineering work. Highlight projects, tools, and what you shipped.',
    extractedSkills: ['React', 'JavaScript', 'Git', 'UI development'],
    suggestedInterests: ['software engineering', 'product design', 'frontend systems'],
  },
};

const inferTrack = (fileName = '', profile = {}) => {
  const combinedText = `${fileName} ${profile.skills} ${profile.interests} ${profile.experience}`.toLowerCase();

  if (/(research|lab|biology|data|ml|ai|science)/.test(combinedText)) {
    return 'research';
  }

  if (/(community|policy|outreach|service|mentor|nonprofit)/.test(combinedText)) {
    return 'community';
  }

  return 'engineering';
};

export const parseResume = async (file, profile) => {
  await wait(1000);

  const track = tracks[inferTrack(file.name, profile)];
  const currentSkills = splitCommaSeparated(profile.skills);
  const currentInterests = splitCommaSeparated(profile.interests);

  return {
    recommendedTrack: track.recommendedTrack,
    summary: `${track.summary} File reviewed: ${file.name}.`,
    extractedSkills: [...new Set([...currentSkills, ...track.extractedSkills])].slice(0, 6),
    suggestedInterests: [...new Set([...currentInterests, ...track.suggestedInterests])].slice(0, 5),
  };
};
