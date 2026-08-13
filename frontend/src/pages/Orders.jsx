import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';

export default function Orders() {
  const { token } = useAuth();
  const [orders, setOrders] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getOrders(token).then(setOrders).catch((err) => setError(err.message));
  }, [token]);

  if (error) {
    return <p className="mx-auto max-w-2xl px-4 py-16 text-center text-red-500">{error}</p>;
  }

  if (!orders) {
    return <p className="mx-auto max-w-2xl px-4 py-16 text-center text-slate-400">Loading orders...</p>;
  }

  if (orders.length === 0) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <p className="text-5xl">📦</p>
        <h1 className="mt-4 font-display text-2xl font-bold text-slate-900 dark:text-white">No orders yet</h1>
        <p className="mt-2 text-slate-500 dark:text-slate-400">Once you check out, your orders will show up here.</p>
        <Link to="/" className="mt-6 inline-block rounded-full bg-brand-gradient px-6 py-3 font-semibold text-white shadow-glow">
          Browse products
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="mb-6 font-display text-2xl font-bold text-slate-900 dark:text-white">Your orders</h1>
      <div className="space-y-4">
        {orders.map((order) => (
          <div key={order.id} className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-semibold text-slate-900 dark:text-white">Order #{order.id}</p>
                <p className="text-xs text-slate-400">{new Date(order.created_at).toLocaleString()}</p>
              </div>
              <span className="rounded-full bg-teal-400/20 px-3 py-1 text-xs font-semibold text-teal-600 dark:text-teal-300">
                {order.status}
              </span>
            </div>
            <div className="mt-3 space-y-1">
              {order.items.map((item) => (
                <div key={item.id} className="flex justify-between text-sm text-slate-600 dark:text-slate-300">
                  <span>{item.name} × {item.quantity}</span>
                  <span>${(item.price * item.quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 flex justify-between border-t border-slate-200 pt-3 font-semibold text-slate-900 dark:border-slate-800 dark:text-white">
              <span>Total (card ···{order.card_last4})</span>
              <span>${order.total.toFixed(2)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
