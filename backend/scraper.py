"""
scraper.py — dynamic opportunity discovery using DuckDuckGo.

No API keys required. DuckDuckGo's HTML search endpoint is freely accessible
and returns real results without rate limits (with polite delays).

Strategy
--------
1. Build targeted queries from the student's profile.
2. Scrape DuckDuckGo HTML results to get real URLs.
3. Fetch and parse each result page to extract org details.
4. Return ALL results — nothing hardcoded, nothing excluded by schedule.
"""

import re
import time
import requests
from bs4 import BeautifulSoup
from urllib.parse import urlparse, quote_plus

# Rotate user agents to avoid being blocked
USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
]

DDG_HEADERS = {
    "User-Agent": USER_AGENTS[0],
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5",
    "Accept-Encoding": "gzip, deflate",
    "DNT": "1",
    "Connection": "keep-alive",
    "Upgrade-Insecure-Requests": "1",
}

PAGE_HEADERS = {
    "User-Agent": USER_AGENTS[1],
    "Accept-Language": "en-US,en;q=0.9",
}

FETCH_TIMEOUT = 10
DDG_TIMEOUT   = 12


# ── query builder ─────────────────────────────────────────────────────────────

def _build_queries(profile: dict) -> list[str]:
    """Build diverse search queries from the student profile."""
    location  = profile.get("location") or "Palatine IL"
    interests = profile.get("interests") or []
    if isinstance(interests, str):
        interests = [i.strip() for i in interests.split(",") if i.strip()]
    skills = profile.get("skills") or []
    if isinstance(skills, str):
        skills = [s.strip() for s in skills.split(",") if s.strip()]
    cluster = str(profile.get("career_cluster") or profile.get("career_goals") or "")
    grade   = int(profile.get("grade") or 11)
    level   = "high school" if grade <= 12 else "college"

    queries = []

    # Interest-specific volunteer
    if interests:
        queries.append(f'site:volunteermatch.org OR site:idealist.org {" ".join(interests[:2])} volunteer {location}')
        queries.append(f'{" ".join(interests[:2])} volunteer near {location} {level} student')

    # Career cluster internship
    if cluster:
        first_word = cluster.split()[0]
        queries.append(f'{first_word} internship {location} high school student 2025 OR 2026')

    # Skills-based
    if skills:
        queries.append(f'{skills[0]} volunteer OR internship {location} youth OR teenager')

    # Broad local volunteer
    queries.append(f'volunteer opportunities {location} nonprofit high school')

    # Broad local internship
    queries.append(f'summer internship program {location} area high school 2026')

    # Community / civic
    queries.append(f'community service {location} youth program volunteer')

    # VolunteerMatch specific — great source for structured results
    queries.append(f'site:volunteermatch.org {location} volunteer')

    # Deduplicate
    seen, unique = set(), []
    for q in queries:
        if q not in seen:
            seen.add(q)
            unique.append(q)

    return unique[:8]


# ── DuckDuckGo search ─────────────────────────────────────────────────────────

def _ddg_search(query: str, max_results: int = 6) -> list[dict]:
    """
    Scrape DuckDuckGo HTML search results.
    Returns list of {title, url, snippet}.
    Uses the /html/ endpoint which returns plain HTML without JavaScript.
    """
    try:
        url = f"https://html.duckduckgo.com/html/?q={quote_plus(query)}"
        resp = requests.get(url, headers=DDG_HEADERS, timeout=DDG_TIMEOUT)
        if resp.status_code != 200:
            print(f"  [ddg] status {resp.status_code} for: {query[:60]}")
            return []

        soup = BeautifulSoup(resp.text, "html.parser")
        results = []

        # DuckDuckGo HTML result links are in <a class="result__a">
        for a in soup.select("a.result__a")[:max_results * 2]:
            href = a.get("href", "")
            title = a.get_text(strip=True)
            if not href or not title:
                continue

            # DDG wraps links through a redirect — extract real URL
            real_url = _extract_ddg_url(href)
            if not real_url:
                continue

            # Get snippet from the sibling element
            parent = a.find_parent("div", class_="result__body") or a.find_parent("div")
            snippet = ""
            if parent:
                snip_el = parent.find(class_=re.compile(r"result__snippet|result__desc"))
                if snip_el:
                    snippet = snip_el.get_text(strip=True)

            results.append({"title": title, "url": real_url, "snippet": snippet})
            if len(results) >= max_results:
                break

        print(f"  [ddg] '{query[:55]}...' → {len(results)} results")
        return results

    except Exception as e:
        print(f"  [ddg] search failed: {e}")
        return []


