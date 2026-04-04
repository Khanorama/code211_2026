"""
PathFinder — Level Up  |  FastAPI backend
"""

import os, json, re, base64, time
from fastapi import FastAPI, UploadFile, File
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
import openai
from dotenv import load_dotenv
from scraper import get_personalized_orgs, get_orgs_cached

load_dotenv()

app = FastAPI(title="PathFinder API")
client = openai.OpenAI(api_key=os.getenv("OPENAI_API_KEY", ""))

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── GET /orgs  (generic, no profile) ─────────────────────────────────────────

@app.get("/orgs")
def list_orgs():
    return get_orgs_cached()


# ─── POST /orgs/personalized  (profile-aware) ─────────────────────────────────

@app.post("/orgs/personalized")
def personalized_orgs(payload: dict):
    """Return orgs scraped and filtered for this specific student profile."""
    profile = payload.get("student", payload.get("profile", {}))
    return get_personalized_orgs(profile)


# ─── POST /parse-resume ───────────────────────────────────────────────────────

@app.post("/parse-resume")
async def parse_resume(file: UploadFile = File(...)):
    contents = await file.read()
    resume_text = ""

    if file.filename and file.filename.lower().endswith(".pdf"):
        try:
            from pypdf import PdfReader
            import io
            reader = PdfReader(io.BytesIO(contents))
            pages = [p.extract_text() or "" for p in reader.pages]
            resume_text = "\n\n".join(t for t in pages if t.strip()).strip()
        except Exception as e:
            print(f"pypdf failed: {e}")

    schema = (
        'Return ONLY valid JSON, no markdown:\n'
        '{"name":"","grade":"","school":"","location":"","skills":[],'
        '"interests":[],"experience":[],"career_goals":""}'
    )

    if resume_text:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "Extract structured info from resumes. Return only valid JSON, no markdown."},
                {"role": "user",   "content": f"{schema}\n\nResume text:\n{resume_text[:6000]}"},
            ],
            temperature=0.1, max_tokens=500,
        )
        raw = re.sub(r"^```(?:json)?\s*", "", response.choices[0].message.content.strip())
        raw = re.sub(r"\s*```$", "", raw).strip()
    else:
        b64 = base64.b64encode(contents).decode("utf-8")
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[{"role": "user", "content": [
                {"type": "text", "text": schema},
                {"type": "image_url", "image_url": {"url": f"data:{file.content_type};base64,{b64}"}},
            ]}],
            max_tokens=500,
        )
        raw = response.choices[0].message.content.strip()

    try:
        return {"resume_data": json.loads(raw)}
    except Exception:
        return {"resume_data": {}}


# ─── POST /search/stream ──────────────────────────────────────────────────────

