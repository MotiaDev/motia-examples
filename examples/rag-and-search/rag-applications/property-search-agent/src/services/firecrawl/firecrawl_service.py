"""
Firecrawl Service for property data extraction

Handles integration with Firecrawl API for extracting structured
property data from real estate websites.
"""

import os
from typing import Dict, List, Any, Optional
from firecrawl import FirecrawlApp


class PropertyExtractionService:
    """Service for extracting property data using Firecrawl"""
    
    def __init__(self, api_key: Optional[str] = None):
        """
        Initialize Firecrawl service
        
        Args:
            api_key: Firecrawl API key (defaults to env var)
        """
        self.api_key = api_key or os.getenv("FIRECRAWL_API_KEY")
        if not self.api_key:
            raise ValueError("FIRECRAWL_API_KEY is required")
        
        self.firecrawl = FirecrawlApp(api_key=self.api_key)
    
    def build_extraction_prompt(self, user_criteria: Dict[str, Any]) -> str:
        """
        Build a comprehensive prompt for property extraction
        
        Args:
            user_criteria: User's search criteria
            
        Returns:
            Formatted extraction prompt
        """
        budget = user_criteria.get('budget_range', 'Any')
        prop_type = user_criteria.get('property_type', 'Any')
        bedrooms = user_criteria.get('bedrooms', 'Any')
        bathrooms = user_criteria.get('bathrooms', 'Any')
        min_sqft = user_criteria.get('min_square_feet', 'Any')
        features = user_criteria.get('special_features', 'Any')
        
        return f"""You are extracting property listings from real estate websites. Extract EVERY property listing you can find on the page.

USER SEARCH CRITERIA:
- Budget: {budget}
- Property Type: {prop_type}
- Bedrooms: {bedrooms}
- Bathrooms: {bathrooms}
- Min Square Feet: {min_sqft}
- Special Features: {features}

EXTRACTION INSTRUCTIONS:
1. Find ALL property listings on the page (typically 20-40 per page)
2. For EACH property, extract these fields:
   - address: Full street address (required)
   - price: Listed price with $ symbol (required)
   - bedrooms: Number of bedrooms (required)
   - bathrooms: Number of bathrooms (required)
   - square_feet: Square footage if available
   - property_type: House/Condo/Townhouse/Apartment etc.
   - description: Brief property description if available
   - listing_url: Direct link to property details
   - agent_contact: Agent name/phone if visible
   - features: Array of property features/amenities

3. CRITICAL REQUIREMENTS:
   - Extract AT LEAST 10 properties if they exist
   - Do NOT skip properties even if some fields are missing
   - Use "Not specified" for missing optional fields
   - Ensure address and price are always filled
   - Look for property cards, listings, search results

4. RETURN FORMAT:
   - Return JSON with "properties" array
   - Each property should be a complete object
   - Set "total_count" to number of properties extracted
   - Set "source_website" to the website name

EXTRACT EVERY VISIBLE PROPERTY LISTING - DO NOT LIMIT TO JUST A FEW!
"""
    
    def build_property_schema(self) -> Dict[str, Any]:
        """
        Build JSON schema for property extraction
        
        Returns:
            Property listing schema
        """
        return {
            "type": "object",
            "properties": {
                "properties": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "address": {"type": "string"},
                            "price": {"type": "string"},
                            "bedrooms": {"type": "string"},
                            "bathrooms": {"type": "string"},
                            "square_feet": {"type": "string"},
                            "property_type": {"type": "string"},
                            "description": {"type": "string"},
                            "listing_url": {"type": "string"},
                            "agent_contact": {"type": "string"},
                            "features": {
                                "type": "array",
                                "items": {"type": "string"}
                            }
                        },
                        "required": ["address", "price"]
                    }
                },
                "total_count": {"type": "integer"},
                "source_website": {"type": "string"}
            },
            "required": ["properties", "total_count", "source_website"]
        }
    
    async def extract_properties(
        self,
        urls: List[str],
        user_criteria: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Extract property data from URLs using Firecrawl
        
        Args:
            urls: List of real estate website URLs to scrape
            user_criteria: User's search criteria
            
        Returns:
            Dict with extracted properties or error
        """
        if not urls:
            return {"error": "No URLs provided", "properties": []}
        
        try:
            prompt = self.build_extraction_prompt(user_criteria)
            schema = self.build_property_schema()
            
            print(f"Extracting properties from {len(urls)} URLs...")
            
            # Call Firecrawl extract endpoint (synchronous, run in executor)
            import asyncio
            loop = asyncio.get_event_loop()
            raw_response = await loop.run_in_executor(
                None,
                lambda: self.firecrawl.extract(urls, prompt=prompt, schema=schema)
            )
            
            # Handle response
            if hasattr(raw_response, 'success') and raw_response.success:
                data = raw_response.data if hasattr(raw_response, 'data') else {}
                properties = data.get('properties', [])
                total_count = data.get('total_count', 0)
            elif isinstance(raw_response, dict) and raw_response.get('success'):
                properties = raw_response['data'].get('properties', [])
                total_count = raw_response['data'].get('total_count', 0)
            else:
                properties = []
                total_count = 0
            
            if properties:
                return {
                    'success': True,
                    'properties': properties,
                    'total_count': len(properties),
                    'extracted_count': total_count
                }
            else:
                return {
                    'success': False,
                    'error': 'No properties extracted. Try different websites or broader criteria.',
                    'properties': []
                }
                
        except Exception as e:
            print(f"Firecrawl extraction error: {str(e)}")
            return {
                'success': False,
                'error': f"Extraction failed: {str(e)}",
                'properties': []
            }


# Export singleton instance factory
def create_firecrawl_service(api_key: Optional[str] = None) -> PropertyExtractionService:
    """Create a new Firecrawl service instance"""
    return PropertyExtractionService(api_key)

