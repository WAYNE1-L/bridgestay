# Debug Notes: Listings Not Syncing

## Issue Analysis

1. **ListingsProvider is correctly wired** in App.tsx (lines 43-49)
2. **Homepage uses useListings()** and filters by isFeatured (line 459)
3. **Apartments page uses trpc.apartments.list** - fetches from DATABASE, not ListingsContext
4. **Database has 0 active apartments** - this is why "0 apartments found"

## Root Cause

The Apartments page (/apartments) fetches from the **database** via tRPC, not from ListingsContext.
The ListingsContext is only used for the **Homepage Featured Listings section**.

When user publishes from AI Generator:
- Data goes to ListingsContext (localStorage)
- Homepage shows it in Featured section (if isFeatured=true)
- BUT /apartments page queries the DATABASE which is empty

## Solution Options

1. **Option A**: Make Apartments page also use ListingsContext (merge with DB data)
2. **Option B**: Make AI Generator save to database instead of just localStorage
3. **Option C**: Create a separate "User Listings" page that shows ListingsContext data

## Current Status

- Homepage Featured section: Uses ListingsContext ✓
- /apartments page: Uses database (empty) ✗
- AI Generator publishes to: ListingsContext only

## Fix Needed

Either:
1. Add database insert when publishing from AI Generator
2. Or show ListingsContext data on a dedicated page
