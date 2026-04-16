# PathFinder — Level Up
### D211 + D15 Student Career Quest System

---

## Quick start — two terminals

### Step 1: Add your OpenAI key

Open `backend/.env` and replace `PASTE_YOUR_OPENAI_KEY_HERE` with your key from
https://platform.openai.com/api-keys

No other API keys are needed. Web scraping uses DuckDuckGo — free, no account required.

### Terminal 1 — backend

```bash
cd backend
python -m venv venv
source venv/bin/activate   # Windows: .\venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### Terminal 2 — frontend

```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173**. Sign in with any email + password.

---

## How the scraper works

1. Reads the student's interests, skills, location, and career goals from their profile.
2. Builds up to 8 targeted DuckDuckGo search queries — e.g.:
   - `"Computer Science Animals volunteer near Palatine IL high school student"`
   - `"STEM internship Palatine high school 2026"`
   - `"site:volunteermatch.org Palatine volunteer"`
3. Scrapes DuckDuckGo's HTML results page (no API key, no quota).
4. Fetches and parses each real result page — extracts org name, description, email, schedule, tags.
5. Returns ALL results sorted by profile relevance. Nothing hardcoded, nothing excluded by schedule.
6. Passes everything to GPT-4o-mini for personalised ranking and "why it fits" summaries.
7. If all fetches fail (network issue), the AI generates suggestions from its own knowledge.

Search takes 15–30 seconds depending on how many pages are fetched.

---

## API endpoints

| Method | Route | Description |
|---|---|---|
| `GET` | `/orgs` | Generic org list |
| `POST` | `/search/stream` | SSE: DDG scrape → AI rank → stream results |
| `POST` | `/parse-resume` | Upload PDF → OpenAI extracts profile |
| `POST` | `/draft-email` | One-click personalised outreach email |
| `POST` | `/workshop` | Essay / guidance drafts |
| `GET` | `/health` | Server status |
