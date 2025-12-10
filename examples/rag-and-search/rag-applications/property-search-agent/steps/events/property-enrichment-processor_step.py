"""
Property Enrichment Processor Event Step

Enriches properties with additional data (school ratings, crime stats, etc.)
Runs in PARALLEL with other event processors.
"""

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../../src'))

config = {
    "name": "PropertyEnrichmentProcessor",
    "type": "event",
    "description": "Enrich properties with additional data (schools, crime, walkability)",
    "subscribes": ["property.enrich"],
    "emits": [],
    "input": {
        "type": "object",
        "properties": {
            "searchId": {"type": "string"},
            "city": {"type": "string"},
            "state": {"type": "string"}
        },
        "required": ["searchId", "city", "state"]
    },
    "flows": ["real-estate-search"]
}


async def handler(input_data, context):
    """
    Enrich properties with additional data
    
    Runs in PARALLEL with scraping!
    """
    search_id = input_data.get('searchId')
    city = input_data.get('city')
    state = input_data.get('state')
    
    try:
        context.logger.info(f"Starting property enrichment for {search_id} in {city}, {state}")
        
        # Update progress
        from datetime import datetime
        await context.streams.propertySearchProgress.set('searches', search_id, {
            'searchId': search_id,
            'stage': 'enriching',
            'progress': 0.4,
            'message': f'Enriching properties with school ratings, crime stats for {city}...',
            'timestamp': datetime.utcnow().isoformat()
        })
        
        # TODO: Call enrichment APIs in parallel
        # - School ratings API
        # - Crime statistics API
        # - Walkability scores API
        # - Public transit info
        
        enrichment_data = {
            'schoolRatings': f'{city} has highly rated schools',
            'crimeStats': f'{city} has low crime rates',
            'walkability': f'{city} is walkable',
            'publicTransit': f'{city} has good public transit'
        }
        
        # Store enrichment data
        await context.state.set('enrichment', search_id, enrichment_data)
        
        context.logger.info(f"Property enrichment completed for {search_id}")
        
    except Exception as e:
        context.logger.error(f"Property enrichment failed: {str(e)}")

