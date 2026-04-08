# BridgeStay Import Listing Flow Spec

Date: 2026-04-04
Project: BridgeStay
Mode: SAFE
Status: Execution checklist

## 1. Goal

Improve the import listing flow so that:

- address extraction is more stable and easier to reason about
- listing save and location handling are no longer tightly coupled
- fallback behavior is explicit, deterministic, and visible to the user

This spec is intentionally SAFE:

- keep the current 3-step UX (`Input -> Review -> Done`)
- avoid schema-breaking changes to apartment creation unless necessary
- prefer additive server-side contracts over risky rewrites
- allow listings to save even when location resolution fails

## 2. Current State

### 2.1 Current flow

Current code path:

- extraction entrypoint: `/Users/wayne/bridgestay/app/server/wechat-import.ts`
- import page: `/Users/wayne/bridgestay/app/client/src/pages/ImportListing.tsx`
- geocoding utilities: `/Users/wayne/bridgestay/app/server/geocoding.ts`
- save endpoint: `/Users/wayne/bridgestay/app/server/routers.ts`

Today the flow works like this:

1. User pastes text and/or uploads image.
2. `listings.extractFromWeChat` extracts structured fields.
3. Server may also normalize location inside extraction via `normalizeListingLocation()`.
4. Client applies extracted values to review form.
5. Client auto-geocodes when address, city, and state look complete.
6. Client saves the listing through `apartments.create`, passing whatever geocode result is currently in local state.

### 2.2 Pain points

#### A. Address extraction is unstable

Observed causes in current implementation:

- extraction blends multiple concerns:
  - text extraction
  - address classification
  - property-name fallback
  - Google Places normalization
- `listing.address` is overloaded:
  - sometimes a verified street address
  - sometimes a property/building name before cleanup
  - sometimes empty after normalization failure
- address confidence is not represented as a first-class concept
- property-name lookup happens inside extraction, which makes extraction results dependent on external lookup availability
- extraction warnings are string-based and hard to branch on reliably

#### B. Save and location handling are too coupled

Observed causes:

- review form state and geocode state are separate but save depends on both
- client save payload directly consumes `geocodedData`
- geocoding is triggered as a side effect of field edits, not as a distinct step/state machine
- the `apartments.create` contract mixes core listing data with derived location data
- there is no durable server-side record of whether location was:
  - directly extracted
  - user-entered
  - geocoded
  - unresolved

#### C. Fallback behavior is unclear

Observed causes:

- some fallbacks happen in extraction, some in client review, some in geocoding
- there is no single fallback matrix for:
  - Gemini unavailable
  - Gemini malformed JSON
  - multi-listing input
  - property name only
  - geocode failure
  - place lookup ambiguity
- user-facing review messaging exists, but the system behavior behind it is not formalized

## 3. Product Requirements

### 3.1 Functional requirements

The new flow must:

- distinguish extracted street addresses from property/building names
- avoid silently converting ambiguous place names into saved street addresses
- allow save without coordinates or nearby universities
- keep save success independent from geocoding success
- show the operator exactly what fallback path was used
- preserve the ability to review and manually fix any location field before save

### 3.2 Non-goals

This phase does not require:

- redesigning the import page
- replacing Gemini
- replacing Nominatim or Google Places
- backfilling historical listings
- introducing a full workflow/orchestration framework

## 4. Proposed Design

### 4.1 Split the flow into 3 explicit stages

#### Stage 1: Extraction

Responsibility:

- parse listing content into structured candidate fields
- identify location evidence
- never finalize a derived street address from external lookup

Output:

- extracted listing fields
- structured extraction diagnostics
- location candidate object

#### Stage 2: Location Resolution

Responsibility:

- take location candidate input and try to resolve it
- return a resolution result separate from extraction
- never block review or save

Output:

- normalized address if confidently resolved
- coordinates if geocoded
- nearby universities if coordinates exist
- structured resolution status and reason codes

#### Stage 3: Save

Responsibility:

- persist listing form values
- optionally persist resolved location metadata if available
- never require successful resolution for save

Output:

- saved listing id
- save status
- location persistence status

### 4.2 Core rule: extraction must not perform networked location resolution

Change:

- remove Google Places/property lookup from `extractListingFromWeChat()`
- extraction should only classify what was seen in the source

Reason:

- makes extraction deterministic
- reduces hidden coupling
- allows clearer fallbacks
- keeps extraction testable without external lookup behavior

### 4.3 Introduce explicit location evidence types

