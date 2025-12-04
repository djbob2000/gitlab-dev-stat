# GitLab Analytics Dashboard - Agent Guide

## Overview

The GitLab Analytics Dashboard is a Next.js 16 application that provides comprehensive developer productivity analytics by tracking metrics from GitLab issues and merge requests. The application offers real-time progress tracking, secure API integration, and interactive data visualizations.

## Core Architecture

### Technology Stack

- **Framework**: Next.js 16 with App Router
- **Language**: TypeScript for type safety
- **Styling**: Tailwind CSS 4 for modern UI design
- **UI Components**: Shadcn UI component library
- **State Management**: React Hook Forms for form handling
- **API Integration**: GitLab REST API v4
- **Routing**: Typed Routes for type-safe navigation
- **React**: Version 19.2.0
- **Build System**: Turbopack for fast development and builds
- **Caching**: Component-level caching enabled (cacheComponents)
- **Package Manager**: pnpm for efficient dependency management
- **Linting**: Biome for fast linting and formatting
- **UI Framework**: Radix UI primitives with shadcn/ui components
- **State Management**: Custom React hooks + React Hook Forms
- **Database**: LibSQL integration for local data persistence
- **Accessibility**: Full a11y support with Radix UI
- **Performance**: Babel React Compiler for optimization
- **Drag & Drop**: DnD Kit for interactive UI components
- **Table Management**: TanStack React Table for data tables
- **Themes**: next-themes for dark/light mode support
- **Notifications**: Sonner for toast notifications
- **Validation**: Zod for runtime type checking
- **Dev Tools**: nextjs-toploader for navigation feedback
- **Development**: next-devtools-mcp for enhanced debugging

### Project Structure

```
src/
├── app/               # Next.js App Router pages
│   ├── api/           # API routes for GitLab data fetching
│   ├── projects/      # Project management pages
│   ├── settings/      # Configuration and token management
│   ├── actions/       # Server Actions (token validation, etc.)
│   ├── home-page-client.tsx  # Client component with Suspense
│   └── page.tsx       # Server component with Suspense
├── components/        # Reusable UI components
│   ├── ui/            # Base UI components (shadcn/ui + Radix)
│   ├── common/        # Shared components (tables, data tables)
│   ├── home/          # Homepage-specific components
│   ├── project-card.tsx     # Project display component
│   └── developer-card.tsx   # Developer metrics component
├── hooks/             # Custom React hooks for state management
│   ├── use-gitlab-token.ts  # GitLab token management
│   ├── use-projects.ts      # Project data management
│   ├── use-tracked-developers.ts
│   └── use-auto-refresh.ts  # Auto-refresh functionality
├── lib/               # Utility functions and helpers
│   ├── api.ts         # GitLab API client
│   ├── api-utils.ts   # API utility functions
│   └── api-error-handler.ts # Error handling
├── types/             # TypeScript type definitions
│   ├── gitlab/        # GitLab-specific types
│   │   ├── base.ts    # Base type definitions
│   │   ├── projects.ts # Project-related types
│   │   └── developers.ts # Developer-related types
│   └── index.ts       # Re-exported types
├── constants/         # Application constants
│   ├── storage-keys.ts # localStorage keys
│   ├── labels.ts      # Label constants
│   └── http-status.ts # HTTP status codes
└── proxy.ts          # API proxy configuration
```

## Next.js 16 Features Used

### Streaming with Suspense

- **Server Components with Suspense**: Uses `Suspense` boundaries for streaming UI
- **Promise-based Data Loading**: Implements React's `use()` hook for promise consumption
- **Progressive Enhancement**: Content streams progressively as data becomes available

### Cache Components

- **Component-level Caching**: Enabled via `cacheComponents: true` in next.config.ts
- **Intelligent Caching**: Prevents unnecessary re-renders and API calls
- **Cache Invalidation**: Proper cache invalidation strategies for real-time data

### Typed Routes

- **Type-safe Navigation**: Automatic route typing via `typedRoutes: true`
- **Compile-time Safety**: Route parameter validation at build time
- **IDE Support**: Full autocomplete for route navigation

### Server Actions

