"""
BridgeStay Pipeline
===================

This script defines a modular data pipeline for the BridgeStay rental
platform.  It extracts structured information from raw Chinese text
describing housing adverts using OpenAI’s GPT‑4o model and stores
the results in a Supabase (PostgreSQL) database.  The design
emphasises accurate extraction of price and contact details because
these fields power advanced filters on the front end.

The code is organised into clear functions and classes:

* `extract_data(text)`: Calls the OpenAI Chat Completion API to
  transform free‑form text into a strict JSON object.  The prompt
  specifies the fields to extract: title, price (int), layout,
  contact_info (JSON object), location_json (JSON object), luxury_score
  (int), and raw_data.  The function validates the JSON and returns
  it as a `Listing` dataclass.
* `save_to_db(listing)`: Inserts the extracted listing into the
  `listings` table of a Supabase database using the `supabase`
  Python client.  The `location_json` and `contact_info` fields are
  stored as `jsonb`, as recommended by Postgres documentation for
  unstructured or variable‑schema data【560753210343035†L184-L200】.
* `Crawler`: A stub class showing how you could integrate Selenium
  or Playwright to scrape raw text from sources like 小红书 or 微信.

Before running this script, set the following environment variables:

```
export OPENAI_API_KEY=sk-...          # OpenAI API key
export SUPABASE_URL=https://xyz.supabase.co   # Supabase project URL
export SUPABASE_ANON_KEY=public-anon-key      # Supabase anon key
```

Install dependencies with:

```
pip install openai supabase python-dotenv
```

Note: The Supabase docs state that JSON data can be inserted just like
any other data provided the JSON is valid【560753210343035†L239-L240】.  Our code
ensures valid JSON is produced before insertion.
"""

from __future__ import annotations

import json
import os
from dataclasses import dataclass, asdict
from typing import Any, Dict, Optional

import openai
from supabase import create_client, Client


@dataclass
class Listing:
    """Represents a rental listing to be stored in the database.

    Attributes:
        title: Short summary of the property.
        price: Monthly rent as an integer.  Use 0 if not provided.
        layout: Floorplan or apartment layout (e.g. "1室1厅").
        contact_info: Arbitrary JSON object with contact details (e.g.
            phone numbers, WeChat IDs, email addresses).  Stored as
            `jsonb`【560753210343035†L184-L200】.
        location_json: Arbitrary JSON object with location details
            (address, city, district, coordinates).  Stored as `jsonb`.
        raw_data: Original text used for extraction.  Useful for
            auditing or debugging.
        luxury_score: Integer score from 0–100 indicating how
            luxurious the property is, or `None` if unknown.
    """

    title: str
    price: int
    layout: str
    contact_info: Dict[str, Any]
    location_json: Dict[str, Any]
    raw_data: str
    luxury_score: Optional[int] = None

    def to_supabase_payload(self) -> Dict[str, Any]:
        """Convert this listing into a dictionary suitable for Supabase insertion.

        Supabase’s Python client will serialise nested dictionaries into
        JSON automatically.  The `luxury_score` field is omitted if
        `None` so the database can apply its default.
        """
        payload = asdict(self)
        if payload["luxury_score"] is None:
            payload.pop("luxury_score")
        return payload


