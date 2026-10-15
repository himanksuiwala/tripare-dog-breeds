# Doggo app design specification

This document is the agreed implementation contract for Doggo. It describes
what the app does and the behavior that must remain stable as the code evolves.
For system structure and technical rationale, see
[Architecture](../docs/ARCHITECTURE.md) and
[Technical decisions](../docs/DECISIONS.md).

## Product scope

Doggo is a mobile dog-breed catalogue with three native-stack routes:

1. Breed catalogue
2. Breed details
3. Full-screen breed gallery

The app supports local search and filtering, cached offline use, background
synchronization, and graceful recovery from network and rendering failures.

## Experience principles

- Preserve useful content while refreshing or recovering from partial failure.
- Show whether catalogue results are complete; never present partial data as a
  complete dataset.
- Keep navigation, scrolling, and reading available during background work.
- Omit unavailable optional data instead of rendering empty placeholders.
- Use a restrained warm-neutral visual system through NativeWind tokens.
- Keep interactions accessible with labels, pressed states, and announced
  numeric values where applicable.

## Catalogue

### Rows and navigation

- Preserve API ordering.
- Render compact, fully tappable rows without chevrons.
- Each row contains the first available image thumbnail, breed name, lifespan,
  and a hypoallergenic badge when applicable.
- Use a breed-name monogram when the thumbnail cannot load.
- Navigate to details with the typed parameter `{ breedId: string }`.
- Preserve catalogue criteria and scroll position when returning from details.

### Loading and synchronization

1. Read the cached SQLite catalogue at startup.
2. Fetch page 1 with 48 records to discover authoritative pagination metadata.
3. Fetch page 2 when it exists, while fetching breed groups concurrently.
4. Wait for the group request to settle, then publish the initial batch.
5. Fetch pages 3 through the API-provided last page concurrently.
6. Retry each page independently with the shared retry policy.
7. Commit background pages in one ordered, breed-ID-deduplicated merge.
8. Persist successful snapshots and synchronization metadata to SQLite.

The observed catalogue currently contains six pages, but the implementation
must derive the page count from the API.

While pages 3–N load, catalogue rows, navigation, scrolling, and refresh remain
available; search and filters remain disabled. Progress is visible to the user.

If background pages ultimately fail, retain the available breeds, mark counts
and results as incomplete, enable search and filters for that partial set, and
offer a non-blocking retry. A group request failure does not block breeds;
unmatched breeds appear under “Other.”

Pull-to-refresh reloads pages and groups without discarding the current usable
catalogue. Show a full-screen error only when the initial batch fails and no
cached catalogue exists.

### Search

- Debounce input by 300 ms.
- Match case-insensitive substrings against breed name and alternate names.
- Preserve API ordering.
- Provide a clear action.
- Dismiss the keyboard on list drag or Search submission.
- Keep an empty catalogue distinct from a no-search-results state.

### Filters

Filter criteria use OR within a category and AND across categories and search.
Changes remain drafts until the user confirms them; dismissing the sheet drops
uncommitted changes.

| Category | Behavior |
| --- | --- |
| Breed group | Multi-select chips populated from the groups endpoint |
| Size | Maximum adult male/female weight: Small ≤10 kg; Medium >10–25 kg; Large >25–45 kg; Giant >45 kg |
| Coat | Short, Medium, Long, Wire, or Hairless; Wire takes precedence over length |
| Hypoallergenic | Any, Yes, or No |
| Social traits | Optional 1–5 minimums for children, dogs, and strangers |

Missing coat or trait data does not match an active criterion. The filter button
shows the active-criteria count. The shared bottom sheet has a scrollable body
and fixed “Clear All” and dynamic “Show n breeds” actions. No-results content
offers contextual actions to clear search or filters.

## Breed details

Details fetch authoritative data from `/api/v2/breeds/:id`; the catalogue model
stays lightweight. The native header starts with Back navigation and updates to
the breed name after loading.

