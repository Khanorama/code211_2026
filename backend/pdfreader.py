"""
resume_pdf_reader.py

Reads a resume PDF, extracts text, and uses aisuite to return
structured resume data such as:
- skills
- experience
- interests
- education
- projects
- contact info

Requirements:
    pip install pypdf aisuite 'aisuite[openai]'

Environment:
    OPENAI_API_KEY=your_key_here

Example:
    python resume_pdf_reader.py path/to/resume.pdf
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path
from typing import Any, Dict, List

import aisuite as ai
from pypdf import PdfReader

from dotenv import load_dotenv
import os

load_dotenv()

api_key = os.getenv("MY_RESUME_APP_KEY")

print("DEBUG KEY:", api_key)

if not api_key:
    raise ValueError("❌ API key not found. .env is not loading.")

os.environ["OPENAI_API_KEY"] = api_key

def extract_pdf_text(pdf_path: str) -> str:
    """Extract raw text from a PDF using pypdf."""
    path = Path(pdf_path)
    if not path.exists():
        raise FileNotFoundError(f"PDF not found: {pdf_path}")
    if path.suffix.lower() != ".pdf":
        raise ValueError("Input file must be a PDF.")

    reader = PdfReader(str(path))
    pages_text: List[str] = []

    for i, page in enumerate(reader.pages):
        try:
            page_text = page.extract_text() or ""
        except Exception as exc:
            page_text = ""
            print(f"Warning: failed to extract page {i + 1}: {exc}", file=sys.stderr)

        if page_text.strip():
            pages_text.append(page_text)

    full_text = "\n\n".join(pages_text).strip()

    if not full_text:
        raise ValueError(
            "No text could be extracted from the PDF. "
            "The resume may be scanned/image-based and require OCR."
        )

    return full_text


def clean_json_response(text: str) -> str:
    """
    Remove markdown code fences if the model returns ```json ... ```
    and try to isolate the JSON object.
    """
    text = text.strip()

    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text)
        text = re.sub(r"\s*```$", "", text)

    start = text.find("{")
    end = text.rfind("}")
    if start != -1 and end != -1 and end > start:
        text = text[start:end + 1]

    return text.strip()


def extract_resume_info_with_ai(
    resume_text: str,
    model: str = "openai:gpt-4o-mini",
) -> Dict[str, Any]:
    """
    Use aisuite to extract structured resume information.
    """
    client = ai.Client()

    schema_description = """
Return ONLY valid JSON matching this structure:

{
  "name": string or null,
  "email": string or null,
  "phone": string or null,
  "location": string or null,
  "linkedin": string or null,
  "github": string or null,
  "summary": string or null,
  "skills": [string],
  "interests": [string],
  "education": [
    {
      "institution": string or null,
      "degree": string or null,
      "field_of_study": string or null,
      "start_date": string or null,
      "end_date": string or null,
      "details": [string]
    }
  ],
  "experience": [
    {
      "company": string or null,
      "title": string or null,
      "start_date": string or null,
      "end_date": string or null,
      "location": string or null,
      "bullets": [string]
    }
  ],
  "projects": [
    {
      "name": string or null,
      "description": string or null,
      "technologies": [string]
    }
  ],
  "certifications": [string]
}
"""

    messages = [
        {
            "role": "system",
            "content": (
                "You extract structured information from resumes. "
                "Be careful and conservative. Do not invent missing facts. "
                "If something is missing, use null or an empty list. "
                "Return only valid JSON."
            ),
        },
        {
            "role": "user",
            "content": (
                f"{schema_description}\n\n"
                "Extract the data from this resume text:\n\n"
                f"{resume_text}"
            ),
        },
    ]

    response = client.chat.completions.create(
        model=model,
        messages=messages,
        temperature=0.1,
    )

    content = response.choices[0].message.content
    cleaned = clean_json_response(content)

    try:
        return json.loads(cleaned)
    except json.JSONDecodeError as exc:
        raise ValueError(
            "Model did not return valid JSON.\n"
            f"Raw response:\n{content}"
        ) from exc


def extract_resume(pdf_path: str, model: str = "openai:gpt-4o-mini") -> Dict[str, Any]:
    """Full pipeline: PDF -> text -> structured JSON."""
    resume_text = extract_pdf_text(pdf_path)
    return extract_resume_info_with_ai(resume_text, model=model)


def main() -> None:
    if len(sys.argv) < 2:
        print("Usage: python pdfreader.py path/to/resume.pdf")
        sys.exit(1)

    pdf_path = sys.argv[1]
    model = sys.argv[2] if len(sys.argv) >= 3 else "openai:gpt-4o-mini"

    try:
        result = extract_resume(pdf_path, model=model)
        print(json.dumps(result, indent=2, ensure_ascii=False))
    except Exception as exc:
        print(f"Error: {exc}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()