import { startTransition, useState } from 'react';
import { useUser } from '../context/useUser';
import { generateWorkshopResponse, workshopTools } from '../services/mockWorkshopService';

const Workshop = () => {
  const { profile } = useUser();
  const [activeTool, setActiveTool] = useState(workshopTools[0].id);
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState(null);
  const [history, setHistory] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);

  const currentTool = workshopTools.find((tool) => tool.id === activeTool);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      return;
    }

    setIsGenerating(true);

    try {
      const nextResponse = await generateWorkshopResponse({
        tool: activeTool,
        prompt,
        profile,
      });

      startTransition(() => {
        setResponse(nextResponse);
        setHistory((current) => [
          {
            id: `${activeTool}-${Date.now()}`,
            tool: currentTool.label,
            title: nextResponse.title,
            preview: nextResponse.summary,
            time: new Date().toLocaleTimeString([], {
              hour: 'numeric',
              minute: '2-digit',
            }),
          },
          ...current,
        ].slice(0, 4));
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <section className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">AI-assisted workshop</p>
          <h1>Draft materials with a focused writing and planning workspace.</h1>
          <p className="lead">
            Switch between essay support, outreach emails, and application guidance. Responses are
            mocked, but shaped by your saved profile.
          </p>
        </div>

        <div className="info-banner">
          <span className="status-dot" />
          Demo mode uses mocked responses only. No external API is called.
        </div>
      </header>

      <div className="workshop-layout">
        <aside className="panel stack-lg">
          <div className="section-copy">
            <p className="eyebrow">Tools</p>
            <h2>Choose a workspace</h2>
          </div>

          <div className="tool-list">
            {workshopTools.map((tool) => (
              <button
                key={tool.id}
                className={tool.id === activeTool ? 'tool-button tool-button--active' : 'tool-button'}
                type="button"
                onClick={() => setActiveTool(tool.id)}
              >
                <span>{tool.label}</span>
                <small>{tool.description}</small>
              </button>
            ))}
          </div>

          <div className="summary-list">
            <article className="summary-list__item">
              <span>Current focus</span>
              <p>{currentTool.description}</p>
            </article>
            <article className="summary-list__item">
              <span>Profile context used</span>
              <p>{profile.skills || 'Add skills in your profile to personalize this workshop more.'}</p>
            </article>
          </div>
        </aside>

        <div className="stack-lg">
          <section className="panel stack-lg">
            <div className="section-copy">
              <p className="eyebrow">{currentTool.label}</p>
              <h2>{currentTool.heading}</h2>
              <p>{currentTool.helperText}</p>
            </div>

            <label className="field">
              <span>Your prompt</span>
              <textarea
                className="input input--textarea input--lg"
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                placeholder={currentTool.placeholder}
              />
            </label>

            <div className="button-row">
              <button className="button button--primary" type="button" onClick={handleGenerate} disabled={isGenerating}>
                {isGenerating ? 'Generating...' : currentTool.cta}
              </button>
            </div>
          </section>

          <section className="panel stack-lg">
            <div className="section-copy">
              <p className="eyebrow">Output</p>
              <h2>Generated response</h2>
            </div>

            {response ? (
              <div className="response-panel">
                <div className="response-panel__header">
                  <div>
                    <p className="eyebrow">{currentTool.label}</p>
                    <h2>{response.title}</h2>
                  </div>
                  <span className="tag tag--soft">Mock AI</span>
                </div>

                <p>{response.summary}</p>

                <div className="stack">
                  {response.sections.map((section) => (
                    <article key={section.label} className="response-block">
                      <h3>{section.label}</h3>
                      <p>{section.text}</p>
                    </article>
                  ))}
                </div>
              </div>
            ) : (
              <div className="empty-state">
                <h2>No draft yet</h2>
                <p>Enter a prompt and generate a mock response for the selected workshop tool.</p>
              </div>
            )}
          </section>

          <section className="panel stack-lg">
            <div className="section-copy">
              <p className="eyebrow">Recent generations</p>
              <h2>Session history</h2>
            </div>

            {history.length ? (
              <div className="history-list">
                {history.map((entry) => (
                  <article key={entry.id} className="history-list__item">
                    <div>
                      <p className="eyebrow">{entry.tool}</p>
                      <h3>{entry.title}</h3>
                      <p>{entry.preview}</p>
                    </div>
                    <span>{entry.time}</span>
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty-state empty-state--compact">
                <p>Recent drafts will appear here after you generate them.</p>
              </div>
            )}
          </section>
        </div>
      </div>
    </section>
  );
};

export default Workshop;
