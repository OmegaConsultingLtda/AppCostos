# App Costos (Modern)

This is the modern version of App Costos, migrated from a Vanilla JS application to a robust stack using [Next.js 16](https://nextjs.org), [TypeScript](https://www.typescriptlang.org/), and [Tailwind CSS](https://tailwindcss.com/).

## Features

- **Authentication**: (In migration) Firebase removed; will be replaced with Supabase Auth.
- **Dashboard**: Real-time financial overview with charts and statistics.
- **Transaction Management**: Add, edit, and delete income and expenses.
- **Multi-Wallet Support**: Manage multiple financial portfolios.
- **Responsive Design**: Optimized for desktop and mobile devices.

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Backend/Database**: (In migration) Supabase (planned)
- **State Management**: React Context API
- **Charts**: Chart.js with react-chartjs-2

## Getting Started

1.  **Install dependencies:**

    ```bash
    pnpm install
    ```

2.  **Run the development server:**

    ```bash
    pnpm dev
    ```

    Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Project Structure

- `src/app`: Next.js App Router pages and layouts.
- `src/components`: Reusable UI components (Dashboard, Transactions, Charts, etc.).
- `src/context`: Global state management (WalletContext).
- `src/lib`: Client initialization (Supabase will replace the removed Firebase module).
- `src/types`: TypeScript interfaces and type definitions.
- `src/utils`: Helper functions for formatting and calculations.

