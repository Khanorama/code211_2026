export const emptyProfile = {
  fullName: '',
  education: '',
  skills: '',
  interests: '',
  experience: '',
  school: '',
  location: '',
  age: '',
  grade: '',
  bio: '',
  goals: '',
  resumeFileName: '',
  resumeInsights: null,
};

const completionFields = [
  'fullName',
  'education',
  'skills',
  'interests',
  'experience',
  'school',
  'location',
  'age',
  'grade',
  'goals',
];

export const splitCommaSeparated = (value = '') =>
  value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

export const getProfileCompletion = (profile = emptyProfile) => {
  const completedCount = completionFields.filter((field) =>
    String(profile[field] ?? '')
      .trim()
      .length
  ).length;

  return Math.round((completedCount / completionFields.length) * 100);
};

export const getDisplayName = (user) => {
  if (!user) {
    return '';
  }

  if (user.fullName?.trim()) {
    return user.fullName.trim();
  }

  return user.email?.split('@')[0] || 'Student Explorer';
};

export const buildUserFromCredentials = ({ email, fullName }) => {
  const normalizedEmail = email.trim().toLowerCase();
  const cleanedName = fullName?.trim();

  return {
    id: normalizedEmail,
    email: normalizedEmail,
    fullName:
      cleanedName ||
      normalizedEmail
        .split('@')[0]
        .split(/[._-]/)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' '),
  };
};