Add a dedicated location candidate model returned by extraction:

```ts
type ExtractedLocationCandidate = {
  rawAddressText?: string;
  rawPropertyName?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  evidenceType:
    | "street_address"
    | "property_name"
    | "city_state_only"
    | "conflicting"
    | "missing";
  confidence: "high" | "medium" | "low";
  issues: Array<
    | "multiple_candidates"
    | "conflicting_addresses"
    | "missing_city_or_state"
    | "property_name_only"
    | "address_incomplete"
  >;
};
```

Rules:

- `street_address`: the source text contains a likely direct address
- `property_name`: a building/property name exists but no reliable street address
- `city_state_only`: city/state inferred or extracted but no street address
- `conflicting`: multiple different location candidates were detected
- `missing`: no usable location evidence found

This model replaces the current ambiguous pattern where `address`, `propertyName`, `locationSource`, and warning strings jointly imply state.

### 4.4 Introduce structured fallback and warning codes

Replace string-only warning logic with codes plus optional display text:

```ts
type ImportIssueCode =
  | "gemini_unavailable"
  | "gemini_invalid_json"
  | "gemini_truncated"
  | "schema_mismatch"
  | "duplicate_content_removed"
  | "multiple_listing_candidates"
  | "conflicting_addresses"
  | "best_candidate_selected"
  | "property_name_only"
  | "location_lookup_skipped"
  | "location_lookup_not_found"
  | "location_lookup_ambiguous"
  | "geocode_not_found"
  | "geocode_failed";
```

Server response should return:

```ts
type ImportDiagnostic = {
  code: ImportIssueCode;
  severity: "info" | "warning";
  message: string;
};
```

The UI may still show human-friendly text, but behavior should branch on codes, not string matching.

## 5. API Changes

### 5.1 Replace one large extraction response with two logical sections

New extraction response:

```ts
type ExtractListingResponse = {
  listing: {
    title: string;
    description?: string;
    propertyType?: "apartment" | "studio" | "house" | "room" | "condo" | "townhouse";
    bedrooms?: number;
    bathrooms?: number;
    squareFeet?: number;
    monthlyRent?: number;
    securityDeposit?: number;
    availableFrom?: string;
    petsAllowed?: boolean;
    parkingIncluded?: boolean;
    amenities?: string[];
    utilitiesIncluded?: string[];
    isSublease?: boolean;
    subleaseEndDate?: string;
    leaseTerm?: number;
    furnished?: boolean;
    wechatContact?: string;
    confidence: "high" | "medium" | "low";
    extractionSource: "gemini" | "heuristic-fallback";
  };
  locationCandidate: ExtractedLocationCandidate;
  diagnostics: ImportDiagnostic[];
};
```

SAFE compatibility note:

- keep the existing endpoint name `listings.extractFromWeChat`
- update the client to read nested fields
- optionally keep old top-level fields for one release behind a compatibility adapter if needed

### 5.2 Add a dedicated resolution endpoint

Add:

```ts
listings.resolveLocation
```

Input:

```ts
{
  rawAddressText?: string;
  rawPropertyName?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  strategy?: "auto" | "address_only" | "property_lookup";
}
```

Output:

```ts
type ResolveLocationResponse = {
  status:
    | "resolved_from_address"
    | "resolved_from_property_lookup"
    | "insufficient_input"
    | "not_found"
    | "ambiguous"
    | "failed";
  normalizedAddress?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  latitude?: number;
  longitude?: number;
  displayName?: string;
  nearbyUniversities?: string[];
  diagnostics: ImportDiagnostic[];
};
```

Rules:

- if `rawAddressText` is a plausible street address, try geocoding first
- if only `rawPropertyName` exists and `city/state` exist, property lookup is allowed here
- if property lookup returns low confidence or ambiguous results, return `ambiguous` or `not_found`, never silently upgrade to a saved address

### 5.3 Keep `apartments.create` permissive for location

Do not require:

- latitude
- longitude
- nearbyUniversities

Continue requiring:

- street address
- city
- state
- zipCode

SAFE recommendation:

- keep `apartments.create` as the persistence endpoint for now
- do not make it perform geocoding internally in this phase
- save whatever reviewed location text the user confirms

## 6. UI and State Model

### 6.1 Separate form state from resolution state

Current issue:

- save reads both form fields and geocode side state

New client state:

