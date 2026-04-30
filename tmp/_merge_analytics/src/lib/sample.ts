/**
 * Sample property data for testing and demonstration
 */

import type { RoiValues } from './schema'

export interface SampleProperty {
  id: string
  name: string
  description: string
  location: string
  data: RoiValues
  tags: string[]
}

export const SAMPLE_PROPERTIES: SampleProperty[] = [
  {
    id: 'starter-home',
    name: 'Starter Home',
    description: 'Affordable single-family home perfect for first-time investors',
    location: 'Suburban Neighborhood',
    tags: ['beginner', 'single-family', 'suburban'],
    data: {
      purchasePrice: 250000,
      downPct: 0.2,
      interestPct: 0.065,
      years: 30,
      rentMonthly: 1800,
      expensesMonthly: 600,
      taxPct: 0.012,
      insuranceMonthly: 120,
      hoaMonthly: 0,
      mgmtPct: 0.08,
      maintPct: 0.05,
      vacancyPct: 0.05,
    },
  },
  {
    id: 'luxury-condo',
    name: 'Luxury Condo',
    description: 'High-end condominium in prime downtown location',
    location: 'Downtown District',
    tags: ['luxury', 'condo', 'downtown'],
    data: {
      purchasePrice: 750000,
      downPct: 0.25,
      interestPct: 0.068,
      years: 30,
      rentMonthly: 4500,
      expensesMonthly: 1800,
      taxPct: 0.015,
      insuranceMonthly: 250,
      hoaMonthly: 400,
      mgmtPct: 0.1,
      maintPct: 0.08,
      vacancyPct: 0.03,
    },
  },
  {
    id: 'multi-unit',
    name: 'Multi-Unit Building',
    description: 'Small apartment building with multiple rental units',
    location: 'Urban Area',
    tags: ['multi-unit', 'apartment', 'urban'],
    data: {
      purchasePrice: 850000,
      downPct: 0.25,
      interestPct: 0.07,
      years: 30,
      rentMonthly: 5200,
      expensesMonthly: 2200,
      taxPct: 0.014,
      insuranceMonthly: 300,
      hoaMonthly: 0,
      mgmtPct: 0.12,
      maintPct: 0.1,
      vacancyPct: 0.08,
    },
  },
  {
    id: 'fixer-upper',
    name: 'Fixer Upper',
    description: 'Property requiring renovation with high potential returns',
    location: 'Up-and-coming Area',
    tags: ['fixer-upper', 'renovation', 'high-potential'],
    data: {
      purchasePrice: 180000,
      downPct: 0.15,
      interestPct: 0.075,
      years: 30,
      rentMonthly: 1200,
      expensesMonthly: 400,
      taxPct: 0.01,
      insuranceMonthly: 80,
      hoaMonthly: 0,
      mgmtPct: 0.08,
      maintPct: 0.15, // Higher maintenance due to renovation needs
      vacancyPct: 0.1,
    },
  },
  {
    id: 'vacation-rental',
    name: 'Vacation Rental',
    description: 'Short-term rental property in tourist destination',
    location: 'Beach Town',
    tags: ['vacation', 'short-term', 'tourist'],
    data: {
      purchasePrice: 450000,
      downPct: 0.2,
      interestPct: 0.07,
      years: 30,
      rentMonthly: 3500, // Average monthly income from short-term rentals
      expensesMonthly: 1400,
      taxPct: 0.013,
      insuranceMonthly: 200,
      hoaMonthly: 150,
      mgmtPct: 0.15, // Higher management fee for short-term rentals
      maintPct: 0.12, // Higher maintenance for frequent turnover
      vacancyPct: 0.2, // Higher vacancy for seasonal properties
    },
  },
]

/**
 * Get a sample property by ID
 */
export function getSampleProperty(id: string): SampleProperty | undefined {
  return SAMPLE_PROPERTIES.find(property => property.id === id)
}

/**
 * Get a random sample property
 */
export function getRandomSampleProperty(): SampleProperty {
  const randomIndex = Math.floor(Math.random() * SAMPLE_PROPERTIES.length)
  return SAMPLE_PROPERTIES[randomIndex]
}

/**
 * Get sample properties by tags
 */
export function getSamplePropertiesByTags(tags: string[]): SampleProperty[] {
  return SAMPLE_PROPERTIES.filter(property =>
    tags.some(tag => property.tags.includes(tag))
  )
}

/**
 * Get all available tags
 */
export function getAllTags(): string[] {
  const allTags = new Set<string>()
  SAMPLE_PROPERTIES.forEach(property => {
    property.tags.forEach(tag => allTags.add(tag))
  })
  return Array.from(allTags).sort()
}

/**
 * Create a custom sample property
 */
export function createCustomSampleProperty(
  name: string,
  description: string,
  location: string,
  data: RoiValues,
  tags: string[] = []
): SampleProperty {
  return {
    id: `custom-${Date.now()}`,
    name,
    description,
    location,
    data,
    tags,
  }
}