def _extract_ddg_url(href: str) -> str:
    """Extract the real destination URL from a DDG redirect href."""
    # DDG uses //duckduckgo.com/l/?uddg=<encoded_url> format
    m = re.search(r"uddg=([^&]+)", href)
    if m:
        from urllib.parse import unquote
        return unquote(m.group(1))
    # Sometimes it's a direct URL
    if href.startswith("http"):
        return href
    return ""


# ── URL filter ────────────────────────────────────────────────────────────────

SKIP_DOMAINS = {
    "facebook.com", "twitter.com", "x.com", "instagram.com", "linkedin.com",
    "youtube.com", "tiktok.com", "pinterest.com",
    "indeed.com", "glassdoor.com", "ziprecruiter.com", "monster.com",
    "google.com", "bing.com", "yahoo.com", "reddit.com",
    "wikipedia.org", "wikihow.com",
    "yelp.com", "tripadvisor.com",
    "amazon.com", "ebay.com",
}

def _is_useful_url(url: str) -> bool:
    if not url or not url.startswith("http"):
        return False
    domain = urlparse(url).netloc.lower().replace("www.", "")
    if any(skip in domain for skip in SKIP_DOMAINS):
        return False
    if url.lower().endswith((".pdf", ".doc", ".docx", ".xls", ".xlsx")):
        return False
    return True


# ── page fetcher & parser ─────────────────────────────────────────────────────

def _fetch(url: str) -> BeautifulSoup | None:
    try:
        r = requests.get(url, headers=PAGE_HEADERS, timeout=FETCH_TIMEOUT,
                         allow_redirects=True)
        if r.status_code != 200:
            return None
        return BeautifulSoup(r.text, "html.parser")
    except Exception as e:
        print(f"  [fetch] {url[:60]} → {e}")
        return None


def _extract_email(text: str) -> str:
    m = re.search(r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}", text)
    return m.group(0) if m else ""


def _extract_description(soup: BeautifulSoup, kw: list[str], fallback: str) -> str:
    """Pull the most relevant visible paragraph from the page."""
    best, best_score = fallback, 0
    for el in soup.find_all(["p", "li"], limit=100):
        text = el.get_text(" ", strip=True)
        if len(text) < 60 or len(text) > 700:
            continue
        score = sum(1 for k in kw if k.lower() in text.lower())
        if score > best_score:
            best, best_score = text[:420], score
    return best


def _extract_org_name(soup: BeautifulSoup, fallback: str, url: str) -> str:
    og = soup.find("meta", property="og:site_name")
    if og and og.get("content", "").strip():
        return og["content"].strip()
    t = soup.find("title")
    if t:
        raw = t.get_text().strip()
        for sep in [" | ", " - ", " – ", " · ", ": "]:
            if sep in raw:
                return raw.split(sep)[0].strip()[:80]
        if len(raw) < 80:
            return raw
    netloc = urlparse(url).netloc.replace("www.", "")
    return netloc.split(".")[0].replace("-", " ").title()