@app.post("/search/stream")
async def search_stream(payload: dict):
    """
    SSE: scrape orgs personalised to the student, then stream AI matching.
    Events:  data: {"type": "thought"|"result"|"error", "payload": ...}
    """
    student = payload.get("student", {})

    def event_stream():
        def send(t, c):
            return f"data: {json.dumps({'type': t, 'payload': c})}\n\n"

        name      = (student.get("name") or "you").split()[0]
        interests = ", ".join(student.get("interests") or []) or "your interests"
        cluster   = student.get("career_cluster") or "General"
        location  = student.get("location") or "Palatine, IL"

        yield send("thought", f"Initializing PathFinder for {name}...")
        yield send("thought", f"Interests detected: {interests}")
        yield send("thought", f"Searching for real local opportunities near {location}...")
        yield send("thought", "Running Google search queries tailored to your profile...")

        # Live Google-powered scrape — every query, every result
        try:
            orgs = get_personalized_orgs(student)
            if orgs:
                yield send("thought", f"Discovered {len(orgs)} real local opportunities — ranking by fit...")
            else:
                yield send("thought", "Web search complete — asking AI to suggest opportunities from knowledge...")
        except Exception as e:
            print(f"Scrape error: {e}")
            orgs = []
            yield send("thought", "Search encountered an issue — AI will suggest opportunities directly...")

        yield send("thought", f"Matching against career cluster: {cluster}")
        yield send("thought", "Ranking all opportunities by interest and career fit...")

        # Build the user prompt depending on whether we got scraped data
        if orgs:
            data_section = (
                f"Scraped live opportunities (ALL must be included in results):\n"
                f"{json.dumps(orgs, indent=2)}\n\n"
                f"Return ALL {len(orgs)} opportunities. "
                f"Do NOT filter any out based on schedule or availability — "
                f"only exclude if the student stated an explicit hard restriction. "
                f"Copy each org's 'website' field exactly as-is into your JSON."
            )
        else:
            data_section = (
                f"No scraped data was available (Google API keys may be missing or quota exceeded).\n\n"
                f"Use your own knowledge to suggest 6-8 REAL volunteer and internship opportunities "
                f"that actually exist near {location} for a {cluster} student. "
                f"Include real org names, real websites, real contact info where you know it. "
                f"Focus on opportunities relevant to: {interests}. "
                f"Set website to the real URL of each org."
            )

        stream = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are PathFinder, an encouraging AI career coach for high school students. "
                        "First think out loud in 3-4 short sentences referencing the student by "
                        "first name and mentioning specific org names. "
                        "Then write exactly '---RESULT---' on its own line, followed IMMEDIATELY "
                        "by valid JSON (no markdown fences):\n"
                        '{"matches":[' +
                        '{"org_name":"","xp_category":"","xp_value":0,' +
                        '"why_it_fits":"2 sentences personal to this student",' +
                        '"schedule_ok":true,' +
                        '"next_action":"one concrete step the student can take today",' +
                        '"contact":"",' +
                        '"website":"",' +
                        '"tags":[]}' +
                        '],' +
                        '"coach_message":"2-3 motivational sentences","total_xp_available":0}'
                    ),
                },
                {
                    "role": "user",
                    "content": (
                        f"Student profile:\n{json.dumps(student, indent=2)}\n\n"
                        + data_section +
                        f"\n\nBe specific about WHY each org fits this particular student's "
                        f"interests, skills, and career goals."
                    ),
                },
            ],
            stream=True,
            temperature=0.5,
            max_tokens=3000,
        )

        buffer = ""
        result_mode = False

        for chunk in stream:
            delta = chunk.choices[0].delta.content or ""
            buffer += delta

            if "---RESULT---" in buffer and not result_mode:
                thoughts_raw, buffer = buffer.split("---RESULT---", 1)
                for sentence in re.split(r"(?<=[.!?])\s+", thoughts_raw.strip()):
                    if sentence.strip():
                        yield send("thought", sentence.strip())
                result_mode = True
                continue

            if not result_mode:
                parts = re.split(r"(?<=[.!?])\s+", buffer)
                if len(parts) > 1:
                    for sentence in parts[:-1]:
                        if sentence.strip():
                            yield send("thought", sentence.strip())
                    buffer = parts[-1]

        if result_mode and buffer.strip():
            clean = re.sub(r"^```(?:json)?\s*", "", buffer.strip())
            clean = re.sub(r"\s*```$", "", clean).strip()
            try:
                result = json.loads(clean)
                # Backfill website from scraped orgs if AI omitted it
                org_map = {o["name"].lower(): o for o in orgs}
                for m in result.get("matches", []):
                    if not m.get("website"):
                        key = m.get("org_name", "").lower()
                        for k, v in org_map.items():
                            if key in k or k in key:
                                m["website"] = v.get("website", "")
                                break
                n = len(result.get("matches", []))
                yield send("thought", f"Ready — {n} opportunities found for {name}!")
                yield send("result", result)
            except Exception:
                raw_match = re.search(r"\{.*\}", clean, re.DOTALL)
                if raw_match:
                    try:
                        yield send("result", json.loads(raw_match.group(0)))
                    except Exception as e:
                        yield send("error", f"Parse error: {e}")
                else:
                    yield send("error", "Could not parse results. Please try again.")
        elif not result_mode:
            # AI never emitted ---RESULT--- at all — treat whole buffer as error
            yield send("error", "No structured result returned. Please try again.")

        yield "data: [DONE]\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")


# ─── POST /draft-email ────────────────────────────────────────────────────────

