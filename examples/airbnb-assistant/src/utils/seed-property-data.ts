/**
 * Utility script to seed initial property data into Pinecone
 * Run with: npm run seed
 */

import 'dotenv/config'
import { pineconeService } from '../services/pinecone'

const propertyData = [
  {
    text: "Check-in time is at 2 PM. The access code for the property is 5555. Please make sure to arrive after 2 PM for smooth check-in.",
    metadata: { category: 'check-in', importance: 'high' }
  },
  {
    text: "Check-out time is 12 PM (noon). Please close all doors and windows, turn off the hot tub, and don't forget your chargers!",
    metadata: { category: 'check-out', importance: 'high' }
  },
  {
    text: "WiFi Network: AirbnbGuest, Password: Welcome2024! The router is located in the living room if you need to reset it.",
    metadata: { category: 'wifi', importance: 'high' }
  },
  {
    text: "You can park in the driveway or find a spot on the street. There's room for 2 cars in the driveway. Street parking is free and unlimited.",
    metadata: { category: 'parking', importance: 'medium' }
  },
  {
    text: "To turn the hot tub on or off, lift the lever in the grey metal box next to the door. Adjust the jets and water temperature using the panel controls. Please keep the cover on when not in use.",
    metadata: { category: 'amenities', subcategory: 'hot-tub', importance: 'medium' }
  },
  {
    text: "A variety of board games and playing cards are located in the main living room closet. Available games include: Sorry, Codenames, Monopoly, and Scrabble.",
    metadata: { category: 'entertainment', importance: 'low' }
  },
  {
    text: "The property is equipped with a smart TV with Netflix, Hulu, and Disney+ already logged in. The remote control is in the drawer under the TV.",
    metadata: { category: 'amenities', subcategory: 'tv', importance: 'medium' }
  },
  {
    text: "Emergency contact: Host - Gustavo Uribe at 925-555-1234. For emergencies, call 911. The nearest hospital is John Muir Medical Center in Walnut Creek.",
    metadata: { category: 'emergency', importance: 'high' }
  },
  {
    text: "House rules: No smoking inside, no parties or events, no pets, quiet hours after 10 PM. Maximum occupancy is 6 guests.",
    metadata: { category: 'rules', importance: 'high' }
  },
  {
    text: "Kitchen amenities include: Coffee maker (coffee provided), microwave, full-size refrigerator, dishwasher, and basic cooking utensils. Dishwasher tablets are under the sink.",
    metadata: { category: 'amenities', subcategory: 'kitchen', importance: 'medium' }
  },
  {
    text: "Heating and cooling: The thermostat is located in the hallway. Set to 68-72°F for optimal comfort. The system is set to auto mode.",
    metadata: { category: 'amenities', subcategory: 'climate', importance: 'medium' }
  },
  {
    text: "Laundry: Washer and dryer are available in the garage. Detergent is provided. Please clean the lint trap after using the dryer.",
    metadata: { category: 'amenities', subcategory: 'laundry', importance: 'low' }
  }
]

async function seed() {
  console.log('🌱 Seeding property data into Pinecone...')
  
  try {
    const texts = propertyData.map(item => item.text)
    const metadata = propertyData.map(item => item.metadata)
    
    await pineconeService.insertVectors(texts, metadata)
    
    console.log(`✅ Successfully loaded ${propertyData.length} property information items!`)
    process.exit(0)
  } catch (error) {
    console.error('❌ Error loading data:', error)
    process.exit(1)
  }
}

seed()