- **Token Validation**: Server Actions for secure token validation and encryption
- **Client-Server Communication**: Direct server-side function calls from client
- **Type Safety**: Full TypeScript support for server action parameters

## Code Standards

### General Principles

- **Language:** TypeScript with strict type checking.
- **Style:** Concise, functional, and declarative. Follow Biome rules.
- **Exports:** Favor named exports over default exports.
- **Enums:** Use `as const` objects instead of native `enum`.
- **Type Safety:** Avoid `any`; use `unknown`. Use `import type` for type-only imports.
- **Comments:** Use English. Explain the "why," not the "what." Use JSDoc for public APIs.

### React 19 usage rules

- **Prefer `use()`** for declarative reading of async resources and context inside render. Do not create promises in render — pass cached or externally created promises. Always wrap suspended trees in `<Suspense>` with a clear fallback.
- **Use Actions for mutations and forms.** Use `useActionState`, `useOptimistic`, and the new `<form action={fn}>` patterns for pending state, errors and optimistic updates instead of manual `useState` loading flows.
- **Optimistic updates:** prefer `useOptimistic` for instant UI feedback and automatic reversion on error.
- **Form helpers:** use `useFormStatus` (from `react-dom`) in shared UI components to read parent `<form>` pending state without prop drilling.
- **Refs & Context:** you can pass `ref` as a normal prop to functional components in most cases (no `forwardRef` boilerplate). Use the simplified context read with `use(context)` for conditional reads — it works where `useContext` fails.
- **Metadata & resource hints:** components may render `<title>`, `<meta>`, `<link>` directly — React handles hoisting/deduplication. For resource preinitialization use `react-dom` static APIs: `preload`, `preinit`, `preconnect`, `prefetchDNS`.
- **View Transitions:** Animate elements that update inside a Transition or navigation.
- **useEffectEvent:** Extract non-reactive logic from Effects into reusable Effect Event functions.
- **Activity:** Render "background activity" by hiding UI with `display: none` while maintaining state and cleaning up Effects. This allows pre-rendering and keeping state for hidden parts of the app without impacting performance.

#### Example 1: Streaming data with use() hook (React 19 + Next.js)

```tsx
// Server Component (app/page.tsx)
import { Suspense } from 'react';
import UserProfile from '@/components/UserProfile';

export default async function Page() {
  // Don't await the data fetching function - pass Promise as prop
  const userPromise = getUser();

  return (
    <Suspense fallback={<p>Loading user profile...</p>}>
      <UserProfile userPromise={userPromise} />
    </Suspense>
  );
}
```

```tsx
// Client Component (@/components/UserProfile.tsx)
'use client';
import { use } from 'react';

export default function UserProfile({
  userPromise,
}: {
  userPromise: Promise<{ id: string; name: string }>;
}) {
  // Use the use() hook to read the promise
  const user = use(userPromise);

  return <div>{user.name}</div>;
}
```

**Key Points:**

- Promise is created in Server Component and passed as prop
- Client Component uses `use(promise)` to read data
- `<Suspense>` enables streaming for better UX

#### Example 2: Optimistic updates with useActionState

```tsx
import { useActionState, useOptimistic } from 'react';

function UpdateProfile({ currentName, onUpdate }) {
  const [optimisticName, setOptimisticName] = useOptimistic(currentName);

  const [error, submitAction, isPending] = useActionState(async (prev, formData) => {
    const newName = formData.get('name');
    const res = await updateName(newName);
    if (res.error) return res.error;
    return null;
  }, null);

  return (
    <form action={submitAction}>
      <p>Your name: {optimisticName}</p>
      <input
        name="name"
        defaultValue={optimisticName}
        onChange={e => setOptimisticName(e.target.value)}
      />
      <button type="submit" disabled={isPending}>
        Save
      </button>
      {error && <p className="text-destructive">{error}</p>}
    </form>
  );
}
```

#### Example 3: View Transitions

