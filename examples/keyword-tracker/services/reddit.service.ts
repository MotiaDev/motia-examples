export const fetchRedditMentions = async (keyword: string) => {
  const mentions: any = []// TODO: make it by the chunks
  const url = 'https://www.reddit.com/search.json?q=' + keyword + '&sort=new'
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'User-Agent': 'motia-keyword-tracker/0.1',
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
  })
  if (!response.ok) {
    throw new Error(`Error fetching Reddit mentions: ${response.statusText}`)
  }
  const body = await response.json()
  if (body.data && body.data.children) {
    for (const mention of body.data.children) {
      mentions.push({
        title: mention.data.title,
        text: mention.data.selftext,
        url: `https://reddit.com${mention.data.permalink}`,
        key: mention.data.permalink,
        created: mention.data.created_utc,  // UTC timestamp
      })
    }
  } else {
    throw new Error('Invalid response from Reddit API')
  }
  // Sort mentions by created date
  mentions.sort((a: any, b: any) => b.created - a.created)
  // Add a timestamp to each mention
  for (const mention of mentions) {
    mention.timestamp = new Date(mention.created * 1000).toISOString()  // Convert to ISO string
    mention.created = new Date(mention.created * 1000)  // Convert to Date object
  }
  // Add a source to each mention
  for (const mention of mentions) {
    mention.source = 'reddit'
  }
  // Add a type to each mention
  for (const mention of mentions) {
    mention.type = 'mention'
  }
  // Add a status to each mention
  for (const mention of mentions) {
    mention.status = 'new'
  }
  return mentions;
};