@app.post("/draft-email")
async def draft_email(payload: dict):
    """
    Draft a personalised outreach email for a specific opportunity.
    Called automatically (no user prompting required) when clicking
    'Draft Email' on a card.
    """
    student = payload.get("student", {})
    match   = payload.get("match", {})
    custom  = payload.get("custom_prompt", "")

    name      = student.get("name", "Student")
    school    = student.get("school", "Palatine High School")
    grade     = student.get("grade", 11)
    interests = ", ".join(student.get("interests") or [])
    skills    = ", ".join(student.get("skills") or [])
    schedule  = student.get("schedule", "weekends")
    goals     = student.get("career_goals", "")
    org_name  = (match.get("org_name") or match.get("organization") or
                 match.get("title") or custom or "the organization")
    why_fits  = match.get("why_it_fits", "")
    contact   = match.get("contact", "")
    next_step = match.get("next_action", "")
    website   = match.get("website", "")

    prompt = (
        f"Write a short, genuine outreach email from a high school student "
        f"to the volunteer or internship coordinator at {org_name}.\n\n"
        f"Student: {name}, Grade {grade} at {school}\n"
        f"Interests: {interests}\nSkills: {skills}\n"
        f"Availability: {schedule}\nCareer goals: {goals}\n\n"
        f"Why this opportunity fits the student: {why_fits}\n"
        f"Contact info available: {contact}\n"
        f"Organisation website: {website}\n"
        f"Suggested next step: {next_step}\n\n"
        f"Rules:\n"
        f"- First line must be 'Subject: ...'\n"
        f"- 3 short paragraphs, under 180 words total\n"
        f"- Professional but warm — not a template, not robotic\n"
        f"- Reference something specific about {org_name}\n"
        f"- End with a clear, low-friction ask (e.g. 'Would it be possible to...')\n"
        f"- Sign off: name, school, grade"
    )

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {
                "role": "system",
                "content": (
                    "You are a career coach helping high school students write "
                    "outreach emails. Always start with 'Subject:' on the first line. "
                    "Make the email feel genuinely written by this specific student."
                ),
            },
            {"role": "user", "content": prompt},
        ],
        temperature=0.55,
        max_tokens=400,
    )
    return {"email": response.choices[0].message.content}


# ─── POST /workshop ───────────────────────────────────────────────────────────

@app.post("/workshop")
async def workshop(payload: dict):
    tool    = payload.get("tool", "guidance")
    prompt  = payload.get("prompt", "")
    student = payload.get("student", {})

    name      = student.get("name", "the student")
    skills    = ", ".join(student.get("skills") or []) or "various skills"
    interests = ", ".join(student.get("interests") or []) or "multiple interests"
    goals     = student.get("career_goals", "")

    if tool == "essay":
        system = "You are a college application coach. Be specific, warm, and avoid clichés."
        user   = (f"Student: {name}\nSkills: {skills}\nInterests: {interests}\nGoals: {goals}\n\n"
                  f"Essay request: {prompt}\n\nProvide: title, 2-sentence approach, opening direction, draft body paragraph.")
    else:
        system = "You are a career counsellor. Give a practical, encouraging action plan."
        user   = (f"Student: {name}\nSkills: {skills}\nInterests: {interests}\nGoals: {goals}\n\n"
                  f"Request: {prompt}\n\nProvide: title, 1-sentence summary, 'Recommended approach', 'Next three moves'.")

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "system", "content": system}, {"role": "user", "content": user}],
        temperature=0.6, max_tokens=600,
    )

    raw   = response.choices[0].message.content
    lines = raw.strip().split("\n")
    title = lines[0].lstrip("#* ").strip() if lines else "AI Response"
    summary = lines[1].strip() if len(lines) > 1 else ""

    sections, label, text = [], None, []
    for line in lines[2:]:
        s = line.strip()
        if (s.startswith("**") and s.endswith("**") and len(s) < 60) or s.startswith("##"):
            if label: sections.append({"label": label, "text": " ".join(text).strip()})
            label, text = s.strip("*#").strip(), []
        elif s:
            text.append(s)
    if label and text:
        sections.append({"label": label, "text": " ".join(text).strip()})
    if not sections:
        sections = [{"label": "Response", "text": raw}]

    def clean(text):
        import re as _re
        text = _re.sub(r'\*\*([^*]+)\*\*', r'\1', text)   # **bold** -> plain
        text = _re.sub(r'\*([^*]+)\*',   r'\1', text)    # *italic* -> plain
        text = _re.sub(r'^#+\s+', '', text, flags=_re.MULTILINE)  # ## headings
        text = _re.sub(r'^\*\s+', '- ', text, flags=_re.MULTILINE) # * bullets
        return text.strip()

    return {
        "title":    clean(title),
        "summary":  clean(summary or f"Generated for {name}."),
        "sections": [{"label": clean(s["label"]), "text": clean(s["text"])} for s in sections],
    }


# ─── GET /health ──────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    from scraper import _cache
    return {"status": "ok", "orgs_cached": _cache is not None}