```ts
type ReviewFormState = {
  title: string;
  description: string;
  propertyType: PropertyType;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  bedrooms: number;
  bathrooms: number;
  squareFeet: string;
  monthlyRent: string;
  securityDeposit: string;
  availableFrom: string;
  petsAllowed: boolean;
  parkingIncluded: boolean;
  amenitiesText: string;
  utilitiesText: string;
  isSublease: boolean;
  subleaseEndDate: string;
  leaseTerm: string;
  wechatContact: string;
};

type LocationResolutionState = {
  status: "idle" | "resolving" | "resolved" | "unresolved";
  source?: "address_geocode" | "property_lookup";
  latitude?: number;
  longitude?: number;
  displayName?: string;
  nearbyUniversities?: string[];
  diagnostics: ImportDiagnostic[];
  lastResolvedInputHash?: string;
};
```

Save behavior:

- always save from `ReviewFormState`
- attach resolved lat/lng only if `LocationResolutionState.status === "resolved"`
- save must not depend on `LocationResolutionState` existing

### 6.2 Resolution trigger rules

SAFE trigger behavior:

- do not resolve while extraction is running
- after extraction succeeds, run one auto-resolution pass from `locationCandidate`
- after user edits location fields, debounce and resolve again only if:
  - address length >= 5
  - city length >= 2
  - state length == 2
- if user edits only title/rent/etc., do not re-resolve

### 6.3 Review UI behavior

The review screen should show:

- extraction confidence
- location evidence type
- resolution status
- diagnostics as pills or banners

Required user-facing states:

- `street address extracted directly`
- `property name found, address needs review`
- `location resolved from property lookup, confirm before saving`
- `location could not be verified, listing can still be saved`

## 7. Fallback Matrix

### 7.1 Extraction fallback

| Condition | Behavior | Diagnostic code | Confidence floor |
| --- | --- | --- | --- |
| Gemini key missing | use heuristic extraction | `gemini_unavailable` | `low` |
| Gemini invalid JSON | use heuristic extraction | `gemini_invalid_json` | `low` |
| Gemini truncated | use heuristic extraction | `gemini_truncated` | `low` |
| Gemini schema mismatch | use heuristic extraction | `schema_mismatch` | `low` |
| Duplicate blocks found | continue with deduped text | `duplicate_content_removed` | unchanged |
| Multiple listing candidates | pick best chunk only | `multiple_listing_candidates`, `best_candidate_selected` | max `medium` |
| Conflicting addresses | keep best chunk but mark conflict | `conflicting_addresses` | max `medium` |

### 7.2 Location resolution fallback

| Input evidence | Resolution behavior | Output status | Save allowed |
| --- | --- | --- | --- |
| Direct street address | geocode address | `resolved_from_address` or `not_found` | yes |
| Property name + city/state | try property lookup, then geocode result | `resolved_from_property_lookup`, `ambiguous`, or `not_found` | yes |
| City/state only | skip lookup | `insufficient_input` | yes |
| Missing location | skip lookup | `insufficient_input` | yes |
| Lookup/network error | return unresolved diagnostics | `failed` | yes |

### 7.3 Save fallback

| Resolution state | Save behavior |
| --- | --- |
| Resolved | save reviewed address plus coords/universities |
| Unresolved | save reviewed address only |
| Failed | save reviewed address only |
| Not attempted | save reviewed address only |

## 8. Execution Checklist

### Phase 1: Extraction Contract Cleanup

Goal:

- make extraction deterministic
- stop doing networked location resolution during extraction
- return structured diagnostics and location evidence without changing save behavior yet

Files to touch:

- `/Users/wayne/bridgestay/app/server/wechat-import.ts`
- `/Users/wayne/bridgestay/app/server/routers.ts`
- `/Users/wayne/bridgestay/app/server/wechat-import.test.ts`

Exact code changes:

1. In `wechat-import.ts`, add explicit exported types for:
   - `ImportIssueCode`
   - `ImportDiagnostic`
   - `ExtractedLocationCandidate`
   - `ExtractListingResponse`
2. In `wechat-import.ts`, refactor the current `ExtractedListing` output path so `extractListingFromWeChat()` returns:
   - `listing`
   - `locationCandidate`
   - `diagnostics`
3. In `wechat-import.ts`, keep current preprocessing logic:
   - `preprocessInput`
   - `estimateListingCount`
   - `pickBestCandidateChunk`
   but convert warning strings into structured diagnostic objects.
