import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

export default function Navbar() {
  const { theme, toggleTheme } = useTheme();
  const { user, logout, isAuthenticated } = useAuth();
  const { totalItems } = useCart();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');

  function handleSearch(e) {
    e.preventDefault();
    navigate(query.trim() ? `/?search=${encodeURIComponent(query.trim())}` : '/');
  }

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/60 bg-white/80 backdrop-blur-md dark:border-slate-800/60 dark:bg-slate-950/80">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3 sm:px-6">
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-gradient text-lg font-bold text-white shadow-glow">
            B
          </span>
          <span className="font-display text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Bazaario
          </span>
        </Link>

        <form onSubmit={handleSearch} className="hidden flex-1 sm:block">
          <div className="relative">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              type="text"
              placeholder="Search for headphones, hoodies, mugs..."
              className="w-full rounded-full border border-slate-200 bg-slate-100/70 px-4 py-2 text-sm placeholder:text-slate-400 focus:border-brand-400 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800/70 dark:text-white dark:placeholder:text-slate-500 dark:focus:bg-slate-800"
            />
          </div>
        </form>

        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <button
            onClick={toggleTheme}
            aria-label="Toggle dark mode"
            className="grid h-10 w-10 place-items-center rounded-full border border-slate-200 bg-white text-lg transition hover:border-brand-300 hover:text-brand-600 dark:border-slate-700 dark:bg-slate-900 dark:text-amber-400 dark:hover:border-brand-400"
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>

          <Link
            to="/cart"
            className="relative grid h-10 w-10 place-items-center rounded-full border border-slate-200 bg-white text-lg transition hover:border-coral-500 hover:text-coral-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            aria-label="View cart"
          >
            🛍️
            {totalItems > 0 && (
              <span className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-coral-500 text-[11px] font-bold text-white">
                {totalItems}
              </span>
            )}
          </Link>

          {isAuthenticated ? (
            <div className="flex items-center gap-2">
              <Link
                to="/orders"
                className="hidden rounded-full border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition hover:border-brand-300 hover:text-brand-600 dark:border-slate-700 dark:text-slate-300 sm:block"
              >
                Orders
              </Link>
              <span className="hidden text-sm font-medium text-slate-600 dark:text-slate-300 md:block">
                Hi, {user?.name?.split(' ')[0]}
              </span>
              <button
                onClick={() => {
                  logout();
                  navigate('/');
                }}
                className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 dark:bg-brand-500 dark:hover:bg-brand-400"
              >
                Log out
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to="/login"
                className="rounded-full px-3 py-2 text-sm font-semibold text-slate-600 transition hover:text-brand-600 dark:text-slate-300"
              >
                Log in
              </Link>
              <Link
                to="/register"
                className="rounded-full bg-brand-gradient px-4 py-2 text-sm font-semibold text-white shadow-glow transition hover:opacity-90"
              >
                Sign up
              </Link>
            </div>
          )}
        </div>
      </div>

      <form onSubmit={handleSearch} className="px-4 pb-3 sm:hidden">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          type="text"
          placeholder="Search products..."
          className="w-full rounded-full border border-slate-200 bg-slate-100/70 px-4 py-2 text-sm focus:outline-none dark:border-slate-700 dark:bg-slate-800/70 dark:text-white"
        />
      </form>
    </header>
  );
}
