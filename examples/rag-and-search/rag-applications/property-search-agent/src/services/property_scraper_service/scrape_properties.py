"""
Fast Property Scraping (NO AI)

This scrapes properties in PARALLEL from multiple websites.
No AI agents involved - just fast HTTP calls.
"""

import asyncio
from typing import Dict, Any, List
from datetime import datetime


async def scrape_properties(
    search_id: str,
    search_data: Dict[str, Any],
    logger,
    streams
) -> Dict[str, Any]:
    """
    Scrape properties FAST in parallel (no AI)
    
    Returns immediately with raw property data for user review
    """
    try:
        # Update progress
        await _update_progress(streams, search_id, 'scraping', 0.2, 
                               'Searching properties across multiple websites...')
        
        # Get search URLs
        urls = search_data.get('searchUrls', [])
        
        if not urls:
            return {"success": False, "error": "No search URLs provided"}
        
        logger.info(f"Starting parallel scraping from {len(urls)} URLs")
        
        # Scrape ALL URLs in PARALLEL (much faster!)
        scrape_tasks = [
            _scrape_single_url(url, search_data, logger) 
            for url in urls
        ]
        
        # Wait for all scraping to complete (parallel!)
        results = await asyncio.gather(*scrape_tasks, return_exceptions=True)
        
        # Collect all properties
        all_properties = []
        errors = []
        
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                errors.append(f"URL {i+1} failed: {str(result)}")
                logger.error(f"Scraping failed for URL {urls[i]}: {str(result)}")
            elif result.get('success'):
                all_properties.extend(result.get('properties', []))
            else:
                errors.append(f"URL {i+1}: {result.get('error', 'Unknown error')}")
        
        if not all_properties and errors:
            await _update_progress(streams, search_id, 'error', 0.0, 
                                   f'All scraping failed: {errors[0]}')
            return {"success": False, "error": errors[0]}
        
        logger.info(f"Found {len(all_properties)} properties from {len(urls)} sources")
        
        # Store raw results for USER REVIEW
        await _update_progress(streams, search_id, 'properties_found', 0.8,
                               f'Found {len(all_properties)} properties - ready for review')
        
        # Store in propertyResults stream (user can review before AI analysis)
        raw_results = {
            'searchId': search_id,
            'properties': all_properties,
            'totalCount': len(all_properties),
            'sourceWebsites': search_data.get('selectedWebsites', []),
            'searchCriteria': search_data,
            'scrapingErrors': errors if errors else None,
            'status': 'ready_for_review',
            'createdAt': datetime.utcnow().isoformat(),
            'message': 'Properties found - trigger AI analysis when ready'
        }
        
        await streams.propertyResults.set('searches', search_id, raw_results)
        
        await _update_progress(streams, search_id, 'completed', 1.0,
                               f'Found {len(all_properties)} properties - review them before AI analysis')
        
        return {"success": True, "properties": all_properties, "searchId": search_id}
        
    except Exception as e:
        error_msg = str(e)
        logger.error(f"Property scraping failed: {error_msg}")
        await _update_progress(streams, search_id, 'error', 0.0, f'Scraping failed: {error_msg}')
        return {"success": False, "error": error_msg}


async def _scrape_single_url(url: str, search_data: Dict, logger) -> Dict[str, Any]:
    """
    Scrape a single URL (fast, no AI)
    
    Uses Firecrawl's extract API with timeout protection
    """
    from ..firecrawl.firecrawl_service import create_firecrawl_service
    
    try:
        firecrawl_service = create_firecrawl_service()
        
        user_criteria = {
            'budget_range': f"${search_data.get('budgetRange', {}).get('min', 0):,} - ${search_data.get('budgetRange', {}).get('max', 0):,}",
            'property_type': search_data.get('propertyType', 'Any'),
            'bedrooms': search_data.get('bedrooms', 'Any'),
            'bathrooms': search_data.get('bathrooms', 'Any'),
        }
        
        # Extract with TIMEOUT (prevent hanging)
        result = await asyncio.wait_for(
            firecrawl_service.extract_properties(
                urls=[url],
                user_criteria=user_criteria
            ),
            timeout=15.0  # 15 second timeout per URL
        )
        
        return result
        
    except asyncio.TimeoutError:
        logger.warn(f"Timeout scraping {url}")
        return {"success": False, "error": f"Timeout after 15 seconds"}
    except Exception as e:
        logger.error(f"Error scraping {url}: {str(e)}")
        return {"success": False, "error": str(e)}


async def _update_progress(streams, search_id: str, stage: str, progress: float, message: str):
    """Helper to update progress stream"""
    await streams.propertySearchProgress.set('searches', search_id, {
        'searchId': search_id,
        'stage': stage,
        'progress': progress,
        'message': message,
        'timestamp': datetime.utcnow().isoformat()
    })