4. In `wechat-import.ts`, remove the extraction-stage call to `normalizeListingLocation()` from all return paths.
5. In `wechat-import.ts`, keep `normalizeListingLocation()` in place only if needed temporarily for later reuse, but do not call it from extraction.
6. In `wechat-import.ts`, add a pure helper that derives `locationCandidate` from the existing extracted fields:
   - use `looksLikeStreetAddress(listing.address)` to classify `street_address`
   - use `propertyName` when present without a valid street address to classify `property_name`
   - use city/state without street address to classify `city_state_only`
   - use preprocess conflict signals to classify `conflicting`
   - fall back to `missing`
7. In `wechat-import.ts`, convert current string warnings such as:
   - duplicate block removal
   - multi-listing detection
   - conflicting addresses
   - Gemini fallback cases
   into `ImportDiagnostic[]`.
8. In `routers.ts`, keep the existing endpoint name `listings.extractFromWeChat`, but update its return type to the new response shape.
9. In `wechat-import.test.ts`, update or replace tests so they assert:
   - returned `locationCandidate.evidenceType`
   - returned diagnostic codes
   - best-candidate selection still works for noisy multi-listing input
10. Do not change `ImportListing.tsx` in this phase.

Risks:

- the client currently expects the old flat extraction shape, so changing the router response will break the page unless Phase 1 includes a compatibility bridge
- removing extraction-stage normalization may reduce autofilled address quality before Phase 2 exists
- diagnostic refactor could accidentally drop existing warning visibility

Verification steps:

1. Run the server-side extraction tests in `wechat-import.test.ts`.
2. Add or run assertions for:
   - explicit `Address:` input returns `street_address`
   - duplicate content emits `duplicate_content_removed`
   - multi-listing emits `multiple_listing_candidates`
   - conflicting address input emits `conflicting_addresses`
   - property-name-only input returns `property_name`
3. Confirm by code inspection that `extractListingFromWeChat()` no longer calls `normalizeListingLocation()`.
4. Confirm `routers.ts` still exposes `listings.extractFromWeChat` and no save endpoint changes were made.

Rollback plan:

1. Revert `wechat-import.ts`, `routers.ts`, and `wechat-import.test.ts`.
2. Restore the previous flat extraction return shape.
3. Re-enable the direct call to `normalizeListingLocation()` inside extraction if the client still depends on it.

### Phase 2: Dedicated Location Resolution Endpoint

Goal:

- move all networked location resolution into one explicit server endpoint
- preserve current geocoding and property lookup utilities
- make unresolved and ambiguous outcomes explicit and non-fatal

Files to touch:

- `/Users/wayne/bridgestay/app/server/geocoding.ts`
- `/Users/wayne/bridgestay/app/server/routers.ts`
- `/Users/wayne/bridgestay/app/server/wechat-import.ts`
- `/Users/wayne/bridgestay/app/server/geocoding.test.ts` if added

Exact code changes:

1. In `geocoding.ts`, add exported types for:
   - `ResolveLocationStatus`
   - `ResolveLocationResponse`
2. In `geocoding.ts`, add a new exported function:
   - `resolveListingLocation(params)`
3. Implement `resolveListingLocation(params)` using existing helpers only:
   - use `looksLikeStreetAddress` logic, either moved into a shared helper or duplicated safely
   - call existing `geocodeAddress()` for direct street-address inputs
   - call existing `lookupPropertyLocation()` only for `rawPropertyName + city + state`
   - call existing `findNearbyUniversities()` after coordinates are found
4. In `resolveListingLocation(params)`, return explicit statuses:
   - `resolved_from_address`
   - `resolved_from_property_lookup`
   - `insufficient_input`
   - `not_found`
   - `ambiguous`
   - `failed`
5. In `resolveListingLocation(params)`, emit structured diagnostics instead of freeform warnings.
6. In `routers.ts`, add a new mutation:
   - `listings.resolveLocation`
7. In `routers.ts`, keep the existing `listings.geocodeAddress` endpoint untouched during this phase for backward compatibility.
8. In `wechat-import.ts`, do not reintroduce any networked resolution logic.
9. If test coverage is added, create targeted tests for:
   - insufficient input
   - address resolution success/failure
   - ambiguous property lookup behavior

Risks:

- the new endpoint may duplicate some logic already implicit in `normalizeListingLocation()`
- shared helper placement could create circular imports if moved carelessly
- Places ambiguity handling may behave differently from current extraction-side normalization

Verification steps:

1. Run or add tests for `resolveListingLocation(params)`.
2. Confirm `listings.resolveLocation` exists alongside `listings.geocodeAddress`.
3. Confirm property-name-only inputs return unresolved or ambiguous status when confidence is weak.
4. Confirm failed resolution never throws a fatal error path back to the caller for normal not-found cases.
5. Confirm no changes were made to `apartments.create`.

