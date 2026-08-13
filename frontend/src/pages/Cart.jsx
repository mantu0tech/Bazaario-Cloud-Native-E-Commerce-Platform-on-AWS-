import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';

export default function Cart() {
  const { items, updateQuantity, removeItem, totalPrice } = useCart();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  function handleCheckout() {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: '/checkout' } });
      return;
    }
    navigate('/checkout');
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <p className="text-5xl">🛍️</p>
        <h1 className="mt-4 font-display text-2xl font-bold text-slate-900 dark:text-white">Your cart is empty</h1>
        <p className="mt-2 text-slate-500 dark:text-slate-400">Add a few things you like and they'll show up here.</p>
        <Link
          to="/"
          className="mt-6 inline-block rounded-full bg-brand-gradient px-6 py-3 font-semibold text-white shadow-glow"
        >
          Browse products
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <h1 className="mb-6 font-display text-2xl font-bold text-slate-900 dark:text-white">Your cart</h1>
      <div className="space-y-4">
        {items.map(({ product, quantity }) => (
          <div
            key={product.id}
            className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
          >
            <img src={product.image} alt={product.name} className="h-20 w-20 rounded-xl object-cover" />
            <div className="flex-1">
              <Link to={`/product/${product.id}`} className="font-semibold text-slate-900 hover:text-brand-600 dark:text-white">
                {product.name}
              </Link>
              <p className="text-sm text-slate-500 dark:text-slate-400">${product.price.toFixed(2)} each</p>
            </div>
            <div className="flex items-center rounded-full border border-slate-200 dark:border-slate-700">
              <button
                onClick={() => updateQuantity(product.id, quantity - 1)}
                className="px-3 py-1.5 text-slate-600 dark:text-slate-300"
                aria-label="Decrease quantity"
              >
                −
              </button>
              <span className="w-6 text-center text-sm font-medium">{quantity}</span>
              <button
                onClick={() => updateQuantity(product.id, quantity + 1)}
                className="px-3 py-1.5 text-slate-600 dark:text-slate-300"
                aria-label="Increase quantity"
              >
                +
              </button>
            </div>
            <p className="w-20 text-right font-semibold text-slate-900 dark:text-white">
              ${(product.price * quantity).toFixed(2)}
            </p>
            <button
              onClick={() => removeItem(product.id)}
              className="text-slate-400 transition hover:text-coral-600"
              aria-label={`Remove ${product.name}`}
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      <div className="mt-8 flex items-center justify-between rounded-2xl bg-slate-100 p-6 dark:bg-slate-900">
        <div>
          <p className="text-sm text-slate-500 dark:text-slate-400">Order total</p>
          <p className="font-display text-2xl font-bold text-slate-900 dark:text-white">${totalPrice.toFixed(2)}</p>
        </div>
        <button
          onClick={handleCheckout}
          className="rounded-full bg-brand-gradient px-8 py-3 font-semibold text-white shadow-glow transition hover:opacity-90"
        >
          Checkout
        </button>
      </div>
    </div>
  );
}