```tsx
import { ViewTransition, useState, startTransition } from 'react';

function Item() {
  return (
    <ViewTransition>
      <div>Some item</div>
    </ViewTransition>
  );
}

export default function Component() {
  const [showItem, setShowItem] = useState(false);
  return (
    <>
      <button
        onClick={() => {
          startTransition(() => {
            setShowItem(prev => !prev);
          });
        }}
      >
        {showItem ? 'Hide' : 'Show'}
      </button>

      <Activity mode={showItem ? 'visible' : 'hidden'}>
        <Item />
      </Activity>
    </>
  );
}
```

#### Example 4: useEffectEvent

```tsx
import { useEffect, useContext, useEffectEvent } from 'react';

function Page({ url }) {
  const { items } = useContext(ShoppingCartContext);
  const numberOfItems = items.length;

  const onNavigate = useEffectEvent(visitedUrl => {
    logVisit(visitedUrl, numberOfItems);
  });

  useEffect(() => {
    onNavigate(url);
  }, [url]);

  // ...
}
```

#### Example 5: Activity

```tsx
import { Activity, useState } from 'react';
import Sidebar from './Sidebar.js';

export default function App() {
  const [isShowingSidebar, setIsShowingSidebar] = useState(true);

  return (
    <>
      <Activity mode={isShowingSidebar ? 'visible' : 'hidden'}>
        <Sidebar />
      </Activity>

      <main>
        <button onClick={() => setIsShowingSidebar(!isShowingSidebar)}>Toggle sidebar</button>
        <h1>Main content</h1>
      </main>
    </>
  );
}
```

### Frontend Implementation Standards

#### App Router Usage

- **Server Components:** Use Server Components by default for better performance and SEO
- **Client Components:** Use `'use client'` only for interactivity, hooks, and browser APIs
- **Streaming:** Implement proper Suspense boundaries for progressive loading

#### Data Fetching Patterns

- **Server Components:** Fetch data directly using `async/await`. Use `fetch` options for caching (`cache: 'no-store'` or `next: { revalidate: 60 }`)
- **Client Components with use() hook:**
  - **Recommended Pattern:** Pass Promise as prop from Server Component to Client Component, then use `use(promise)` in Client Component
  - **Suspense Required:** Always wrap components using `use()` in `<Suspense>` with meaningful fallback
  - **Streaming:** This approach enables streaming UI for better perceived performance

## Key Features

### 1. Developer Productivity Tracking

- **Issue Analytics**: Tracks issue creation, resolution times, and developer contributions
- **Merge Request Metrics**: Analyzes code review duration and merge efficiency
- **Cycle Time Analysis**: Measures end-to-end development cycle times
- **Active Development Time**: Tracks actual coding vs. review vs. idle time

### 2. Project Management

- **Multi-Project Support**: Track analytics across multiple GitLab projects
- **Developer Selection**: Choose specific developers to track per project
- **Project Filtering**: Filter and search through projects
- **Real-time Updates**: Auto-refreshing data with loading states

### 3. Security & Authentication

- **GitLab Token Management**: Secure storage and validation of GitLab personal access tokens
- **Token Encryption**: Sensitive token data is encrypted before storage
- **Permission Validation**: Verifies token permissions before API calls
- **Environment-based Configuration**: Uses environment variables for sensitive data

### 4. Data Visualization

- **Interactive Tables**: Sortable, filterable data tables with pagination
- **Developer Cards**: Individual developer performance summaries
- **Project Cards**: Project-level analytics overview
- **Loading States**: Animated loading indicators and skeleton screens

## Core Components

### Pages (App Router)

1. **Home Page (`/`)**: Main dashboard with analytics overview
2. **Projects Page (`/projects`)**: Project management and selection
3. **Settings Page (`/settings`)**: Token configuration and management
4. **Developer Analytics (`/project-developers/[projectId]`)**: Detailed developer metrics

### Key Components

- **ProjectCard**: Displays project information and tracking status
- **DeveloperCard**: Shows individual developer statistics
- **DataTable**: Interactive table component for analytics data
- **ThemeToggle**: Dark/light mode switcher
- **RefreshControls**: Manual and auto-refresh controls

### Custom Hooks

- **useGitLabToken**: Manages GitLab token state and validation
- **useProjects**: Handles project data fetching and state management
- **useTrackedDevelopers**: Manages developer selection and tracking
- **useAutoRefresh**: Implements automatic data refresh functionality

