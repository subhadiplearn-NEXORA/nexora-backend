import Layout from '../components/Layout';
import { useCart } from '../contexts/CartContext';
import Link from 'next/link';

export default function CartPage() {
  const { items, updateQty, removeItem, clearCart, totalAmount } = useCart();

  if (!items || items.length === 0) {
    return (
      <Layout title="Your Cart">
        <p>Your cart is empty. <Link href="/"><a>Continue shopping</a></Link></p>
      </Layout>
    );
  }

  return (
    <Layout title="Cart - NEXORA">
      <h2>Your Cart</h2>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 24 }}>
        <div>
          {items.map((it) => (
            <div key={it.productId} style={{ display: 'flex', gap: 12, alignItems: 'center', borderBottom: '1px solid #eee', padding: 8 }}>
              <img src={it.image || '/placeholder.png'} alt={it.title} style={{ width: 90, height: 90, objectFit: 'cover' }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600 }}>{it.title}</div>
                <div>₹{it.price} • {it.codAvailable ? 'COD' : 'Prepaid'}</div>
                <div style={{ marginTop: 8 }}>
                  <input type="number" value={it.quantity} min={1} onChange={(e) => updateQty(it.productId, Number(e.target.value))} style={{ width: 70 }} />
                  <button onClick={() => removeItem(it.productId)} style={{ marginLeft: 8 }}>Remove</button>
                </div>
              </div>
              <div>₹{(it.price * it.quantity).toFixed(2)}</div>
            </div>
          ))}
          <div style={{ marginTop: 12 }}>
            <button onClick={() => clearCart()} style={{ background: '#e00', color: 'white', padding: '8px 12px', borderRadius: 6 }}>Clear cart</button>
          </div>
        </div>

        <aside style={{ border: '1px solid #eee', padding: 12, borderRadius: 8 }}>
          <h3>Price summary</h3>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Items</span><strong>₹{totalAmount.toFixed(2)}</strong>
          </div>
          <div style={{ marginTop: 12 }}>
            <Link href="/checkout"><a style={{ display: 'block', background: '#0070f3', color: 'white', padding: '10px', textAlign: 'center', borderRadius: 6 }}>Proceed to Checkout</a></Link>
          </div>
        </aside>
      </div>
    </Layout>
  );
}