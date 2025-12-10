"""
Market Analysis Processor Event Step

Analyzes market trends using Agno AI agents.
Runs in PARALLEL with property scraping!
"""

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../../src'))

from services.agents.property_agents import (
    create_market_analysis_agent,
    analyze_properties_with_agent
)

config = {
    "name": "MarketAnalysisProcessor",
    "type": "event",
    "description": "Analyze market trends with AI (runs in parallel)",
    "subscribes": ["market.analyze"],
    "emits": [],
    "input": {
        "type": "object",
        "properties": {
            "searchId": {"type": "string"},
            "city": {"type": "string"},
            "state": {"type": "string"},
            "budgetRange": {"type": "object"}
        },
        "required": ["searchId", "city", "state"]
    },
    "flows": ["real-estate-search"]
}


async def handler(input_data, context):
    """
    Market analysis with Agno AI
    
    Runs in PARALLEL with scraping!
    """
    search_id = input_data.get('searchId')
    city = input_data.get('city')
    state = input_data.get('state')
    budget_range = input_data.get('budgetRange', {})
    
    try:
        context.logger.info(f"Starting market analysis for {search_id} in {city}, {state}")
        
        # Update progress
        from datetime import datetime
        await context.streams.propertySearchProgress.set('searches', search_id, {
            'searchId': search_id,
            'stage': 'market_analyzing',
            'progress': 0.5,
            'message': f'AI analyzing {city} market trends...',
            'timestamp': datetime.utcnow().isoformat()
        })
        
        # Use Agno agent for market analysis
        market_agent = create_market_analysis_agent(provider='openai')
        
        prompt = f"""
Analyze real estate market for: {city}, {state}

BUDGET RANGE: ${budget_range.get('min', 0):,} - ${budget_range.get('max', 0):,}

Provide CONCISE analysis:
• Current market condition (buyer's/seller's market)
• Price trends (last 6 months)
• Best neighborhoods for this budget
• Investment outlook (next 1-2 years)

Keep under 150 words total.
"""
        
        result = await analyze_properties_with_agent(market_agent, prompt)
        market_analysis = result.get('content', 'Market analysis not available')
        
        # Store market analysis
        from datetime import datetime
        await context.state.set('market_analysis', search_id, {
            'analysis': market_analysis,
            'city': city,
            'state': state,
            'timestamp': datetime.utcnow().isoformat()
        })
        
        context.logger.info(f"Market analysis completed for {search_id}")
        
    except Exception as e:
        context.logger.error(f"Market analysis failed: {str(e)}")

