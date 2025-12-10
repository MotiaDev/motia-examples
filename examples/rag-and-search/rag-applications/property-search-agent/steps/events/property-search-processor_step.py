"""
Property Search Processor Event Step

FAST property scraping (no AI).
Thin controller following Motia DDD pattern.
"""

import os
import sys

# Add src to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../../src'))

from services.property_scraper_service import property_scraper_service


# Input schema for the event
config = {
    "name": "PropertySearchProcessor",
    "type": "event",
    "description": "Processes property search requests using AI agents and Firecrawl",
    "subscribes": ["property.scrape"],
    "emits": [],
    "input": {
        "type": "object",
        "properties": {
            "searchId": {"type": "string"},
            "city": {"type": "string"},
            "state": {"type": "string"},
            "budgetRange": {
                "type": "object",
                "properties": {
                    "min": {"type": "number"},
                    "max": {"type": "number"}
                }
            },
            "propertyType": {"type": "string"},
            "bedrooms": {"type": "number"},
            "bathrooms": {"type": "number"},
            "minSquareFeet": {"type": "number"},
            "specialFeatures": {
                "type": "array",
                "items": {"type": "string"}
            },
            "selectedWebsites": {
                "type": "array",
                "items": {"type": "string"}
            },
            "searchUrls": {
                "type": "array",
                "items": {"type": "string"}
            }
        },
        "required": ["searchId", "city", "selectedWebsites", "searchUrls"]
    },
    "flows": ["real-estate-search"]
}


async def handler(input_data, context):
    """
    FAST property scraping
    
    Runs in PARALLEL with market analysis, enrichment, etc!
    """
    search_id = input_data.get('searchId')
    
    try:
        context.logger.info(f"🔵 EVENT HANDLER STARTED for {search_id}")
        
        # IMMEDIATE debug write to confirm handler is running
        from datetime import datetime
        await context.streams.propertySearchProgress.set('searches', search_id, {
            'searchId': search_id,
            'stage': 'searching_properties',
            'progress': 0.1,
            'message': '🔵 Property scraper event handler started!',
            'timestamp': datetime.utcnow().isoformat()
        })
        
        context.logger.info(f"Calling property scraper service...")
        
        # Call scraping service (fast, parallel, no AI)
        result = await property_scraper_service['scrape_properties'](
            search_id=search_id,
            search_data=input_data,
            logger=context.logger,
            streams=context.streams
        )
        
        context.logger.info(f"Scraper result: success={result.get('success')}, error={result.get('error')}")
        
        if result['success']:
            context.logger.info(f"✅ Property scraping completed for {search_id}")
            
            # Aggregate with other parallel results (market, enrichment, neighborhoods)
            await _aggregate_results(context, search_id)
        else:
            error_msg = result.get('error', 'Unknown error')
            context.logger.error(f"❌ Property scraping failed: {error_msg}")
            
            # Write error to progress stream
            await context.streams.propertySearchProgress.set('searches', search_id, {
                'searchId': search_id,
                'stage': 'error',
                'progress': 0.0,
                'message': f'Scraping failed: {error_msg}',
                'timestamp': datetime.utcnow().isoformat()
            })
            
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        context.logger.error(f"❌ Unexpected error in scraping handler: {str(e)}\n{error_details}")
        
        # Write error to stream
        from datetime import datetime
        await context.streams.propertySearchProgress.set('searches', search_id, {
            'searchId': search_id,
            'stage': 'error',
            'progress': 0.0,
            'message': f'Handler error: {str(e)}',
            'timestamp': datetime.utcnow().isoformat()
        })


async def _aggregate_results(context, search_id):
    """
    Aggregate results from all parallel processors
    """
    try:
        # Get property results
        results_item = await context.streams.propertyResults.get('searches', search_id)
        if not results_item:
            context.logger.warn(f"No results found for {search_id}")
            return
        
        # In Python, streams return dict with 'data' key (not .data attribute)
        if isinstance(results_item, dict):
            results = results_item.get('data', results_item)
        else:
            results = getattr(results_item, 'data', results_item)
        
        if not results:
            context.logger.warn(f"Results data is empty for {search_id}")
            return
        
        # Get market analysis (from parallel processor)
        market_data = await context.state.get('market_analysis', search_id)
        if market_data:
            results['marketAnalysis'] = {'fullAnalysis': market_data.get('analysis', '')}
        
        # Get enrichment data (from parallel processor)
        enrichment_data = await context.state.get('enrichment', search_id)
        if enrichment_data:
            results['enrichmentData'] = enrichment_data
        
        # Get neighborhood analysis (from parallel processor)
        neighborhood_data = await context.state.get('neighborhood_analysis', search_id)
        if neighborhood_data:
            results['neighborhoodAnalysis'] = neighborhood_data
        
        # Update results with all aggregated data
        results['status'] = 'completed'
        results['message'] = 'All parallel analyses complete!'
        await context.streams.propertyResults.set('searches', search_id, results)
        
        # Update progress
        from datetime import datetime
        await context.streams.propertySearchProgress.set('searches', search_id, {
            'searchId': search_id,
            'stage': 'completed',
            'progress': 1.0,
            'message': f'Complete! Found {results.get("totalCount", 0)} properties with full analysis.',
            'timestamp': datetime.utcnow().isoformat()
        })
        
    except Exception as e:
        context.logger.error(f"Result aggregation failed: {str(e)}")

