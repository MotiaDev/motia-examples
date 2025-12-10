import { MortgageRate } from '../services/scraper/types'

export function generateRateAlertEmail(
  changes: Array<{ current: MortgageRate; previous: MortgageRate; change: number }>
): string {
  const hasDecreases = changes.some(c => c.change < 0)
  const hasIncreases = changes.some(c => c.change > 0)
  
  let subject = '🏠 Mortgage Rate Alert: '
  if (hasDecreases && !hasIncreases) {
    subject += 'Rates Are Dropping!'
  } else if (hasIncreases && !hasDecreases) {
    subject += 'Rates Are Rising'
  } else {
    subject += 'Rate Changes Detected'
  }
  
  const rateRows = changes.map(({ current, previous, change }) => {
    const arrow = change < 0 ? '📉' : '📈'
    const changeColor = change < 0 ? '#16a34a' : '#dc2626'
    const changeText = change > 0 ? `+${change.toFixed(3)}%` : `${change.toFixed(3)}%`
    
    return `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">
          <strong>${current.lender}</strong>
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">
          ${current.product}
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">
          ${previous.rate.toFixed(3)}%
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">
          <strong>${current.rate.toFixed(3)}%</strong>
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center; color: ${changeColor};">
          ${arrow} <strong>${changeText}</strong>
        </td>
      </tr>
    `
  }).join('')
  
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background-color: #f9fafb;">
        <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">
              🏠 Mortgage Rate Alert
            </h1>
            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">
              Significant rate changes detected
            </p>
          </div>
          
          <!-- Content -->
          <div style="padding: 30px;">
            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
              We've detected significant changes in mortgage rates. Here's what's changed:
            </p>
            
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
              <thead>
                <tr style="background-color: #f3f4f6;">
                  <th style="padding: 12px; text-align: left; font-size: 14px; color: #6b7280;">Lender</th>
                  <th style="padding: 12px; text-align: left; font-size: 14px; color: #6b7280;">Product</th>
                  <th style="padding: 12px; text-align: center; font-size: 14px; color: #6b7280;">Previous</th>
                  <th style="padding: 12px; text-align: center; font-size: 14px; color: #6b7280;">Current</th>
                  <th style="padding: 12px; text-align: center; font-size: 14px; color: #6b7280;">Change</th>
                </tr>
              </thead>
              <tbody>
                ${rateRows}
              </tbody>
            </table>
            
            <div style="margin-top: 30px; padding: 20px; background-color: #f0fdf4; border-left: 4px solid #16a34a; border-radius: 4px;">
              <p style="margin: 0; color: #166534; font-size: 14px;">
                <strong>💡 Tip:</strong> Now might be a good time to lock in your rate if you're seeing favorable changes!
              </p>
            </div>
          </div>
          
          <!-- Footer -->
          <div style="padding: 20px 30px; background-color: #f9fafb; border-top: 1px solid #e5e7eb; text-align: center;">
            <p style="color: #6b7280; font-size: 12px; margin: 0;">
              This is an automated alert from your Mortgage Rate Alert system
            </p>
            <p style="color: #6b7280; font-size: 12px; margin: 10px 0 0 0;">
              Updated: ${new Date().toLocaleString('en-US', { 
                dateStyle: 'medium', 
                timeStyle: 'short' 
              })}
            </p>
          </div>
          
        </div>
      </body>
    </html>
  `
  
  return html
}

export function generateRateAlertSubject(
  changes: Array<{ current: MortgageRate; previous: MortgageRate; change: number }>
): string {
  const hasDecreases = changes.some(c => c.change < 0)
  const hasIncreases = changes.some(c => c.change > 0)
  
  if (hasDecreases && !hasIncreases) {
    return '🏠 Mortgage Rate Alert: Rates Are Dropping!'
  } else if (hasIncreases && !hasDecreases) {
    return '🏠 Mortgage Rate Alert: Rates Are Rising'
  } else {
    return '🏠 Mortgage Rate Alert: Rate Changes Detected'
  }
}

