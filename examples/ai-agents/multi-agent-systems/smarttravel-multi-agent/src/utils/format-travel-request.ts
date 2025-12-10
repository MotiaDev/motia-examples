import type { TravelPlanRequest } from '../../types/travel-plan'

const TRAVEL_VIBES: Record<string, string> = {
  relaxing: 'a peaceful retreat focused on wellness, spa experiences, and leisurely activities',
  adventure: 'thrilling experiences including hiking, water sports, and adrenaline activities',
  romantic: 'intimate experiences with private dining, couples activities, and scenic spots',
  cultural: 'immersive experiences with local traditions, museums, and historical sites',
  'food-focused': 'culinary experiences including cooking classes, food tours, and local cuisine',
  nature: 'outdoor experiences with national parks, wildlife, and scenic landscapes',
  photography: 'photogenic locations with scenic viewpoints, cultural sites, and natural wonders',
}

const TRAVEL_STYLES: Record<string, string> = {
  backpacker: 'budget-friendly accommodations, local transportation, and authentic experiences',
  comfort: 'mid-range hotels, convenient transportation, and balanced comfort-value ratio',
  luxury: 'premium accommodations, private transfers, and exclusive experiences',
  'eco-conscious': 'sustainable accommodations, eco-friendly activities, and responsible tourism',
}

const PACE_LEVELS: Record<number, string> = {
  0: '1-2 activities per day with plenty of free time and flexibility',
  1: '2-3 activities per day with significant downtime between activities',
  2: '3-4 activities per day with balanced activity and rest periods',
  3: '4-5 activities per day with moderate breaks between activities',
  4: '5-6 activities per day with minimal downtime',
  5: '6+ activities per day with back-to-back scheduling',
}

function formatDate(dateStr: string, isDatePicker: boolean): string {
  if (!dateStr) return 'Not specified'
  if (isDatePicker) {
    try {
      const date = new Date(dateStr)
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })
    } catch {
      return dateStr
    }
  }
  return dateStr.trim()
}

export function formatTravelRequestToMarkdown(request: TravelPlanRequest): string {
  const isDatePicker = request.dateInputType === 'picker'
  const startDate = formatDate(request.travelDates.start, isDatePicker)
  const endDate = request.travelDates.end 
    ? formatDate(request.travelDates.end, isDatePicker) 
    : 'Not specified'
  
  const dateRange = endDate !== 'Not specified' 
    ? `between ${startDate} and ${endDate}` 
    : startDate

  const vibesDescriptions = (request.vibes || [])
    .map(v => TRAVEL_VIBES[v] || v)
    .filter(Boolean)

  const lines = [
    '# 🧳 Travel Plan Request',
    '',
    '## 📍 Trip Overview',
    `- **Traveler:** ${request.name || 'Unnamed Traveler'}`,
    `- **Route:** ${request.startingLocation} → ${request.destination}`,
    `- **Duration:** ${request.duration} days (${dateRange})`,
    '',
    '## 👥 Travel Group',
    `- **Group Size:** ${request.adults || 1} adults, ${request.children || 0} children`,
    `- **Traveling With:** ${request.travelingWith || 'Not specified'}`,
    `- **Age Groups:** ${(request.ageGroups || []).join(', ') || 'Not specified'}`,
    `- **Rooms Needed:** ${request.rooms || 'Not specified'}`,
    '',
    '## 💰 Budget & Preferences',
    `- **Budget per person:** ${request.budget} ${request.budgetCurrency || 'USD'} (${request.budgetFlexible ? 'Flexible' : 'Fixed'})`,
    `- **Travel Style:** ${TRAVEL_STYLES[request.travelStyle || 'comfort'] || request.travelStyle || 'comfort'}`,
    `- **Preferred Pace:** ${(request.pace || [2]).map(p => PACE_LEVELS[p] || `Level ${p}`).join('; ')}`,
    '',
    '## ✨ Trip Preferences',
  ]

  if (vibesDescriptions.length > 0) {
    lines.push('- **Travel Vibes:**')
    vibesDescriptions.forEach(vibe => lines.push(`  - ${vibe}`))
  } else {
    lines.push('- **Travel Vibes:** Not specified')
  }

  if ((request.priorities || []).length > 0) {
    lines.push(`- **Top Priorities:** ${(request.priorities || []).join(', ')}`)
  }
  if (request.interests) {
    lines.push(`- **Interests:** ${request.interests}`)
  }

  lines.push(
    '',
    '## 🗺️ Destination Context',
    `- **Previous Visit:** ${request.beenThereBefore || 'Not specified'}`,
    `- **Loved Places:** ${request.lovedPlaces || 'Not specified'}`,
    `- **Additional Notes:** ${request.additionalInfo || 'Not specified'}`,
  )

  return lines.join('\n')
}

