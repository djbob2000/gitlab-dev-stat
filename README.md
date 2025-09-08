# GitLab Analytics Dashboard

A Next.js application for tracking developer productivity metrics from GitLab issues and merge requests.

## Features

- 🛠 Real-time progress tracking with animated loading states
- 🔒 Secure token encryption/decryption for GitLab API access
- 📊 Time tracking metrics including:
  - Active development time
  - Code review duration
  - Cycle time analysis
- 👥 Developer management system with selective tracking
- 📈 Interactive data visualizations

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4
- **UI Components**: Shadcn UI
- **State Management**: React Hook Forms
- **API**: GitLab REST API integration
- **Routing**: Typed Routes for type-safe navigation

## Getting Started

1. Clone the repository

```bash
git clone [your-repo-url]
```

2. Install dependencies

```bash
npm install
```

3. Configure environment variables (create `.env.local` file):

```env
GITLAB_BASE_URL=your-gitlab-instance-url
GITLAB_PROJECT_ID=your-project-id
GITLAB_PROJECT_PATH=your/project/path
SECRET_KEY=your-encryption-secret
```

4. Run the development server:

```bash
npm run dev
```

## Project Structure

```bash
src/
├── app/               # Next.js app router components
│   ├── api/           # API routes
│   └── components/    # Page components
├── hooks/             # Custom React hooks
├── lib/               # Utilities and helpers
├── services/          # GitLab API service layer
├── styles/            # Global CSS styles
└── types/             # TypeScript type definitions
```

## API Endpoints

### `GET /api/statistics`

- Parameters: `usernames`, `userIds`

## Typed Routes

This project uses Next.js Typed Routes for type-safe navigation. The feature is enabled in `next.config.ts` and provides automatic type checking for all internal links and router navigation.

Benefits:
- Type safety for all route paths
- Autocomplete for route paths in IDE
- Compile-time error detection for invalid routes
- Automatic route parameter typing

Usage:
- All `next/link` components now have type checking for href prop
- `useRouter` hook methods (push, replace, etc.) are type-safe
- Route parameters are automatically typed based on file structure