def _guess_category(text: str) -> str:
    cats = {
        "Health Sciences":      ["health", "hospital", "nurse", "medical", "patient", "clinic", "pre-med"],
        "STEM & Engineering":   ["engineering", "stem", "technology", "robotics", "computer", "coding", "science", "cad"],
        "Arts & Media":         ["art", "music", "design", "media", "photography", "film", "theater", "creative"],
        "Business & Marketing": ["business", "marketing", "finance", "entrepreneur", "commerce"],
        "Community Service":    ["community", "food", "shelter", "nonprofit", "outreach", "social service"],
        "Education & Tutoring": ["tutor", "teach", "education", "library", "mentor", "literacy"],
        "Environment":          ["environment", "garden", "nature", "wildlife", "conservation", "sustainability"],
        "Animal Care":          ["animal", "pet", "cat", "dog", "rescue", "shelter", "wildlife"],
        "Civic & Leadership":   ["civic", "government", "policy", "leadership", "rotary", "chamber"],
    }
    for cat, kws in cats.items():
        if any(kw in text for kw in kws):
            return cat
    return "Community Service"


def _guess_xp(text: str) -> int:
    if any(w in text for w in ["paid", "stipend", "compensation"]):
        return 40
    if any(w in text for w in ["intern", "internship", "research"]):
        return 30
    if any(w in text for w in ["hospital", "clinic", "lab"]):
        return 25
    return 15


def _extract_schedule(text: str) -> str:
    patterns = [
        r"(monday|tuesday|wednesday|thursday|friday|saturday|sunday)[^\n.]{0,60}(am|pm)",
        r"\b(weekdays?|weekends?|saturdays?|sundays?|mornings?|evenings?|afternoons?)\b[^\n.]{0,50}",
        r"\d{1,2}:\d{2}\s*(am|pm)[^\n.]{0,50}",
        r"(flexible|varies|part.?time|full.?time|your own hours)[^\n.]{0,40}",
    ]
    for pat in patterns:
        m = re.search(pat, text, re.IGNORECASE)
        if m:
            return m.group(0).strip()[:100]
    return "See website for schedule details"


def _extract_age(text: str) -> int:
    m = re.search(r"(?:age|must be|at least|minimum age)[^\d]{0,10}(\d{1,2})", text, re.IGNORECASE)
    if m:
        age = int(m.group(1))
        if 12 <= age <= 21:
            return age
    return 14


def _extract_tags(text: str) -> list[str]:
    tag_map = {
        "animals":    ["animal", "cat", "dog", "pet", "rescue", "shelter"],
        "healthcare": ["health", "hospital", "nurse", "medical", "patient"],
        "STEM":       ["stem", "engineering", "coding", "computer", "science", "tech"],
        "leadership": ["leadership", "rotary", "chamber", "officer"],
        "environment":["environment", "garden", "nature", "wildlife", "conservation"],
        "arts":       ["art", "music", "theater", "design", "creative"],
        "community":  ["community", "nonprofit", "outreach", "service"],
        "education":  ["tutor", "teach", "education", "mentor", "library"],
        "business":   ["business", "marketing", "finance", "entrepreneur"],
        "paid":       ["paid", "stipend", "compensation", "hourly", "wage"],
        "flexible":   ["flexible", "remote", "hybrid", "your own schedule"],
        "food":       ["food", "pantry", "hunger", "meal"],
        "seniors":    ["senior", "elderly", "older adult"],
        "youth":      ["youth", "teen", "teenager", "student"],
    }
    return [tag for tag, kws in tag_map.items()
            if any(kw in text for kw in kws)][:6]


def _relevance(text: str, kw: list[str]) -> int:
    return sum(1 for k in kw if k.lower() in text.lower())


# ── page → org dict ───────────────────────────────────────────────────────────

