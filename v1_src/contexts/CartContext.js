import React, { createContext, useContext, useEffect, useState } from 'react';

const CartContext = createContext();

export function CartProvider({ children }) {
  const [items, setItems] = useState([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('nexora_cart_v1');
      if (raw) setItems(JSON.parse(raw));
    } catch (e) {
      setItems([]);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('nexora_cart_v1', JSON.stringify(items));
    } catch (e) {}
  }, [items]);

  const addItem = (product, qty = 1) => {
    setItems((prev) => {
      const found = prev.find((p) => p.productId === product._id);
      if (found) {
        return prev.map((p) =>
          p.productId === product._id ? { ...p, quantity: p.quantity + qty } : p
        );
      }
      return [
        ...prev,
        {
          productId: product._id,
          title: product.title,
          price: product.price,
          image: (product.images && product.images[0]) || null,
          quantity: qty,
          sellerId: product.sellerId || null,
          codAvailable: product.codAvailable || false,
        },
      ];
    });
  };

  const updateQty = (productId, qty) => {
    setItems((prev) => prev.map((p) => (p.productId === productId ? { ...p, quantity: Math.max(1, qty) } : p)));
  };

  const removeItem = (productId) => {
    setItems((prev) => prev.filter((p) => p.productId !== productId));
  };

  const clearCart = () => setItems([]);

  const totalAmount = items.reduce((s, it) => s + it.price * it.quantity, 0);

  return (
    <CartContext.Provider value={{ items, addItem, updateQty, removeItem, clearCart, totalAmount }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  return useContext(CartContext);
}