import { splitCommaSeparated } from './profileUtils';

const wait = (duration) => new Promise((resolve) => setTimeout(resolve, duration));

const scrapedOpportunities = [
  {
    id: 'opp-1',
    title: 'Frontend Engineering Intern',
    organization: 'BlueWave Labs',
    description:
      'Build accessible interfaces for student-facing tools, collaborate with designers, and ship React features each sprint.',
    type: 'internship',
    location: 'Remote',
    gradeLevel: 'College students',
    tags: ['React', 'frontend', 'design systems'],
    baseScore: 77,
  },
  {
    id: 'opp-2',
    title: 'AI Research Assistant',
    organization: 'Northview Cognitive Lab',
    description:
      'Support experiments, clean datasets, and help analyze findings for active AI and cognition studies.',
    type: 'research',
    location: 'Chicago, IL',
    gradeLevel: 'College students',
    tags: ['Python', 'machine learning', 'research'],
    baseScore: 79,
  },
  {
    id: 'opp-3',
    title: 'High School STEM Summer Research Fellow',
    organization: 'Metro BioDiscovery Center',
    description:
      'Join a mentored summer cohort, learn lab routines, and present findings at the end-of-program showcase.',
    type: 'research',
    location: 'Boston, MA',
    gradeLevel: 'High school students',
    tags: ['biology', 'research', 'presentation'],
    baseScore: 73,
  },
  {
    id: 'opp-4',
    title: 'Product Operations Intern',
    organization: 'Pathlight Health',
    description:
      'Work across analytics, customer success, and product teams to improve how healthcare programs are delivered.',
    type: 'internship',
    location: 'Hybrid - Austin, TX',
    gradeLevel: 'High school or college',
    tags: ['operations', 'communication', 'healthcare'],
    baseScore: 71,
  },
  {
    id: 'opp-5',
    title: 'Computational Biology Research Intern',
    organization: 'Genomic Futures Institute',
    description:
      'Blend scripting, bioinformatics workflows, and literature review to support active genomics projects.',
    type: 'research',
    location: 'San Diego, CA',
    gradeLevel: 'College students',
    tags: ['Python', 'bioinformatics', 'data analysis'],
    baseScore: 80,
  },
  {
    id: 'opp-6',
    title: 'Community Impact Fellowship',
    organization: 'BridgeWorks Foundation',
    description:
      'Design outreach campaigns, partner with local schools, and turn student insights into program recommendations.',
    type: 'internship',
    location: 'Remote',
    gradeLevel: 'High school or college',
    tags: ['outreach', 'writing', 'education equity'],
    baseScore: 69,
  },
];

const scoreOpportunity = (opportunity, profile) => {
  const skills = splitCommaSeparated(profile.skills).map((item) => item.toLowerCase());
  const interests = splitCommaSeparated(profile.interests).map((item) => item.toLowerCase());
  const profileText = `${profile.education} ${profile.experience} ${profile.goals} ${profile.bio}`.toLowerCase();

  let score = opportunity.baseScore;

  opportunity.tags.forEach((tag) => {
    const normalizedTag = tag.toLowerCase();

    if (skills.some((skill) => skill.includes(normalizedTag) || normalizedTag.includes(skill))) {
      score += 8;
    } else if (interests.some((interest) => interest.includes(normalizedTag) || normalizedTag.includes(interest))) {
      score += 6;
    } else if (profileText.includes(normalizedTag)) {
      score += 4;
    }
  });

  if (profile.grade === 'high-school' && opportunity.gradeLevel.toLowerCase().includes('high school')) {
    score += 6;
  }

  if (profile.grade === 'college' && opportunity.gradeLevel.toLowerCase().includes('college')) {
    score += 6;
  }

  if (profile.location && opportunity.location.toLowerCase().includes(profile.location.toLowerCase())) {
    score += 3;
  }

  return Math.max(58, Math.min(98, score));
};

export const fetchMatchedOpportunities = async (profile) => {
  await wait(900);

  return scrapedOpportunities
    .map((opportunity) => ({
      ...opportunity,
      matchScore: scoreOpportunity(opportunity, profile),
    }))
    .sort((left, right) => right.matchScore - left.matchScore);
};
