import { getDisplayName } from './profileUtils';

const wait = (duration) => new Promise((resolve) => setTimeout(resolve, duration));

export const workshopTools = [
  {
    id: 'essay',
    label: 'Essay drafting',
    description: 'Turn activities and goals into a stronger personal narrative.',
    heading: 'Shape your story into an application essay draft',
    helperText:
      'Share the prompt, your target program, and a few moments or values you want featured.',
    placeholder:
      'Example: Draft a 250-word essay for a biomedical research program about how my robotics club taught me to love experimentation and iteration.',
    cta: 'Draft essay',
  },
  {
    id: 'email',
    label: 'Email drafting',
    description: 'Create polished outreach or follow-up messages quickly.',
    heading: 'Generate outreach emails for mentors, recruiters, or labs',
    helperText:
      'Mention who you are writing to, why you are reaching out, and the tone you want to strike.',
    placeholder:
      'Example: Write a concise email to a professor asking about undergraduate lab openings in AI for healthcare.',
    cta: 'Draft email',
  },
  {
    id: 'guidance',
    label: 'Application guidance',
    description: 'Get a practical game plan for next steps and preparation.',
    heading: 'Build a concrete application plan',
    helperText:
      'Describe the opportunity you are targeting and where you feel blocked or uncertain.',
    placeholder:
      'Example: Help me prepare for software internship applications when I only have class projects and one club leadership role.',
    cta: 'Generate guidance',
  },
];

export const generateWorkshopResponse = async ({ tool, prompt, profile }) => {
  await wait(750);

  const firstName = getDisplayName({ fullName: profile.fullName || 'Student Explorer' }).split(' ')[0];
  const profileContext =
    profile.skills || profile.interests || 'your current profile details and goals';

  if (tool === 'email') {
    return {
      title: 'Professional outreach draft',
      summary: `This mock email uses ${profileContext} to sound specific and credible without overexplaining.`,
      sections: [
        {
          label: 'Draft',
          text: `Subject: Interest in opportunities related to ${profile.interests || 'your field'}\n\nHello,\n\nMy name is ${firstName}, and I am reaching out because ${prompt}. I am especially interested in opportunities where I can contribute through ${profile.skills || 'my developing technical and communication skills'}. I would appreciate any guidance on potential openings or the best next step to learn more.\n\nThank you for your time,\n${firstName}`,
        },
        {
          label: 'Coach notes',
          text: 'Keep the final version under 150 words, personalize one sentence about the recipient, and end with a low-friction ask.',
        },
      ],
    };
  }

  if (tool === 'guidance') {
    return {
      title: 'Application game plan',
      summary: `This response turns your prompt into an action plan anchored in ${profileContext}.`,
      sections: [
        {
          label: 'Recommended approach',
          text: `Start by clarifying the strongest evidence you already have. Based on your prompt, highlight experience in ${profile.skills || 'your current strengths'}, connect it to the opportunity, and show momentum rather than perfection.`,
        },
        {
          label: 'Next three moves',
          text: '1. Tailor your resume bullets to the exact role language.\n2. Prepare one story about initiative, one about learning, and one about collaboration.\n3. Build a deadline tracker for materials, outreach, and follow-up.',
        },
      ],
    };
  }

  return {
    title: 'Essay narrative starter',
    summary: `This draft frames your experiences around ${profile.interests || 'the themes in your prompt'} and keeps the story grounded in growth.`,
    sections: [
      {
        label: 'Opening direction',
        text: `${prompt} One strong way to open is with a concrete moment that shows curiosity in action, then zoom out to explain how that moment shaped your goals.`,
      },
      {
        label: 'Draft body',
        text: `${firstName} discovered that meaningful work happens at the intersection of curiosity and follow-through. Through experiences involving ${profile.skills || 'hands-on learning and persistence'}, that curiosity became a clearer commitment to opportunities where learning turns into impact. The next step is to connect those experiences to the program, showing not only what has been done so far, but also why this opportunity is the right place to keep growing.`,
      },
    ],
  };
};
