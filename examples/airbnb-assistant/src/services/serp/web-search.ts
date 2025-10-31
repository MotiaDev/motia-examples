import serpapi from 'serpapi'

export interface SearchResult {
  title: string
  snippet: string
  link?: string
  rating?: number
  reviews?: number
  type?: string
}

export async function webSearch(
  query: string,
  location?: string,
  searchType: 'general' | 'local' | 'images' = 'general'
): Promise<SearchResult[]> {
  const apiKey = process.env.SERPAPI_KEY!
  
  const params: any = {
    q: query,
    api_key: apiKey,
    num: 5
  }
  
  if (location) {
    params.location = location
  }
  
  if (searchType === 'local') {
    params.engine = 'google_local'
    params.google_domain = 'google.com'
  } else if (searchType === 'images') {
    params.engine = 'google_images'
  } else {
    params.engine = 'google'
  }
  
  return new Promise((resolve, reject) => {
    serpapi.json(params, (data: any) => {
      if (data.error) {
        reject(new Error(data.error))
        return
      }
      
      let results: SearchResult[] = []
      
      if (searchType === 'local' && data.local_results) {
        results = data.local_results.map((result: any) => ({
          title: result.title,
          snippet: result.type || result.address || '',
          link: result.link,
          rating: result.rating,
          reviews: result.reviews,
          type: result.type
        }))
      } else if (data.organic_results) {
        results = data.organic_results.slice(0, 5).map((result: any) => ({
          title: result.title,
          snippet: result.snippet || '',
          link: result.link
        }))
      }
      
      resolve(results)
    })
  })
}
