import React from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';

const CATEGORY_COLORS = {
  Electronics: 'bg-brand-100 text-brand-700 dark:bg-brand-500/20 dark:text-brand-300',
  Footwear: 'bg-teal-400/20 text-teal-600 dark:text-teal-300',
  Home: 'bg-amber-400/20 text-amber-600 dark:text-amber-300',
  Accessories: 'bg-coral-400/20 text-coral-600 dark:text-coral-300',
  Apparel: 'bg-pink-400/20 text-pink-600 dark:text-pink-300',
};

export default function ProductCard({ product }) {
  const { addItem } = useCart();

  return (
    <div className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900">
      <Link to={`/product/${product.id}`} className="block overflow-hidden">
        <img
          src={product.image}
          alt={product.name}
          className="h-48 w-full object-cover transition duration-300 group-hover:scale-105"
          loading="lazy"
        />
      </Link>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <span
          className={`w-fit rounded-full px-2 py-0.5 text-xs font-semibold ${
            CATEGORY_COLORS[product.category] || 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
          }`}
        >
          {product.category}
        </span>
        <Link to={`/product/${product.id}`} className="line-clamp-1 font-display font-semibold text-slate-900 hover:text-brand-600 dark:text-white">
          {product.name}
        </Link>
        <p className="line-clamp-2 text-sm text-slate-500 dark:text-slate-400">{product.description}</p>
        <div className="mt-auto flex items-center justify-between pt-2">
          <span className="font-display text-lg font-bold text-slate-900 dark:text-white">
            ${product.price.toFixed(2)}
          </span>
          <span className="flex items-center gap-1 text-sm text-amber-500">★ {product.rating}</span>
        </div>
        <button
          onClick={() => addItem(product, 1)}
          className="mt-2 w-full rounded-xl bg-slate-900 py-2 text-sm font-semibold text-white transition hover:bg-brand-600 dark:bg-brand-500 dark:hover:bg-brand-400"
        >
          Add to cart
        </button>
      </div>
    </div>
  );
}
