import { startTransition, useEffect, useState } from 'react';
import { useUser } from '../context/useUser';
import { parseResume } from '../services/mockResumeService';
import { emptyProfile, getProfileCompletion } from '../services/profileUtils';

const Profile = () => {
  const { profile, isProfileLoading, saveProfile } = useUser();
  const [formData, setFormData] = useState(profile);
  const [isSaving, setIsSaving] = useState(false);
  const [isParsingResume, setIsParsingResume] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  useEffect(() => {
    setFormData({ ...emptyProfile, ...profile });
  }, [profile]);

  const completion = getProfileCompletion(formData);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
  };

  const handleResumeUpload = async (event) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setIsParsingResume(true);
    setStatusMessage(`Parsing ${file.name} and generating mock profile suggestions...`);

    try {
      const parsedResume = await parseResume(file, formData);

      startTransition(() => {
        setFormData((current) => ({
          ...current,
          resumeFileName: file.name,
          resumeInsights: parsedResume,
          skills: current.skills.trim() || parsedResume.extractedSkills.join(', '),
          interests: current.interests.trim() || parsedResume.suggestedInterests.join(', '),
        }));
      });

      setStatusMessage('Resume uploaded. We added mock insights and suggested tags for review.');
    } finally {
      setIsParsingResume(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSaving(true);
    setStatusMessage('Saving profile to mock Supabase...');

    try {
      await saveProfile(formData);
      setStatusMessage('Profile saved. Your dashboard matches will reflect the latest updates.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Student profile</p>
          <h1>Shape the signals behind your opportunity matches.</h1>
          <p className="lead">
            Save coursework, interests, goals, and resume context so the app can rank better
            internships and research roles.
          </p>
        </div>

        <div className="stat-grid">
          <article className="stat-card">
            <span className="stat-card__label">Completion</span>
            <strong>{completion}%</strong>
            <p>Based on core onboarding fields.</p>
          </article>
          <article className="stat-card">
            <span className="stat-card__label">Resume status</span>
            <strong>{formData.resumeFileName ? 'Uploaded' : 'Pending'}</strong>
            <p>{formData.resumeFileName || 'Add a resume for mock parsing insights.'}</p>
          </article>
          <article className="stat-card">
            <span className="stat-card__label">Database</span>
            <strong>Supabase</strong>
            <p>Profile data persists locally between sessions.</p>
          </article>
        </div>
      </header>

      <div className="page-grid">
        <form className="panel stack-lg" onSubmit={handleSubmit}>
          <div className="section-copy">
            <p className="eyebrow">Core details</p>
            <h2>Academic and personal background</h2>
          </div>

          {isProfileLoading ? (
            <div className="info-banner">Loading saved profile data...</div>
          ) : null}

          {statusMessage ? <p className="status-message">{statusMessage}</p> : null}

          <div className="form-grid">
            <label className="field">
              <span>Full name</span>
              <input
                className="input"
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                placeholder="Avery Johnson"
              />
            </label>

            <label className="field">
              <span>School</span>
              <input
                className="input"
                type="text"
                name="school"
                value={formData.school}
                onChange={handleChange}
                placeholder="University of Washington"
              />
            </label>

            <label className="field">
              <span>Education</span>
              <input
                className="input"
                type="text"
                name="education"
                value={formData.education}
                onChange={handleChange}
                placeholder="B.S. Computer Science, class of 2028"
              />
            </label>

            <label className="field">
              <span>Location</span>
              <input
                className="input"
                type="text"
                name="location"
                value={formData.location}
                onChange={handleChange}
                placeholder="Seattle, WA"
              />
            </label>

            <label className="field">
              <span>Age</span>
              <input
                className="input"
                type="number"
                name="age"
                value={formData.age}
                onChange={handleChange}
                placeholder="19"
              />
            </label>

            <label className="field">
              <span>Grade</span>
              <select className="input" name="grade" value={formData.grade} onChange={handleChange}>
                <option value="">Select a level</option>
                <option value="high-school">High school</option>
                <option value="college">College</option>
              </select>
            </label>
          </div>

          <label className="field">
            <span>Skills</span>
            <input
              className="input"
              type="text"
              name="skills"
              value={formData.skills}
              onChange={handleChange}
              placeholder="React, Python, data analysis, public speaking"
            />
          </label>

          <label className="field">
            <span>Interests</span>
            <input
              className="input"
              type="text"
              name="interests"
              value={formData.interests}
              onChange={handleChange}
              placeholder="AI, neuroscience, startups, healthcare equity"
            />
          </label>

          <label className="field">
            <span>Experience</span>
            <textarea
              className="input input--textarea"
              name="experience"
              value={formData.experience}
              onChange={handleChange}
              placeholder="Hackathons, clubs, volunteer work, classes, research labs, part-time jobs..."
            />
          </label>

          <label className="field">
            <span>Goals</span>
            <textarea
              className="input input--textarea"
              name="goals"
              value={formData.goals}
              onChange={handleChange}
              placeholder="What kinds of internships or research environments are you targeting?"
            />
          </label>

          <label className="field">
            <span>Other basic info</span>
            <textarea
              className="input input--textarea input--sm"
              name="bio"
              value={formData.bio}
              onChange={handleChange}
              placeholder="Add context like availability, clubs, certifications, or career story."
            />
          </label>

          <div className="upload-card">
            <div>
              <p className="eyebrow">Resume upload</p>
              <h2>Attach a resume for mock parsing</h2>
              <p>
                Upload is UI-only, but we simulate extracted skills, interest suggestions, and fit
                guidance.
              </p>
            </div>

            <label className="button button--secondary button--file">
              <input
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={handleResumeUpload}
                hidden
              />
              {isParsingResume ? 'Parsing resume...' : 'Upload resume'}
            </label>
          </div>

          {formData.resumeFileName ? (
            <div className="tag-row">
              <span className="tag tag--soft">{formData.resumeFileName}</span>
              <span className="tag tag--soft">Mock parsed</span>
            </div>
          ) : null}

          <div className="button-row">
            <button className="button button--primary" type="submit" disabled={isSaving || isProfileLoading}>
              {isSaving ? 'Saving...' : 'Save profile'}
            </button>
          </div>
        </form>

        <aside className="panel stack-lg">
          <div className="section-copy">
            <p className="eyebrow">Live summary</p>
            <h2>What the app sees about you</h2>
          </div>

          <div className="completion-meter">
            <div className="completion-meter__bar">
              <span style={{ width: `${completion}%` }} />
            </div>
            <p>{completion}% of key fields completed</p>
          </div>

          <div className="summary-list">
            <article className="summary-list__item">
              <span>Skills snapshot</span>
              <p>{formData.skills || 'Add a few skills to improve matching quality.'}</p>
            </article>
            <article className="summary-list__item">
              <span>Interest areas</span>
              <p>{formData.interests || 'Research domains, functions, or industries can go here.'}</p>
            </article>
            <article className="summary-list__item">
              <span>Experience signal</span>
              <p>{formData.experience || 'Clubs, projects, and coursework all count here.'}</p>
            </article>
          </div>

          {formData.resumeInsights ? (
            <div className="resume-insights">
              <p className="eyebrow">Mock parser insights</p>
              <h2>{formData.resumeInsights.recommendedTrack}</h2>
              <p>{formData.resumeInsights.summary}</p>

              <div className="stack">
                <div>
                  <p className="resume-insights__label">Extracted skills</p>
                  <div className="tag-row">
                    {formData.resumeInsights.extractedSkills.map((skill) => (
                      <span key={skill} className="tag">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="resume-insights__label">Suggested interests</p>
                  <div className="tag-row">
                    {formData.resumeInsights.suggestedInterests.map((interest) => (
                      <span key={interest} className="tag tag--soft">
                        {interest}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="empty-state">
              <h2>No resume insights yet</h2>
              <p>Upload a file to simulate parsing and seed the form with mock recommendations.</p>
            </div>
          )}
        </aside>
      </div>
    </section>
  );
};

export default Profile;