def extract_data(text: str) -> Listing:
    """Use GPT‑4o to extract structured listing data from raw Chinese text.

    This function constructs a conversation with a system prompt and
    user prompt, calls the OpenAI Chat Completions API, and parses
    the returned JSON.  It validates required fields and types.

    Args:
        text: The raw advertisement text.

    Returns:
        A `Listing` instance populated with extracted data.

    Raises:
        RuntimeError: If the OpenAI API key is not set.
        ValueError: If the model returns invalid JSON or unexpected types.
        KeyError: If required keys are missing.
    """
    # Compose prompts for ChatCompletion.  The system prompt sets
    # expectations for structure and fields.  We instruct the model
    # explicitly to return valid JSON and nothing else.
    system_prompt = (
        "You are an assistant that extracts rental listing information from "
        "unstructured Chinese text.  Given a housing description, return a "
        "strict JSON object with these keys: title (string), price (int, "
        "monthly rent, 0 if missing), layout (string), contact_info (object), "
        "location_json (object), luxury_score (int or null), and raw_data "
        "(string containing the original input).  contact_info should include "
        "any phone numbers, WeChat IDs or emails you find.  location_json "
        "should capture city, district, street, or any location details. "
        "Ensure the JSON is valid and contains no extra keys or comments."
    )
    user_prompt = f"请从以下文本中提取房源信息，并按要求返回 JSON：\n\n{text}\n"

    # Load API key from environment.  Raise if not provided.
    openai.api_key = os.getenv("OPENAI_API_KEY")
    if not openai.api_key:
        raise RuntimeError("OPENAI_API_KEY environment variable is not set.")

    # Call the chat completions endpoint with deterministic parameters.
    response = openai.ChatCompletion.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        temperature=0,
    )

    # Extract content and parse as JSON.
    message = response["choices"][0]["message"]["content"]
    try:
        data = json.loads(message)
    except json.JSONDecodeError as err:
        raise ValueError(f"Failed to decode JSON from model output: {err}\n\n{message}")

    # Validate required fields.
    required_fields = ["title", "price", "layout", "contact_info", "location_json", "raw_data"]
    for field in required_fields:
        if field not in data:
            raise KeyError(f"Missing key '{field}' in extracted data: {data}")

    # Coerce and validate types.
    try:
        price = int(data.get("price") or 0)
    except (TypeError, ValueError) as err:
        raise ValueError(f"Price must be an integer, got {data.get('price')}") from err

    contact_info = data.get("contact_info") or {}
    location_json = data.get("location_json") or {}
    if not isinstance(contact_info, dict) or not isinstance(location_json, dict):
        raise ValueError("contact_info and location_json must be JSON objects")

    luxury_score = data.get("luxury_score")
    if luxury_score is not None:
        try:
            luxury_score = int(luxury_score)
        except (TypeError, ValueError) as err:
            raise ValueError(f"luxury_score must be an integer or null, got {luxury_score}") from err

    return Listing(
        title=str(data.get("title")),
        price=price,
        layout=str(data.get("layout")),
        contact_info=contact_info,
        location_json=location_json,
        raw_data=str(data.get("raw_data")),
        luxury_score=luxury_score,
    )


def create_supabase_client() -> Client:
    """Instantiate a Supabase client using environment variables.

    Returns:
        A `Client` instance from the `supabase` package.

    Raises:
        RuntimeError: If the required environment variables are not set.
    """
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_ANON_KEY")
    if not url or not key:
        raise RuntimeError(
            "SUPABASE_URL and SUPABASE_ANON_KEY environment variables must be set."
        )
    return create_client(url, key)


def save_to_db(listing: Listing) -> Dict[str, Any]:
    """Insert a listing into the Supabase `listings` table.

    Args:
        listing: The `Listing` instance to insert.

    Returns:
        The response dictionary from the Supabase client, which
        contains inserted data and any error information.
    """
    client = create_supabase_client()
    payload = listing.to_supabase_payload()
    res = client.table("listings").insert(payload).execute()
    return res


class Crawler:
    """Skeleton class for future web crawlers.

    This class shows how you might integrate a headless browser via
    Selenium or Playwright to fetch raw housing descriptions from
    platforms like 小红书 or 微信.  It is intentionally left as a
    stub for later development.
    """

    def __init__(self, headless: bool = True) -> None:
        try:
            from selenium import webdriver  # type: ignore
            from selenium.webdriver.chrome.options import Options  # type: ignore
            options = Options()
            if headless:
                options.add_argument("--headless")
            self.driver = webdriver.Chrome(options=options)
        except ImportError:
            # If Selenium isn't installed, the crawler won't be usable yet.
            self.driver = None

    def crawl(self) -> str:
        """Fetch unstructured text from a target website.

        Implement this method with your own crawling logic.  Use
        Selenium or Playwright to navigate, scroll, click, and extract
        the raw advertisement text.  Return the text as a string.

        Raises:
            RuntimeError: If Selenium isn't installed or configured.
            NotImplementedError: If the method hasn't been overridden.
        """
        if self.driver is None:
            raise RuntimeError(
                "Selenium is not installed.  Install it with `pip install selenium` "
                "and ensure a compatible WebDriver is available."
            )
        # Example placeholder logic.  Replace with real scraping code.
        # self.driver.get("https://example.com")
        # raw_text = self.driver.find_element("xpath", "//body").text
        # return raw_text
        raise NotImplementedError("Crawler.crawl needs to be implemented.")


if __name__ == "__main__":
    # Command line usage: pass raw text via stdin, then print insertion result.
    import sys
    if sys.stdin.isatty():
        print("Usage: echo '房源描述文本...' | python pipeline.py")
        sys.exit(0)
    raw = sys.stdin.read().strip()
    listing = extract_data(raw)
    response = save_to_db(listing)
    print("Inserted:", json.dumps(response, ensure_ascii=False, indent=2))