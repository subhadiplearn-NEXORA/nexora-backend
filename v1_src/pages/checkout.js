import Layout from '../components/Layout';
import { useCart } from '../contexts/CartContext';
import { useState } from 'react';
import client from '../utils/api';
import Router from 'next/router';

export default function Checkout() {
  const { items, totalAmount, clearCart } = useCart();
  const [shipping, setShipping] = useState({ name: '', phone: '', street: '', city: '', state: '', zipCode: '', country: 'India' });
  const [paymentMethod, setPaymentMethod] = useState('online');
  const [loading, setLoading] = useState(false);

  const placeOrder = async () => {
    setLoading(true);
    try {
      // Build items formatted for backend
      const orderItems = items.map(i => ({ productId: i.productId, quantity: i.quantity }));
      // Call backend to create order. Dummy endpoint — replace NEXT_PUBLIC_API_URL with real API.
      const res = await client.post('/orders', {
        items: orderItems,
        paymentMethod,
        shippingAddress: shipping,
      });

      const order = res.data.data;
      // For online payment, frontend should call payment creation flow; here we just redirect to order confirmation placeholder.
      clearCart();
      Router.push(`/order-confirmation?orderId=${order._id}`);
    } catch (e) {
      alert(e?.response?.data?.message || 'Failed to place order');
    } finally {
      setLoading(false);
    }
  };

  if (!items || items.length === 0) {
    return <Layout><p>Your cart is empty</p></Layout>;
  }

  return (
    <Layout title="Checkout - NEXORA">
      <h2>Checkout</h2>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 24 }}>
        <div>
          <h4>Shipping address</h4>
          <div>
            <input placeholder="Full name" value={shipping.name} onChange={(e) => setShipping({ ...shipping, name: e.target.value })} /><br />
            <input placeholder="Phone" value={shipping.phone} onChange={(e) => setShipping({ ...shipping, phone: e.target.value })} /><br />
            <input placeholder="Street" value={shipping.street} onChange={(e) => setShipping({ ...shipping, street: e.target.value })} /><br />
            <input placeholder="City" value={shipping.city} onChange={(e) => setShipping({ ...shipping, city: e.target.value })} /><br />
            <input placeholder="State" value={shipping.state} onChange={(e) => setShipping({ ...shipping, state: e.target.value })} /><br />
            <input placeholder="ZIP" value={shipping.zipCode} onChange={(e) => setShipping({ ...shipping, zipCode: e.target.value })} /><br />
          </div>

          <h4 style={{ marginTop: 16 }}>Payment Method</h4>
          <div>
            <label>
              <input type="radio" name="pm" value="online" checked={paymentMethod === 'online'} onChange={() => setPaymentMethod('online')} />
              {' '}Online Payment
            </label><br />
            <label>
              <input type="radio" name="pm" value="cod" checked={paymentMethod === 'cod'} onChange={() => setPaymentMethod('cod')} />
              {' '}Cash on Delivery (if available)
            </label>
          </div>

          <div style={{ marginTop: 12 }}>
            <button onClick={placeOrder} disabled={loading} style={{ padding: '10px 14px', background: '#0070f3', color: 'white', borderRadius: 6 }}>
              {loading ? 'Placing order...' : 'Place Order'}
            </button>
          </div>
        </div>

        <aside style={{ border: '1px solid #eee', padding: 12, borderRadius: 8 }}>
          <h3>Summary</h3>
          <div>Items: {items.length}</div>
          <div>Total: ₹{totalAmount.toFixed(2)}</div>
        </aside>
      </div>
    </Layout>
  );
}