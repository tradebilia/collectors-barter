# Tradebilia Project Documentation

## 1. Project Overview

Tradebilia (collectors-barter) is a web application designed for collectors to manage and trade various collectible items. It provides a platform for users to list their inventory, browse other items, and facilitate bartering. The application is built with a modern web stack including React 19, Tailwind 4, tRPC 11, and Drizzle ORM.

## 2. Project Structure and Key Files

The project follows a standard monorepo-like structure with `client/` for the frontend and `server/` for the backend logic.

-   `client/src/pages/AddInventory.tsx`: Main page for adding/editing inventory items; handles form rendering and submission logic.
-   `client/src/hooks/useAddInventoryForm.ts`: Custom hook managing form state, validation, and required field counting.
-   `client/src/components/FieldWithCustomInput.tsx`: Wrapper component for fields that support custom 'Other' text inputs.
-   `client/src/components/DynamicFieldRenderer.tsx`: Core component for rendering different input types (dropdowns, text, etc.) with error styling.
-   `client/src/lib/fieldDefinitionsGenerated.ts`: Contains the schema and requirements for all collectible categories.
-   `drizzle/schema.ts`: Defines the database schema using Drizzle ORM.
-   `server/routers.ts`: tRPC procedures for API endpoints.
-   `server/db.ts`: Database query helpers.

## 3. Recent Changes and Current Progress

The recent development efforts have focused on refining the 'Add Inventory' form experience, specifically ensuring correct field layouts, accurate progress tracking, and clear validation feedback for required fields.

**Key Accomplishments:**

-   Finalized inventory form layouts for all categories (Pokemon, Sports Cards, Comics, Coins, etc.).
-   Fixed dropdown sizing constraints in `client/src/components/ui/select.tsx` to prevent content cutoff.
-   Standardized the 'Condition' field to be required across all Pokemon item types.
-   Implemented logic in `useAddInventoryForm.ts` to correctly count conditional and custom 'Other' fields in the required fields progress counter.
-   Renamed several fields for better clarity (e.g., 'Sets Included' to 'Eras / Series Included' in Pokemon Collection/Lot).
-   Implemented visual feedback for missing required fields when a user attempts to submit the form.
-   **Comprehensive form validation and error display enhancements (Latest Checkpoint: 799be0fc)**:
    -   Updated `validateForm` in `useAddInventoryForm.ts` to check conditional required fields, validate custom "Other" text inputs, and properly reference the photos array.
    -   Passed error state to all field components across Required, Recommended, and Optional sections in `AddInventory.tsx`.
    -   Enhanced error display in `FieldWithCustomInput.tsx` and `DynamicFieldRenderer.tsx` with red borders and error messages for invalid fields.
    -   Added auto-scroll functionality to the first field with an error upon failed form submission.

## 4. URLs

-   **Dev Server Preview URL**: https://3000-iukhy5b029f8klpb63tty-c5c52a54.us2.manus.computer
-   **GitHub Repository**: https://github.com/tradebilia/collectors-barter

## 5. Environment Setup and Secrets

Environment variables are managed through `webdev_request_secrets` and automatically injected. Key environment variables include:

-   `DATABASE_URL`: MySQL/TiDB connection string
-   `JWT_SECRET`: Session cookie signing secret
-   `VITE_APP_ID`: Manus OAuth application ID
-   `OAUTH_SERVER_URL`: Manus OAuth backend base URL
-   `VITE_OAUTH_PORTAL_URL`: Manus login portal URL (frontend)
-   `OWNER_OPEN_ID`, `OWNER_NAME`: Owner's information
-   `BUILT_IN_FORGE_API_URL`: Manus built-in APIs URL
-   `BUILT_IN_FORGE_API_KEY`: Bearer token for Manus built-in APIs (server-side)
-   `VITE_FRONTEND_FORGE_API_KEY`: Bearer token for frontend access to Manus built-in APIs
-   `VITE_FRONTEND_FORGE_API_URL`: Manus built-in APIs URL for frontend

## 6. Database Schema and Migrations

The database schema is defined in `drizzle/schema.ts` using Drizzle ORM. Migrations are generated using `pnpm drizzle-kit generate` and applied via `webdev_execute_sql` to keep the TypeScript schema and actual database in sync.

## 7. Testing Status

The project uses Vitest for unit testing. Specs are located in `server/*.test.ts`. The general approach is to cover changes with Vitest specs and run `pnpm test` to ensure functionality. Frontend testing is primarily done through manual verification and visual inspection during development.
