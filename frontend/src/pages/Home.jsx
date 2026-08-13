import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api';
import ProductCard from '../components/ProductCard';

export default function Home() {
  const [searchParams] = useSearchParams();
  const search = searchParams.get('search') || '';
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState('All');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getCategories().then(setCategories).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    setError('');
    api
      .getProducts({ category: activeCategory, search })
      .then(setProducts)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [activeCategory, search]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <section className="mb-8 overflow-hidden rounded-3xl bg-brand-gradient p-8 text-white shadow-glow sm:p-12">
        <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-white/80"> E-Commerece · payments</p>
        <h1 className="max-w-xl font-display text-3xl font-extrabold leading-tight sm:text-4xl">
          Shop the everyday essentials, in color.
        </h1>
        <p className="mt-3 max-w-lg text-white/90">
          Browse the catalog, add items to your cart, and check out.
        </p>
      </section>

      <div className="mb-6 flex flex-wrap gap-2">
        {['All', ...categories].map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`rounded-full border px-4 py-1.5 text-sm font-medium transition ${
              activeCategory === cat
                ? 'border-brand-500 bg-brand-500 text-white'
                : 'border-slate-200 bg-white text-slate-600 hover:border-brand-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {search && (
        <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
          Showing results for <span className="font-semibold text-slate-800 dark:text-white">"{search}"</span>
        </p>
      )}

      {error && <p className="rounded-xl bg-red-50 p-4 text-red-600 dark:bg-red-500/10">{error}</p>}

      {loading ? (
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-72 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <p className="py-16 text-center text-slate-500 dark:text-slate-400">
          No products match that search. Try a different keyword or category.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}