A fixed segmented control switches between Overview, Traits, and Gallery. Each
tab scrolls independently and resets to the top when selected.

### Overview

- First available medium image, with monogram fallback and attribution
- Description and lifespan in years
- Male and female weight in kilograms
- Male and female height in centimeters
- Available origin information
- Alternate-name and recognizing-club chips

Missing optional fields are omitted. If all origin fields are absent, display
“Origin unavailable.” Coat, sources, breed group, and duplicate
hypoallergenic information are outside this view.

### Traits

- Ten labeled five-segment scales grouped into Lifestyle, Care, and Social
- Accessible values announced as `n/5`
- Daily exercise in minutes on a scale clamped at 120 minutes
- Temperament tags

### Detail states

- Use a structured skeleton during initial loading.
- Render a dedicated Breed Not Found state for HTTP 404.
- Render a retryable general error for other request failures.

## Gallery

The Gallery tab renders a three-column grid of square `thumb` images. Broken
thumbnails use the breed monogram; an empty collection displays “No photos
available.”

Selecting an image opens the typed gallery route with `{ breedId, imageId }`.
The gallery refetches authoritative breed data and falls back to the first image
if the selected ID is absent.

- Use `large`, falling back to `medium`, with `contain` on a dark background.
- Allow horizontal paging bounded by the first and last image.
- Do not add pinch zoom or tap-to-hide controls.
- Display and announce “Image n of total.”
- Show an available author credit below the image.
- Replace a broken full-size image with a monogram without interrupting paging.

A persistent information button opens a blocking, bottom-anchored attribution
sheet. It displays only available author, license, and source text; URLs and
external links are not stored for presentation or rendered.

Loading uses a dark full-screen indicator. Failure retains Back navigation and
offers Retry.

## Networking policy

All remote JSON is treated as `unknown`, validated at the API boundary, and
mapped to typed app models containing only required fields.

Requests make at most three attempts:

1. Immediate request
2. Retry after 500 ms
3. Retry after 1,000 ms

Retry network failures, HTTP 408, 429, and 5xx responses. Do not retry aborted
requests, invalid API payloads, 404s, or other non-transient 4xx responses. Do
not add jitter. Apply this policy consistently to catalogue pages, groups, and
breed details.

## Persistence and images

- Persist catalogue rows, details, groups, and sync metadata in SQLite.
- Replace catalogue snapshots transactionally.
- Cache catalogue thumbnails proactively in batches of 24 using the
  `expo-image` disk cache.
- Load hero, gallery-thumbnail, and full-size images on demand; do not store
  their files or URLs as cached binary data in SQLite.
- Treat any native image or HTTP caching of larger images as opportunistic, not
  an application guarantee.

## Failure containment

- Place one global error boundary outside `CatalogueSyncProvider`.
- Place one screen boundary around each major route.
- Screen fallbacks provide “Try again” and “Go back” when Back is available.
- Reset the details boundary when `breedId` changes.
- Reset the gallery boundary when `breedId` or `imageId` changes.
- The terminal global fallback says: “Doggo couldn’t start. Close and reopen
  the app to try again.”
- Never render captured messages, stacks, component stacks, or application data
  in any environment. Log captured errors through `console.error` only.

Expected network, validation, and persistence failures remain explicit app
states; error boundaries are for unexpected render and lifecycle failures.

## Engineering constraints

- Use strict TypeScript without `any`.
- Keep route names and parameters type-safe.
- Keep transport, persistence, transformation, and presentation concerns
  separated.
- Keep reusable filter and transformation constants outside render paths.
- Screens orchestrate feature components; gallery presentation does not own
  navigation.
- Cover parsing, retry, pagination merging, partial failure, filtering, trait
  normalization, image selection, and boundary reset behavior with focused
  tests.
- Before completing implementation changes, run Prettier, tests, lint, strict
  type checking, Expo dependency validation, and the relevant production bundle
  check.