Rollback plan:

1. Revert `geocoding.ts`, `routers.ts`, and any new tests added in this phase.
2. Remove `listings.resolveLocation`.
3. Fall back to the existing `listings.geocodeAddress` endpoint and extraction response from Phase 1.

### Phase 3: Client State Decoupling And Save Cleanup

Goal:

- separate review form state from location resolution state
- move the import page onto the new extraction and resolution contracts
- keep save permissive and independent from resolution success

Files to touch:

- `/Users/wayne/bridgestay/app/client/src/pages/ImportListing.tsx`

Exact code changes:

1. In `ImportListing.tsx`, replace the current `ExtractedListing` page-local type with the new server response shape or a client-local mirror of:
   - `listing`
   - `locationCandidate`
   - `diagnostics`
2. Update the extraction success handler so:
   - `applyExtracted()` maps only `response.listing`
   - `locationCandidate` is stored separately from the form
   - diagnostics are stored separately from extraction confidence
3. Replace the current geocode side state with a dedicated `LocationResolutionState`.
4. Keep the existing debounce pattern, but switch the mutation from `trpc.listings.geocodeAddress` to `trpc.listings.resolveLocation`.
5. On first load into review step, attempt one auto-resolution using:
   - extracted street address when available
   - property name plus city/state when no street address exists
6. Update the review banners so they are driven by:
   - extraction diagnostics
   - `locationCandidate.evidenceType`
   - resolution status
7. Keep address, city, state, and zip as editable form fields.
8. In `handleSave()`, continue to validate the required textual address fields exactly as today.
9. In `handleSave()`, attach `latitude`, `longitude`, and `nearbyUniversities` only when resolution state is `resolved`.
10. Do not modify `apartments.create` schema or the DB layer in this phase.
11. Remove direct behavioral dependence on the old `locationSource`, `locationConfidence`, and `extractionWarning` fields once the UI fully uses the new structures.

Risks:

- this is the phase most likely to cause user-visible regressions in the import page
- timing bugs may appear between extraction success, auto-resolution, manual edits, and save
- the page currently assumes a flat extraction object, so type drift is likely if Phase 1 compatibility is not handled carefully

Verification steps:

1. Test the import page manually with:
   - direct address input
   - property-name-only input
   - multi-listing noisy input
   - address that does not geocode
2. Confirm the review form is populated even when resolution fails.
3. Confirm save still works when `latitude`, `longitude`, and `nearbyUniversities` are absent.
4. Confirm save includes location enrichment only after successful resolution.
5. Confirm editing non-location fields does not retrigger resolution.
6. Confirm editing location fields does retrigger debounced resolution.

Rollback plan:

1. Revert `ImportListing.tsx`.
2. Restore the previous extraction-success handler and direct `geocodeAddress` mutation usage.
3. Keep the server-side Phase 1 and Phase 2 changes in place if they are backward compatible; otherwise revert them together with the client rollback.

## 9. Detailed Rules

### 9.1 Address classification rules

Priority order:

1. Explicit labeled address line
2. Full street address with city/state/zip
3. Street-like fragment
4. Property/building name
5. City/state inference only

Rules:

- property names must never populate `form.address` automatically unless resolution succeeds and returns a normalized address
- extracted property names should be displayed separately in review
- if conflicting explicit addresses exist, mark `conflicting` evidence type and emit diagnostics

### 9.2 Save rules

- save requires reviewed textual address fields
- save does not require location resolution success
- save uses coordinates only as optional enrichment
- save should not re-trigger extraction or resolution

### 9.3 Observability

Add logs with stable tags:

- `[ImportExtraction]`
- `[ImportResolution]`
- `[ImportSave]`

Include:

- fallback path used
- evidence type
- resolution status
- diagnostic codes

Do not log:

- full unredacted image base64
- sensitive user PII beyond existing operational need

## 10. Suggested Data Mapping

### Extraction to review form

- `response.listing.*` -> review form
- `response.locationCandidate.rawAddressText` -> prefill address only if `evidenceType === "street_address"`
- `response.locationCandidate.city/state/zipCode` -> prefill when present
- `response.locationCandidate.rawPropertyName` -> display-only field or non-editable helper text

### Resolution to save payload

