import { Location } from '../../types/aqi.types'

export interface CheckAlertOptions {
  currentAqi: number
  currentPm25?: number
  thresholdAqi: number
  thresholdPm25?: number
}

export function checkAlertThreshold(options: CheckAlertOptions): boolean {
  const { currentAqi, currentPm25, thresholdAqi, thresholdPm25 } = options
  
  return (
    currentAqi >= thresholdAqi ||
    (thresholdPm25 !== undefined && currentPm25 !== undefined && currentPm25 >= thresholdPm25)
  )
}

export function createLocationKey(location: Location): string {
  return `${location.country}-${location.state || 'NA'}-${location.city}`
    .toLowerCase()
    .replace(/\s+/g, '-')
}

