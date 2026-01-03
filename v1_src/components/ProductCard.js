import Link from 'next/link';

export default function ProductCard({ product }) {
  const img = (product.images && product.images[0]) || '/placeholder.png';
  return (
    <div style={cardStyle}>
      <Link href={`/products/${product._id}`}>
        <a style={{ textDecoration: 'none', color: 'inherit' }}>
          <img src={img} alt={product.title} style={{ width: '100%', height: 180, objectFit: 'cover', borderRadius: 6 }} />
          <h3 style={{ fontSize: '1rem', margin: '0.5rem 0' }}>{product.title}</h3>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <strong>₹{product.price}</strong>
            {product.codAvailable && <span style={{ background: '#f2f2f2', padding: '0.25rem 0.5rem', borderRadius: 4, fontSize: '0.8rem' }}>COD</span>}
          </div>
        </a>
      </Link>
    </div>
  );
}

const cardStyle = {
  border: '1px solid #eee',
  padding: '0.5rem',
  borderRadius: 8,
  background: '#fff'
};