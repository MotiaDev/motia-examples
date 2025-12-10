import fetch from 'node-fetch';

const API_BASE_URL = 'http://localhost:3000';

/**
 * IMPORTANT: AI Personalization Guidelines
 * 
 * OpenAI Free Tier: 3 requests/minute
 * - VIP users (5 users) with AI: ~40-60 seconds ✅ OK
 * - Active users (7 users) with AI: ~1-2 minutes ⚠️ Slow
 * - All users (15 users) with AI: ~3-5 minutes ❌ AVOID!
 * 
 * Rule: Only enable AI for campaigns with ≤7 users (VIP or Active)
 */

interface Campaign {
  name: string;
  subject: string;
  template: string;
  targetAudience: 'all' | 'new_users' | 'active_users' | 'vip_users';
  personalizeContent: boolean;
  scheduledFor?: string;
}

const sampleCampaigns: Campaign[] = [
  {
    name: 'VIP Exclusive Offer',
    subject: 'Your Exclusive VIP Discount Inside',
    template: 'promotional',
    targetAudience: 'vip_users',
    personalizeContent: true,
  },
  {
    name: 'Welcome New Members',
    subject: 'Welcome to Our Community!',
    template: 'welcome',
    targetAudience: 'new_users',
    personalizeContent: true,
  },
  {
    name: 'Weekly Newsletter - Tech Edition',
    subject: 'This Week in Tech: Latest Updates',
    template: 'newsletter',
    targetAudience: 'active_users',
    personalizeContent: false,
  },
  {
    name: 'Flash Sale Alert',
    subject: '24-Hour Flash Sale - Up to 70% Off',
    template: 'promotional',
    targetAudience: 'all',
    personalizeContent: false, // No AI for large campaigns
  },
  {
    name: 'We Miss You - VIP Edition',
    subject: 'We Miss You - Exclusive Offer Inside',
    template: 'winback',
    targetAudience: 'vip_users', // Changed from 'all' to avoid 14 emails with AI
    personalizeContent: true,
  },
  {
    name: 'Black Friday Preview - VIP Early Access',
    subject: 'Black Friday Preview: Shop Before Everyone Else',
    template: 'promotional',
    targetAudience: 'vip_users',
    personalizeContent: true,
    scheduledFor: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16), // 3 days from now
  },
  {
    name: 'Monthly Product Roundup',
    subject: 'Top 10 Products This Month',
    template: 'newsletter',
    targetAudience: 'active_users',
    personalizeContent: false,
  },
  {
    name: 'Spring Collection Launch',
    subject: 'New Arrivals: Spring Collection 2025',
    template: 'promotional',
    targetAudience: 'all',
    personalizeContent: false,
    scheduledFor: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16), // 7 days from now
  },
  {
    name: 'Active Users Appreciation',
    subject: 'Thank You for Being an Active Member',
    template: 'newsletter',
    targetAudience: 'active_users',
    personalizeContent: true,
  },
  {
    name: 'Year-End VIP Rewards',
    subject: 'Your 2025 VIP Rewards Are Here',
    template: 'promotional',
    targetAudience: 'vip_users',
    personalizeContent: true,
    scheduledFor: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16), // 14 days from now
  },
];

async function createCampaign(campaign: Campaign) {
  try {
    console.log(`\n📧 Creating campaign: ${campaign.name}`);
    console.log(`   Target: ${campaign.targetAudience}, AI: ${campaign.personalizeContent ? 'Yes' : 'No'}`);
    
    const response = await fetch(`${API_BASE_URL}/campaigns`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(campaign),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(`   ❌ Failed: ${error}`);
      return false;
    }

    const result = await response.json();
    console.log(`   ✅ Created successfully! ID: ${result.$id}`);
    
    // Wait a bit between campaigns to avoid overwhelming the system
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    return true;
  } catch (error) {
    console.error(`   ❌ Error: ${error instanceof Error ? error.message : String(error)}`);
    return false;
  }
}

async function main() {
  console.log('🚀 Creating sample campaigns...\n');
  console.log('════════════════════════════════════════════════════════');
  
  let successCount = 0;
  let failCount = 0;

  for (const campaign of sampleCampaigns) {
    const success = await createCampaign(campaign);
    if (success) {
      successCount++;
    } else {
      failCount++;
    }
  }

  console.log('\n════════════════════════════════════════════════════════');
  console.log('\n📊 Summary:');
  console.log(`   ✅ Created: ${successCount}`);
  console.log(`   ❌ Failed: ${failCount}`);
  console.log(`   📈 Total: ${sampleCampaigns.length}`);
  
  console.log('\n💡 Note:');
  console.log('   - Campaigns with AI personalization will take longer to process');
  console.log('   - Check http://localhost:3001/campaigns to see all campaigns');
  console.log('   - Some campaigns are scheduled for future dates');
  console.log('   - VIP campaigns will process 5 users each');
  console.log('   - "All users" campaigns will process 15 users each');
  console.log('\n✨ Done! Your dashboard should now have realistic data.\n');
}

main().catch(console.error);