def _parse_page(result: dict, kw: list[str]) -> dict | None:
    url     = result["url"]
    title   = result["title"]
    snippet = result["snippet"]

    if not _is_useful_url(url):
        return None

    soup      = _fetch(url)
    page_text = soup.get_text(" ", strip=True) if soup else snippet

    desc = (
        _extract_description(soup, kw + ["volunteer", "intern", "apply", "community"], snippet)
        if soup else snippet
    )
    org_name = _extract_org_name(soup, title, url) if soup else title
    email    = _extract_email(page_text)

    text_lower = page_text.lower()

    # Guess location from page content
    loc_m = re.search(
        r"\b(Palatine|Arlington Heights|Schaumburg|Hoffman Estates|Barrington|"
        r"Rolling Meadows|Mount Prospect|Des Plaines|Wheeling|Buffalo Grove|"
        r"Libertyville|Gurnee|Naperville|Evanston|Chicago|Illinois|IL)\b",
        page_text, re.IGNORECASE
    )
    location = (loc_m.group(1) + (", IL" if loc_m and "IL" not in loc_m.group(1) and "Illinois" not in loc_m.group(1) else "")) if loc_m else "Illinois area"

    is_intern = any(w in text_lower for w in ["intern", "internship", "stipend", "paid position"])

    return {
        "name":            org_name,
        "type":            "Internship" if is_intern else "Volunteer",
        "location":        location,
        "xp_category":     _guess_category(text_lower),
        "xp_value":        _guess_xp(text_lower),
        "contact":         email,
        "website":         url,
        "description":     desc,
        "schedule":        _extract_schedule(page_text),
        "age_requirement": _extract_age(page_text),
        "tags":            _extract_tags(text_lower),
        "source":          "live",
        "relevance_score": _relevance(text_lower, kw),
    }


# ── profile helpers ───────────────────────────────────────────────────────────

def _profile_keywords(profile: dict) -> list[str]:
    tokens = []
    for field in ("interests", "skills"):
        val = profile.get(field, "")
        items = val if isinstance(val, list) else [i.strip() for i in str(val).split(",")]
        tokens.extend([i.lower() for i in items if len(i.strip()) > 2])
    for field in ("career_goals", "career_cluster"):
        tokens.extend(str(profile.get(field, "")).lower().split())
    return [t for t in tokens if len(t) > 2]


# ── public API ────────────────────────────────────────────────────────────────

def get_personalized_orgs(profile: dict) -> list[dict]:
    """
    Discover real local opportunities via DuckDuckGo — no API key required.
    Returns all results found, sorted by relevance to the student's profile.
    Nothing is hardcoded; nothing is filtered by schedule or availability.
    """
    queries  = _build_queries(profile)
    kw       = _profile_keywords(profile)
    location = profile.get("location") or "Palatine IL"

    print(f"  [scraper] {len(queries)} DDG queries | location: {location}")
    print(f"  [scraper] keywords: {kw[:8]}")

    # Run all queries, collect unique URLs
    seen_urls: set[str] = set()
    raw_results: list[dict] = []

    for i, q in enumerate(queries):
        results = _ddg_search(q, max_results=6)
        for r in results:
            url = r.get("url", "")
            if url and url not in seen_urls and _is_useful_url(url):
                seen_urls.add(url)
                raw_results.append(r)
        # Polite delay between DDG requests
        if i < len(queries) - 1:
            time.sleep(1.5)

    print(f"  [scraper] {len(raw_results)} unique URLs to fetch")

    # Fetch and parse each page
    orgs = []
    for j, result in enumerate(raw_results):
        org = _parse_page(result, kw)
        if org:
            orgs.append(org)
        # Short delay between page fetches
        if j < len(raw_results) - 1:
            time.sleep(0.3)

    # Sort by relevance — most matching profile first
    orgs.sort(key=lambda o: o.get("relevance_score", 0), reverse=True)
    print(f"  [scraper] returning {len(orgs)} opportunities")
    return orgs


# Backwards compat
_cache = None

def get_orgs_cached():
    global _cache
    if _cache is None:
        _cache = get_personalized_orgs({})
    return _cache
