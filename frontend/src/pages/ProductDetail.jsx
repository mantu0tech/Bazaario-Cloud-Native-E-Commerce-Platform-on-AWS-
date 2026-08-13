import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api';
import { useCart } from '../context/CartContext';

export default function ProductDetail() {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [error, setError] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const { addItem } = useCart();

  useEffect(() => {
    setError('');
    setProduct(null);
    api.getProduct(id).then(setProduct).catch((err) => setError(err.message));
  }, [id]);

  if (error) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <p className="text-slate-500 dark:text-slate-400">{error}</p>
        <Link to="/" className="mt-4 inline-block text-brand-600 hover:underline">
          Back to shop
        </Link>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <div className="grid gap-8 sm:grid-cols-2">
          <div className="h-96 animate-pulse rounded-3xl bg-slate-200 dark:bg-slate-800" />
          <div className="space-y-4">
            <div className="h-6 w-1/3 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
            <div className="h-8 w-2/3 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
            <div className="h-24 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
          </div>
        </div>
      </div>
    );
  }

  function handleAdd() {
    addItem(product, quantity);
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <Link to="/" className="mb-6 inline-block text-sm font-medium text-slate-500 hover:text-brand-600 dark:text-slate-400">
        ← Back to shop
      </Link>
      <div className="grid gap-10 sm:grid-cols-2">
        <img src={product.image} alt={product.name} className="w-full rounded-3xl object-cover shadow-md" />
        <div>
          <span className="rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold text-brand-700 dark:bg-brand-500/20 dark:text-brand-300">
            {product.category}
          </span>
          <h1 className="mt-3 font-display text-3xl font-bold text-slate-900 dark:text-white">{product.name}</h1>
          <div className="mt-2 flex items-center gap-2 text-amber-500">
            {'★'.repeat(Math.round(product.rating))}
            <span className="text-sm text-slate-500 dark:text-slate-400">{product.rating} / 5</span>
          </div>
          <p className="mt-4 text-slate-600 dark:text-slate-300">{product.description}</p>
          <p className="mt-6 font-display text-3xl font-bold text-slate-900 dark:text-white">
            ${product.price.toFixed(2)}
          </p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{product.stock} in stock</p>

          <div className="mt-6 flex items-center gap-4">
            <div className="flex items-center rounded-full border border-slate-200 dark:border-slate-700">
              <button
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="px-3 py-2 text-lg text-slate-600 dark:text-slate-300"
                aria-label="Decrease quantity"
              >
                −
              </button>
              <span className="w-8 text-center font-medium">{quantity}</span>
              <button
                onClick={() => setQuantity((q) => Math.min(product.stock, q + 1))}
                className="px-3 py-2 text-lg text-slate-600 dark:text-slate-300"
                aria-label="Increase quantity"
              >
                +
              </button>
            </div>
            <button
              onClick={handleAdd}
              className="flex-1 rounded-full bg-brand-gradient py-3 font-semibold text-white shadow-glow transition hover:opacity-90"
            >
              {added ? 'Added to cart ✓' : 'Add to cart'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
