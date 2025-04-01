# Application Components

This directory contains application components organized according to the following structure:

## Directory Structure

- `/common` - Common components used in many places throughout the application

  - `/data-table` - Data table components
  - `/columns` - Column definitions for different tables
  - `columns.tsx` - Column exports
  - `refresh-controls.tsx` - Controls for refreshing data
  - `theme-toggle.tsx` - Theme switcher (light/dark)

- `/home` - Components specific to the home page

  - `Header.tsx` - Home page header component
  - `ProjectsList.tsx` - List of projects on the home page

- `/ui` - Basic UI components used to build the interface

  - `badge.tsx` - Badge component for labels
  - `button.tsx` - Button component
  - `card.tsx` - Card container component
  - `checkbox.tsx` - Checkbox input component
  - `dialog.tsx` - Dialog/modal component
  - `form.tsx` - Form components
  - `input.tsx` - Text input component
  - `label.tsx` - Form label component
  - `progress.tsx` - Progress indicator component
  - `skeleton.tsx` - Skeleton loading component
  - `sonner.tsx` - Toast notification component
  - `table.tsx` - Table component
  - `use-form-field.ts` - Form field hook

- Root components
  - `developer-card.tsx` - Card showing developer information
  - `project-card.tsx` - Card showing project information