- `resolved.latitude/longitude/nearbyUniversities` -> optional create payload enrichment
- `resolved.normalizedAddress` should only overwrite form address if:
  - resolution source is explicit user-triggered or auto-resolution from direct address
  - and the user has not modified the field since resolution started

SAFE default:

- prefer showing the normalized address as a suggestion
- do not silently overwrite a manually edited address

## 11. Migration Strategy

SAFE rollout:

1. Ship server extraction response in compatibility mode.
2. Add `resolveLocation` endpoint.
3. Switch client to new response and resolution endpoint.
4. Remove old extraction-side normalization once the client no longer depends on it.

If a compatibility bridge is needed, keep these deprecated fields temporarily:

- `address`
- `propertyName`
- `locationSource`
- `locationConfidence`
- `extractionWarning`

They should be derived from the new model, not authored independently.

## 12. Acceptance Criteria

This spec is complete when all of the following are true:

- extraction no longer performs external location lookup
- the system distinguishes street address evidence from property-name evidence
- save succeeds even when geocoding and place lookup fail
- fallback behavior is represented by structured diagnostic codes
- the review screen clearly tells the operator what was extracted, what was inferred, and what still needs confirmation
- tests cover direct address, property name only, multi-listing, unresolved location, and save-without-coordinates paths

## 13. Open Decisions

Recommended SAFE defaults unless product wants otherwise:

1. Keep auto-resolution after extraction.
2. Do not auto-overwrite manually edited address fields with normalized results.
3. Keep `apartments.create` unchanged except for cleaner client inputs.
4. Treat ambiguous property lookup as unresolved, not as a soft success.

## 14. Notes From Current Code

Important current behaviors this spec preserves:

- listings can already save without lat/lng because `apartments.create` accepts optional coordinates
- current review UI already communicates unresolved and lookup-based location states
- current preprocess logic for duplicates and multi-listing detection is worth keeping, but should emit structured diagnostics instead of only freeform warnings

Important current behaviors this spec changes:

- extraction will stop calling Google Places/property lookup directly
- location handling becomes a dedicated step instead of implicit side-effect logic
- save will rely on explicit resolution state rather than ad hoc `geocodedData`

## 15. Smallest-Safe-First Recommendation

Start with the smallest safe slice of Phase 1:

1. add the new extraction-side types and diagnostics in `wechat-import.ts`
2. keep `listings.extractFromWeChat` backward compatible for one pass
3. stop calling `normalizeListingLocation()` during extraction
4. update only server-side tests first

Reason:

- this isolates the highest-value architectural fix
- it reduces hidden coupling before any client refactor
- it gives the next coding thread a low-blast-radius checkpoint before introducing a new endpoint or changing UI state

## 16. Builder Prompt for Phase 1

Use this prompt in the coding thread:

```text
Project: BridgeStay
Mode: SAFE

Implement Phase 1 only from /Users/wayne/bridgestay/docs/dev-notes/import-listing-flow-spec.md.

Goal:
- clean up the extraction contract
- remove networked location normalization from extraction
- add structured diagnostics and explicit location evidence
- do not implement Phase 2 or Phase 3

Scope:
- touch only:
  - /Users/wayne/bridgestay/app/server/wechat-import.ts
  - /Users/wayne/bridgestay/app/server/routers.ts
  - /Users/wayne/bridgestay/app/server/wechat-import.test.ts

Requirements:
1. Keep the existing endpoint name `listings.extractFromWeChat`.
2. Refactor extraction to return:
   - `listing`
   - `locationCandidate`
   - `diagnostics`
3. Convert current warning/fallback strings into structured diagnostic codes and messages.
4. Add explicit location evidence classification using the data already extracted.
5. Remove the call to `normalizeListingLocation()` from extraction paths.
6. Preserve current preprocessing behavior for duplicate content, multi-listing detection, and best-chunk selection.
7. Preserve heuristic fallback when Gemini is unavailable or parsing fails.
8. Keep changes as backward compatible as is reasonable for SAFE mode. If needed, include a compatibility adapter on the response so the existing client is less likely to break before Phase 3.
9. Update tests to cover:
   - direct street address evidence
   - property-name-only evidence
   - multi-listing diagnostics
   - conflicting address diagnostics
10. Do not modify ImportListing.tsx in this phase.
11. Do not add new endpoints in this phase.

Verification:
- run the relevant server-side tests for wechat import
- confirm by inspection that extraction no longer performs networked location lookup

Deliverable:
- implement the Phase 1 code changes
- summarize exactly what changed
- note any compatibility assumptions left for Phase 3
```
