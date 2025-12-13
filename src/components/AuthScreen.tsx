'use client';

import React from 'react';

export default function AuthScreen() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
      <div className="w-full max-w-md mx-4 bg-surface p-8 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
        <h2 className="text-2xl font-bold text-text-primary text-center mb-4">
          Authentication disabled
        </h2>
        <p className="text-text-secondary text-sm leading-relaxed">
          Firebase has been removed as part of the migration to Vercel + Supabase. This screen is a temporary
          placeholder until Supabase Auth is implemented.
        </p>

        <button
          type="button"
          onClick={() => window.location.reload()}
          className="w-full mt-6 bg-brand-primary hover:bg-brand-primary/90 text-white font-bold py-2 px-4 rounded-lg transition-colors"
        >
          Reload
        </button>
      </div>
    </div>
  );
}
