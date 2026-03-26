import type { BilingualListing } from '../contexts/ListingsContext';
import type { SupabaseListing } from './supabase';

/**
 * Maps a Supabase listing to the BilingualListing format used by the app
 * Handles field name differences and provides bilingual text defaults
 */
export function mapSupabaseToListing(supabaseListing: SupabaseListing): BilingualListing {
  const locationJson = supabaseListing.location_json || {};
  const contactInfo = supabaseListing.contact_info || {};
  
  // Build location string from location_json
  const locationParts = [
    locationJson.address,
    locationJson.neighborhood,
    locationJson.city,
    locationJson.state
  ].filter(Boolean);
  const locationString = locationParts.join(', ') || 'Location TBD';
  
  // Determine area/neighborhood
  const areaString = locationJson.neighborhood || locationJson.city || 'Salt Lake City Area';
  
  // Parse tags if available
  const tags = (supabaseListing.tags || []).map(tag => ({
    cn: tag,
    en: tag
  }));
  
  // Add Premium tag if luxury_score > 80
  if (supabaseListing.luxury_score > 80) {
    tags.unshift({
      cn: '✨ 严选',
      en: '✨ Premium'
    });
  }

  return {
    id: `supabase_${supabaseListing.id}`,
    title: {
      cn: supabaseListing.title,
      en: supabaseListing.title
    },
    location: {
      address: {
        cn: locationString,
        en: locationString
      },
      area: {
        cn: areaString,
        en: areaString
      }
    },
    price: {
      amount: supabaseListing.price,
      currency: 'USD',
      notes: {
        cn: '月租',
        en: '/month'
      }
    },
    propertyType: supabaseListing.property_type || 'Apartment',
    availability: {
      start: 'Immediate',
      end: ''
    },
    description: {
      cn: supabaseListing.description || '精选房源，欢迎咨询',
      en: supabaseListing.description || 'Premium listing, inquire for details'
    },
    tags,
    imageUrl: supabaseListing.image_url,
    contact: {
      wechat: contactInfo.wechat,
      email: contactInfo.email
    },
    isFeatured: supabaseListing.luxury_score > 80, // Auto-feature premium listings
    status: 'available',
    reviewStatus: 'approved', // Supabase listings are pre-approved
    sourceLink: supabaseListing.source_link, // Preserved for admin use (not shown to users)
    // Store luxury_score as a custom property for sorting/display
    // @ts-ignore - extending type for luxury score
    luxuryScore: supabaseListing.luxury_score
  };
}

/**
 * Maps multiple Supabase listings to BilingualListing format
 */
export function mapSupabaseListings(supabaseListings: SupabaseListing[]): BilingualListing[] {
  return supabaseListings.map(mapSupabaseToListing);
}
