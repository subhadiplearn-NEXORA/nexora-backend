import Layout from '../../components/Layout';
import client from '../../utils/api';
import { useRouter } from 'next/router';
import { useCart } from '../../contexts/CartContext';
import { useState } from 'react';

export default function ProductDetail({ product }) {
  const { addItem } = useCart();
  const [qty, setQty] = useState(1);
  const router = useRouter();

  if (router.isFallback) return <Layout>Loading...</Layout>;
  if (!product) return <Layout><p>Product not found</p></Layout>;

  const onAdd = () => {
    addItem(product, Number(qty));
    router.push('/cart');
  };

  return (
    <Layout title={product.title}>
      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 320px' }}>
          <img src={(product.images && product.images[0]) || '/placeholder.png'} alt={product.title} style={{ width: '100%', borderRadius: 8 }} />
        </div>
        <div style={{ flex: '1 1 320px' }}>
          <h1>{product.title}</h1>
          <p style={{ fontSize: '1.25rem', fontWeight: 700 }}>₹{product.price}</p>
          {product.codAvailable && <div style={{ margin: '8px 0', padding: '4px 8px', background: '#f2f2f2', display: 'inline-block' }}>Cash on Delivery Available</div>}
          <p style={{ marginTop: 12 }}>{product.description}</p>

          <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            <label>Qty</label>
            <input type="number" value={qty} min={1} max={product.stock || 99} onChange={(e) => setQty(e.target.value)} style={{ width: 70 }} />
            <button onClick={onAdd} style={{ padding: '8px 12px', background: '#0070f3', color: 'white', border: 'none', borderRadius: 6 }}>Add to cart</button>
            <button onClick={() => { addItem(product, Number(qty)); router.push('/checkout'); }} style={{ padding: '8px 12px', border: '1px solid #0070f3', background: 'white', color: '#0070f3', borderRadius: 6 }}>Buy now</button>
          </div>
        </div>
      </div>
    </Layout>
  );
}

export async function getServerSideProps(context) {
  const { id } = context.params;
  try {
    const res = await client.get(`/products/${id}`);
    return { props: { product: res.data.data || null } };
  } catch (e) {
    return { props: { product: null } };
  }
}