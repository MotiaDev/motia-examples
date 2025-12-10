# Monitoring and Alerts

Build intelligent monitoring and alerting systems using Motia's Cron Steps and event-driven architecture.

## 🎯 What You'll Learn

- Scheduled monitoring with Cron Steps
- External API polling and data collection
- Alert threshold management
- Notification delivery (email, SMS, webhooks)
- Historical data tracking
- Anomaly detection patterns

## 📚 Examples

### [ai-aqi-alert-system](./ai-aqi-alert-system)
**Level**: Intermediate  
**Concepts**: Cron Steps, Air Quality API, Environmental Monitoring

Monitor air quality index (AQI) and send alerts when levels are unhealthy.

**Key Features**:
- Scheduled AQI checks
- Location-based monitoring
- Threshold alerts
- Historical tracking
- Email notifications

**Use Cases**:
- Health-conscious individuals
- Schools and offices
- Outdoor event planning

---

### [ai-morgage-alert-system](./ai-morgage-alert-system)
**Level**: Intermediate  
**Concepts**: Financial Monitoring, Rate Tracking, Smart Alerts

Track mortgage rates and alert users to favorable refinancing opportunities.

**Key Features**:
- Daily rate monitoring
- Multiple lender tracking
- Personalized thresholds
- Rate trend analysis
- Email alerts

**Use Cases**:
- Homeowners considering refinancing
- Real estate professionals
- Financial advisors

---

### [car-alert](./car-alert)
**Level**: Intermediate  
**Concepts**: Vehicle Monitoring, IoT Integration, Maintenance Alerts

Monitor vehicle health and maintenance schedules with automated alerts.

**Key Features**:
- Maintenance schedule tracking
- Mileage monitoring
- Service reminders
- OBD-II integration (optional)
- Multi-vehicle support

**Use Cases**:
- Fleet management
- Personal vehicle maintenance
- Car rental services

---

## 🚀 Getting Started

### Prerequisites
- Understanding of Cron expressions
- API keys for monitoring services
- Email service credentials (SendGrid, AWS SES, etc.)

### Quick Start
1. Choose a monitoring example
2. Configure API credentials in `.env`
3. Set up notification channels
4. Customize alert thresholds
5. Run the cron jobs

### Basic Setup

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp env.example .env
# Edit .env with your API keys

# 3. Start the server
npm run dev

# 4. Monitor in Workbench
# Open http://localhost:3000
```

## 📖 Learning Path

### Level 1: Basic Monitoring
1. **ai-aqi-alert-system** - Simple API polling and alerts
2. Understand Cron expressions
3. Set up email notifications

### Level 2: Advanced Monitoring
1. **ai-morgage-alert-system** - Multiple data sources
2. **car-alert** - Complex scheduling
3. Implement threshold logic and trend detection

### Level 3: Custom Monitoring
1. Combine patterns from examples
2. Add AI for anomaly detection
3. Build dashboards for visualization

## 💡 Best Practices

### Scheduling
- **Frequency**: Balance between freshness and API costs
- **Cron Expressions**: Use standard cron syntax
  - Every hour: `0 * * * *`
  - Every day at 9am: `0 9 * * *`
  - Every 15 minutes: `*/15 * * * *`
- **Timezone**: Be explicit about timezone in cron configuration
- **Overlap Prevention**: Ensure previous run completes before next starts

### Data Collection
- **Rate Limiting**: Respect API rate limits
- **Retries**: Implement exponential backoff
- **Caching**: Cache results to reduce API calls
- **Error Handling**: Gracefully handle API failures

### Alerting
- **Thresholds**: Make thresholds configurable per user
- **Deduplication**: Don't send duplicate alerts
- **Cooldown**: Implement alert cooldown periods
- **Severity Levels**: Use different notification methods by severity
  - Info: In-app notification
  - Warning: Email
  - Critical: Email + SMS

### Data Storage
- **Historical Data**: Store for trend analysis
- **Retention**: Implement data retention policies
- **Aggregation**: Pre-aggregate for performance
- **Cleanup**: Scheduled cleanup of old data

## 🔧 Common Patterns

### Cron Step Structure

```typescript
export const config = {
  type: 'cron' as const,
  cron: '0 * * * *', // Every hour
  emits: {
    alert: z.object({
      severity: z.enum(['info', 'warning', 'critical']),
      message: z.string(),
      data: z.any()
    })
  }
}

export const handler = async (ctx) => {
  // 1. Fetch data from external API
  const data = await fetchMonitoringData()
  
  // 2. Check thresholds
  if (exceedsThreshold(data)) {
    // 3. Emit alert event
    await ctx.emitAwait('alert', {
      severity: 'warning',
      message: 'Threshold exceeded',
      data
    })
  }
  
  // 4. Store historical data
  await storeData(data)
}
```

### Alert Event Handler

```typescript
export const config = {
  type: 'event' as const,
  event: 'alert',
  // ...
}

export const handler = async (ctx) => {
  const { severity, message, data } = ctx.event
  
  // Send notification based on severity
  switch (severity) {
    case 'critical':
      await sendSMS(message)
      await sendEmail(message)
      break
    case 'warning':
      await sendEmail(message)
      break
    case 'info':
      await logToDatabase(message)
      break
  }
}
```

## 🎛️ Monitoring Dashboard Ideas

Build a dashboard to visualize your monitoring data:

1. **Real-time Metrics**
   - Current values
   - Status indicators
   - Last update time

2. **Historical Trends**
   - Line charts for trends
   - Threshold lines
   - Anomaly highlights

3. **Alert History**
   - Alert timeline
   - Alert frequency
   - Resolution status

4. **System Health**
   - Cron job status
   - API response times
   - Error rates

## 🔗 Next Steps

- **[AI Agents](../ai-agents/)** - Add AI for intelligent alerting
- **[Integrations](../integrations/)** - Connect to more data sources
- **[Advanced Use Cases](../advanced-use-cases/)** - Complex monitoring systems

## 📚 Resources

- [Cron Steps Guide](../../.cursor/rules/motia/cron-steps.mdc)
- [Event Steps Guide](../../.cursor/rules/motia/event-steps.mdc)
- [Cron Expression Generator](https://crontab.guru/)
- [State Management](../../.cursor/rules/motia/state-management.mdc)

## 💡 Extension Ideas

- Add webhook notifications (Slack, Discord, Teams)
- Implement anomaly detection with ML
- Create custom dashboards
- Add multi-channel notifications
- Build mobile apps for alerts
- Implement alert acknowledgment
- Add on-call rotation
- Create runbooks for alerts
