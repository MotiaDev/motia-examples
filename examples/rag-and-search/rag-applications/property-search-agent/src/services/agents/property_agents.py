"""
Property Search AI Agents using Agno framework

This module contains the AI agents for:
- Property search and extraction
- Market analysis
- Property valuation
"""

import os
from typing import Dict, List, Any, Optional
from agno.agent import Agent
from agno.models.openai import OpenAIChat


def create_property_search_agent(provider: str = "openai") -> Agent:
    """
    Create an agent specialized in property search and extraction
    
    Args:
        provider: AI provider - "openai" (default)
    """
    model = OpenAIChat(
        id="gpt-4o-mini",  # Fast and cost-effective
        api_key=os.getenv("OPENAI_API_KEY")
    )
    
    return Agent(
        name="Property Search Agent",
        model=model,
        instructions="""
        You are a property search expert. Your role is to analyze and extract property listings data.

        WORKFLOW:
        1. ANALYZE PROVIDED DATA:
           - Review the extracted property listings from real estate websites
           - Focus on properties matching user criteria
           - Extract comprehensive property information

        2. STRUCTURE PROPERTY DATA:
           - Address, price, bedrooms, bathrooms, square footage
           - Property type, features, listing URLs
           - Agent contact information

        3. RANK AND FILTER:
           - Rank properties by match quality to user criteria
           - Filter out properties that don't meet requirements
           - Highlight best matches

        IMPORTANT:
        - Focus ONLY on finding and structuring property data
        - Do NOT provide market analysis or valuations
        - Be concise and accurate
        - Preserve all listing URLs for user access
        """,
        markdown=True
    )


def create_market_analysis_agent(provider: str = "openai") -> Agent:
    """
    Create an agent specialized in market analysis
    
    Args:
        provider: AI provider - "openai" (default)
    """
    model = OpenAIChat(
        id="gpt-4o-mini",  # Fast and cost-effective
        api_key=os.getenv("OPENAI_API_KEY")
    )
    
    return Agent(
        name="Market Analysis Agent",
        model=model,
        instructions="""
        You are a market analysis expert. Provide CONCISE and ACTIONABLE market insights.

        REQUIREMENTS:
        - Keep analysis brief and focused
        - Provide 2-3 bullet points per area
        - Avoid repetition and lengthy explanations
        - Base analysis on property data provided

        COVER THESE AREAS:
        1. Market Condition: 
           - Buyer's vs seller's market
           - Current price trends
           - Market momentum

        2. Key Neighborhoods:
           - Brief overview of areas with properties
           - Neighborhood characteristics
           - Growth potential

        3. Investment Outlook:
           - 2-3 key points about investment potential
           - Risk factors to consider
           - Timing recommendations

        FORMAT:
        - Use clear bullet points
        - Keep each section under 100 words
        - Focus on actionable insights
        - Cite specific data points when possible
        """,
        markdown=True
    )


def create_property_valuation_agent(provider: str = "openai") -> Agent:
    """
    Create an agent specialized in property valuation
    
    Args:
        provider: AI provider - "openai" (default)
    """
    model = OpenAIChat(
        id="gpt-4o-mini",  # Fast and cost-effective
        api_key=os.getenv("OPENAI_API_KEY")
    )
    
    return Agent(
        name="Property Valuation Agent",
        model=model,
        instructions="""
        You are a property valuation expert. Provide CONCISE property assessments.

        REQUIREMENTS:
        - Keep each property assessment brief (2-3 sentences max)
        - Focus on: value assessment, investment potential, key recommendation
        - Use bullet points for clarity
        - Avoid repetition

        FOR EACH PROPERTY, PROVIDE:
        1. Value Assessment:
           - Fair price / Over priced / Under priced
           - Brief reasoning based on comparables and features

        2. Investment Potential:
           - High / Medium / Low rating
           - Key factors influencing rating
           - Potential appreciation prospects

        3. Key Recommendation:
           - One clear actionable insight
           - Specific next steps for buyer
           - Timeline considerations

        FORMAT:
        **Property [NUMBER]: [ADDRESS]**
        • Value: [Assessment] - [brief reason]
        • Investment: [Rating] - [brief reason]
        • Recommendation: [actionable insight]

        Keep each property under 50 words total.
        """,
        markdown=True
    )


async def analyze_properties_with_agent(
    agent: Agent,
    prompt: str
) -> Dict[str, Any]:
    """
    Run an agent with a prompt and return structured results
    
    Args:
        agent: The Agno agent to use
        prompt: The prompt to send to the agent
        
    Returns:
        Dict with 'content' and 'metadata' keys
    """
    try:
        result = agent.run(prompt)
        
        return {
            "content": result.content,
            "metadata": {
                "model": agent.model.id if hasattr(agent, 'model') else "unknown",
                "agent_name": agent.name
            }
        }
    except Exception as e:
        return {
            "content": None,
            "error": str(e),
            "metadata": {
                "agent_name": agent.name
            }
        }