## API Integration

### GitLab REST API v4 Endpoints Used

- `GET /projects`: Fetch user projects
- `GET /projects/:id`: Get project details
- `GET /projects/:id/issues`: Fetch project issues with statistics
- `GET /projects/:id/merge_requests`: Get merge request data
- `GET /projects/:id/members/all`: Fetch project members/developers

### Custom API Routes

- `POST /api/gitlab/token`: Token validation and encryption
- `GET /api/gitlab/projects`: Fetch user projects with filtering
- `GET /api/gitlab/project-developers/:projectId`: Get project developers
- `GET /api/statistics/:projectId`: Fetch analytics data for projects

## Data Models

### ProjectData Interface

```typescript
interface ProjectData {
  id: GitLabId;
  name: string;
  path: string;
  developers: ProjectDeveloper[];
  data: IssueStatistics[];
  statistics: ProjectStatistics;
  isLoading: boolean;
  error?: string | null;
  lastUpdated?: Date;
}
```

### DeveloperStatistics Interface

```typescript
interface DeveloperStatistics {
  developer: TrackedDeveloper;
  issues: DeveloperIssueStats;
  mergeRequests: MergeRequestStatistics;
  contributionScore: number;
  lastActive: string;
  projectContributions: ProjectContribution[];
}
```

## Configuration Requirements

### Environment Variables

```env
GITLAB_BASE_URL=your-gitlab-instance-url
GITLAB_PROJECT_ID=your-project-id
GITLAB_PROJECT_PATH=your/project/path
SECRET_KEY=your-encryption-secret
```

### Required Permissions

GitLab personal access token needs:

- `api` scope for full API access
- `read_repository` for project access
- `read_user` for user information

## Development Patterns

### Data Flow

1. User enters GitLab token in settings
2. Token is validated and stored securely
3. Projects are fetched from GitLab API
4. User selects projects and developers to track
5. Analytics data is fetched and displayed in interactive tables
6. Auto-refresh keeps data updated

## Performance Considerations

### Optimization Features

- **Skeleton Loading**: Prevents layout shift during data loading
- **Lazy Loading**: Components loaded on demand
- **Efficient Re-renders**: Optimized React patterns
- **Caching**: Intelligent data caching strategies

### Auto-refresh System

- Configurable refresh intervals
- Manual refresh controls
- Background refresh without UI blocking
- Stale data detection and refresh

## Error Handling

### Error Types Handled

- **Token Validation Errors**: Invalid or expired GitLab tokens
- **API Rate Limiting**: Handle GitLab API rate limits gracefully
- **Network Errors**: Offline detection and retry mechanisms
- **Data Validation**: API response validation and type checking

## Security Considerations

### Token Security

- Tokens encrypted using AES encryption
- Client-side token validation
- Secure token transmission
- No token logging or exposure

### API Security

- Proper HTTP headers for API requests
- Error sanitization to prevent information leakage
- Rate limiting consideration
- Secure environment variable usage

## Deployment Notes

### Build Requirements

- Node.js 18+ required
- Environment variables must be set
- GitLab instance must be accessible
- SSL/TLS recommended for production

### Production Considerations

- Environment variable validation
- Error monitoring setup
- Performance monitoring
- User access controls

## Common Tasks for Agents

### Adding New Metrics

1. Define new TypeScript interfaces in `types/`
2. Extend GitLab API calls in `services/`
3. Add new components in `components/`
4. Update hooks to handle new data

### Modifying UI Components

1. Edit components in `components/` directory
2. Use Tailwind CSS classes for styling
3. Follow shadcn/ui component patterns
4. Ensure responsive design compatibility

### Working with GitLab API

1. Check existing API routes in `app/api/`
2. Add new endpoints following Next.js App Router pattern
3. Handle authentication and error cases
4. Use TypeScript interfaces for type safety

### Debugging Common Issues

1. **Token Issues**: Check token permissions and expiration
2. **API Errors**: Verify GitLab instance accessibility
3. **UI Bugs**: Check component props and state management
4. **Performance**: Monitor API response times and caching

This project provides a solid foundation for developer analytics with room for expansion and customization based on specific organizational needs.
