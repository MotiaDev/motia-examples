"""
Property Scraper Service (Fast, No AI)

This service handles FAST property scraping without AI agents.
AI reasoning happens later, separately.
"""

from .scrape_properties import scrape_properties

# Service constant with methods as properties (Motia DDD pattern)
property_scraper_service = {
    'scrape_properties': scrape_properties
}

