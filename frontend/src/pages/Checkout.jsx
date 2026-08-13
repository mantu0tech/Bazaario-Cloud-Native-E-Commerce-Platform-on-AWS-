import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';

function formatCardNumber(value) {
  const digits = value.replace(/\D/g, '').slice(0, 16);
  return digits.replace(/(.{4})/g, '$1 ').trim();
}

function formatExpiry(value) {
  const digits = value.replace(/\D/g, '').slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

export default function Checkout() {
  const { items, totalPrice, clearCart } = useCart();
  const { token } = useAuth();
  const navigate = useNavigate();

  const [cardName, setCardName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(null);
  const [loading, setLoading] = useState(false);

  if (items.length === 0 && !success) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <p className="text-slate-500 dark:text-slate-400">Your cart is empty, so there's nothing to check out.</p>
        <Link to="/" className="mt-4 inline-block text-brand-600 hover:underline">
          Back to shop
        </Link>
      </div>
    );
  }

  async function handlePay(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const payload = {
        items: items.map((i) => ({ productId: i.product.id, quantity: i.quantity })),
        payment: { cardNumber, expiry, cvc, method: 'card' },
      };
      const result = await api.checkout(payload, token);
      setSuccess(result);
      clearCart();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <p className="text-5xl">✅</p>
        <h1 className="mt-4 font-display text-2xl font-bold text-slate-900 dark:text-white">Payment approved</h1>
        <p className="mt-2 text-slate-500 dark:text-slate-400">{success.message}</p>
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 text-left dark:border-slate-800 dark:bg-slate-900">
          <p className="text-sm text-slate-500 dark:text-slate-400">Order #{success.order.id}</p>
          <p className="font-display text-xl font-bold text-slate-900 dark:text-white">
            ${success.order.total.toFixed(2)}
          </p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Card ending in {success.order.card_last4}</p>
        </div>
        <div className="mt-6 flex justify-center gap-3">
          <Link to="/orders" className="rounded-full bg-brand-gradient px-6 py-3 font-semibold text-white shadow-glow">
            View my orders
          </Link>
          <Link to="/" className="rounded-full border border-slate-200 px-6 py-3 font-semibold text-slate-600 dark:border-slate-700 dark:text-slate-300">
            Keep shopping
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="mb-2 font-display text-2xl font-bold text-slate-900 dark:text-white">Checkout</h1>
      <p className="mb-6 inline-block rounded-full bg-amber-400/20 px-3 py-1 text-sm font-medium text-amber-600 dark:text-amber-300">
        Happy Ordering!!!
      </p>

      <div className="grid gap-8 sm:grid-cols-5">
        <form onSubmit={handlePay} className="space-y-4 sm:col-span-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Name on card</label>
            <input
              required
              value={cardName}
              onChange={(e) => setCardName(e.target.value)}
              placeholder="Jane Doe"
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-brand-400 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Card number</label>
            <input
              required
              value={cardNumber}
              onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
              placeholder="4242 4242 4242 4242"
              inputMode="numeric"
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-brand-400 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
            <p className="mt-1 text-xs text-slate-400">
              Enter any number. One ending in <span className="font-mono">0002</span> simulates a decline.
            </p>
          </div>
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Expiry</label>
              <input
                required
                value={expiry}
                onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                placeholder="MM/YY"
                inputMode="numeric"
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-brand-400 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
            <div className="flex-1">
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">CVC</label>
              <input
                required
                value={cvc}
                onChange={(e) => setCvc(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="123"
                inputMode="numeric"
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-brand-400 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
          </div>

          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-500/10">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-brand-gradient py-3 font-semibold text-white shadow-glow transition hover:opacity-90 disabled:opacity-60"
          >
            {loading ? 'Processing payment...' : `Pay $${totalPrice.toFixed(2)}`}
          </button>
        </form>

        <div className="sm:col-span-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <h2 className="mb-3 font-semibold text-slate-900 dark:text-white">Order summary</h2>
            <div className="space-y-2">
              {items.map(({ product, quantity }) => (
                <div key={product.id} className="flex justify-between text-sm text-slate-600 dark:text-slate-300">
                  <span className="line-clamp-1">{product.name} × {quantity}</span>
                  <span>${(product.price * quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 flex justify-between border-t border-slate-200 pt-4 font-semibold text-slate-900 dark:border-slate-800 dark:text-white">
              <span>Total</span>
              <span>${totalPrice.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
