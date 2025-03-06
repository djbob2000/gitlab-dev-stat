# Application Components

This directory contains application components organized according to the following structure:

## Directory Structure

- `/common` - Common components used in many places throughout the application

  - `data-table.tsx` - Table for displaying developer data
  - `columns.tsx` - Column definitions for the data table
  - `theme-toggle.tsx` - Theme switcher (light/dark)

- `/ui` - Basic UI components used to build the interface
  - Buttons, forms, inputs, checkboxes, etc.

## Component Organization Guidelines

1. **Atomicity**: Components should be as atomic and reusable as possible
2. **Grouping by Purpose**: Group components by their functional purpose
3. **Separation of Concerns**: Components should have clear, single responsibilities
4. **Documentation**: It's important to document components using JSDoc or comments
