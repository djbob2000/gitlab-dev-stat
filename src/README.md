# Application Source Code

This directory contains the application source code, organized by functional purpose.

## Directory Structure

- `/components` - UI components of the application

  - `/common` - Common components used in many places throughout the application
  - `/ui` - Basic UI components (buttons, forms, etc.)

- `/hooks` - React hooks for the application

  - `use-gitlab-token.ts` - Hook for working with GitLab token
  - `use-tracked-developers.ts` - Hook for tracking developers

- `/lib` - Utilities and helper functions

  - `api.ts` - Functions for working with API
  - `crypto.ts` - Functions for encryption/decryption
  - `utils.ts` - General utilities

- `/types` - TypeScript types for the entire application

  - `types.ts` - Core data types

- `/services` - Services for working with external APIs and data

- `/styles` - Global application styles

## File Organization Principles

1. **Grouping by Functionality**: Files and components are grouped by their functional purpose
2. **Modularity**: Each module should have a clear responsibility
3. **Scalability**: The structure should be easily expandable when adding new features
4. **Consistency**: Follow the same naming and organization patterns throughout the project
5. **Documentation**: Important modules and functions should be documented
