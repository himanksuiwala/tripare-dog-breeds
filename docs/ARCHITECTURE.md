# Architecture

Doggo is an offline-first React Native app with committed iOS and Android native
projects—commonly called the bare workflow. It uses Expo SDK 56 modules and Expo
CLI/dev-client tooling, but Expo is a dependency rather than the project model.
The app shows saved breed data immediately, refreshes stale data from the Dog
API, and keeps screen-specific UI state local.

## System design

```mermaid
flowchart LR
    App[App shell<br/>global error boundary]
    Sync[Catalogue sync provider]
    Nav[React Navigation]
    Screens[List · Details · Gallery<br/>screen error boundaries]
    Feature[Breed modules<br/>hooks · UI · pure utilities]
    API[Dog API adapter<br/>validation · retry]
    DB[SQLite adapter]
    Remote[(dogapi.dog)]

    App --> Sync --> Nav --> Screens
    Sync --> Feature
    Screens --> Feature
    Feature --> API --> Remote
    Feature --> DB
```

| Area | Responsibility |
| --- | --- |
| `src/screens` | Navigation-aware orchestration and screen states |
| `src/features/breeds` | Catalogue sync, hooks, filtering, grouping, and breed UI |
| `src/api` | Remote requests, response validation, and retry policy |
| `src/data` | SQLite schema and cached catalogue/detail persistence |
| `src/components` | Shared modal and error-boundary UI |

Screens depend on the breed modules; breed modules depend on the network and
database adapters. The adapters never depend on UI code.

## Data flow

```mermaid
flowchart TD
    Start[App starts] --> Cache[Read SQLite cache]
    Cache --> Show[Publish saved catalogue]
    Cache --> Fresh{Cache fresh?}
    Fresh -- Yes --> Ready[Continue with saved data]
    Fresh -- No --> Fetch[Fetch paged breeds and groups]
    Fetch --> Progress[Publish sync progress]
    Progress --> Save[Replace SQLite snapshot]
    Save --> Updated[Publish refreshed catalogue]
    Fetch -- Failure --> Fallback[Keep saved or partial data<br/>show recoverable error state]

    Show --> List[List screen filters and groups data locally]
    List --> Select[User selects a breed]
    Select --> DetailCache{Details cached?}
    DetailCache -- Yes --> Details[Show details]
    DetailCache -- No --> DetailAPI[Fetch and cache details]
    DetailAPI --> Details
```

Catalogue synchronization runs on launch when data is stale, when the app
returns to the foreground, after connectivity returns, and on manual refresh.
Concurrent triggers share one active synchronization.

## State and failures

- The catalogue provider owns shared server/cache state.
- Screens own temporary UI state such as search, filters, tabs, and sheets.
- Pure utilities perform filtering, grouping, scaling, and parsing.
- Expected network and cache failures become loading/error UI states.
- Unexpected render failures are contained globally and per screen by error
  boundaries; captured errors are logged but never rendered.

This separation keeps rendering independent from transport and persistence while
allowing the app to remain useful with stale or partial cached data.
