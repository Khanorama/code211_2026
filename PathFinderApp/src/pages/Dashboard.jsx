import { useDeferredValue, useEffect, useState } from 'react';
import { useUser } from '../context/useUser';
import { fetchMatchedOpportunities } from '../services/mockOpportunityService';
import { getProfileCompletion } from '../services/profileUtils';

const Dashboard = () => {
  const { profile } = useUser();
  const [opportunities, setOpportunities] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [trackFilter, setTrackFilter] = useState('all');
  const [sortBy, setSortBy] = useState('match');
  const deferredQuery = useDeferredValue(searchQuery);

  useEffect(() => {
    let isActive = true;

    const loadOpportunities = async () => {
      setIsLoading(true);

      try {
        const matchedOpportunities = await fetchMatchedOpportunities(profile);

        if (isActive) {
          setOpportunities(matchedOpportunities);
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    loadOpportunities();

    return () => {
      isActive = false;
    };
  }, [profile]);

  const normalizedQuery = deferredQuery.trim().toLowerCase();
  const visibleOpportunities = opportunities.filter((opportunity) => {
    const matchesFilter = trackFilter === 'all' || opportunity.type === trackFilter;
    const haystack = [
      opportunity.title,
      opportunity.organization,
      opportunity.description,
      opportunity.location,
      ...opportunity.tags,
    ]
      .join(' ')
      .toLowerCase();

    return matchesFilter && (!normalizedQuery || haystack.includes(normalizedQuery));
  });

  visibleOpportunities.sort((left, right) => {
    if (sortBy === 'title') {
      return left.title.localeCompare(right.title);
    }

    if (sortBy === 'organization') {
      return left.organization.localeCompare(right.organization);
    }

    return right.matchScore - left.matchScore;
  });

  const completion = getProfileCompletion(profile);
  const topOpportunity = opportunities[0];

  return (
    <section className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Matched opportunities</p>
          <h1>Explore the best internships and research roles for your profile.</h1>
          <p className="lead">
            Rankings are generated from mock scraped data using the academic, skill, and interest
            signals in your profile.
          </p>
        </div>

        <div className="stat-grid">
          <article className="stat-card">
            <span className="stat-card__label">Total matches</span>
            <strong>{isLoading ? '...' : opportunities.length}</strong>
            <p>Updated every time your profile changes.</p>
          </article>
          <article className="stat-card">
            <span className="stat-card__label">Best fit</span>
            <strong>{topOpportunity ? `${topOpportunity.matchScore}%` : 'N/A'}</strong>
            <p>{topOpportunity ? topOpportunity.title : 'Add more profile detail to improve ranking.'}</p>
          </article>
          <article className="stat-card">
            <span className="stat-card__label">Profile readiness</span>
            <strong>{completion}%</strong>
            <p>Richer profiles create better mocked recommendations.</p>
          </article>
        </div>
      </header>

      <div className="panel stack-lg">
        <div className="dashboard-controls">
          <label className="field field--grow">
            <span>Search</span>
            <input
              className="input"
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search title, organization, tags, or location"
            />
          </label>

          <label className="field">
            <span>Track</span>
            <select className="input" value={trackFilter} onChange={(event) => setTrackFilter(event.target.value)}>
              <option value="all">All opportunities</option>
              <option value="internship">Internships</option>
              <option value="research">Research</option>
            </select>
          </label>

          <label className="field">
            <span>Sort</span>
            <select className="input" value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
              <option value="match">Highest match score</option>
              <option value="title">Title A-Z</option>
              <option value="organization">Organization A-Z</option>
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
        ) : visibleOpportunities.length ? (
          <div className="opportunity-grid">
            {visibleOpportunities.map((opportunity) => (
              <article key={opportunity.id} className="opportunity-card">
                <div className="opportunity-card__header">
                  <div>
                    <p className="eyebrow">{opportunity.organization}</p>
                    <h2>{opportunity.title}</h2>
                  </div>
                  <span className="score-badge">{opportunity.matchScore}% match</span>
                </div>

                <p>{opportunity.description}</p>

                <div className="opportunity-card__meta">
                  <span>{opportunity.type === 'research' ? 'Research' : 'Internship'}</span>
                  <span>{opportunity.location}</span>
                  <span>{opportunity.gradeLevel}</span>
                </div>

                <div className="tag-row">
                  {opportunity.tags.map((tag) => (
                    <span key={tag} className="tag">
                      {tag}
                    </span>
                  ))}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <h2>No matches for that filter</h2>
            <p>Try a broader keyword or switch back to all opportunity types.</p>
          </div>
        )}
      </div>
    </section>
  );
};

export default Dashboard;
