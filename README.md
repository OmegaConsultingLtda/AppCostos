# App Costos (Modern)

This is the modern version of App Costos, migrated from a Vanilla JS application to a robust stack using [Next.js 16](https://nextjs.org), [TypeScript](https://www.typescriptlang.org/), and [Tailwind CSS](https://tailwindcss.com/).

## Features

- **Authentication**: Secure login using Firebase Auth.
- **Dashboard**: Real-time financial overview with charts and statistics.
- **Transaction Management**: Add, edit, and delete income and expenses.
- **Multi-Wallet Support**: Manage multiple financial portfolios.
- **Responsive Design**: Optimized for desktop and mobile devices.

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Backend/Database**: Firebase (Firestore & Auth)
- **State Management**: React Context API
- **Charts**: Chart.js with react-chartjs-2

## Getting Started

1.  **Install dependencies:**

    ```bash
    pnpm install
    ```

2.  **Configure Environment Variables:**

    Create a `.env.local` file in the root directory with your Firebase configuration:

    ```env
    NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
    NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
    NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
    ```

3.  **Run the development server:**

    ```bash
    pnpm dev
    ```

    Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Project Structure

- `src/app`: Next.js App Router pages and layouts.
- `src/components`: Reusable UI components (Dashboard, Transactions, Charts, etc.).
- `src/context`: Global state management (WalletContext).
- `src/lib`: Firebase configuration and utility functions.
- `src/types`: TypeScript interfaces and type definitions.
- `src/utils`: Helper functions for formatting and calculations.

