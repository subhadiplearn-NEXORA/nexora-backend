import Link from 'next/link';
import { useRouter } from 'next/router';
import { useCart } from '../contexts/CartContext';
import { useState } from 'react';

export default function Header() {
  const router = useRouter();
  const { items } = useCart();
  const [q, setQ] = useState('');

  const onSearch = (e) => {
    e.preventDefault();
    if (!q.trim()) return router.push('/');
    router.push(`/search?q=${encodeURIComponent(q.trim())}`);
  };

  const cartCount = items.reduce((s, it) => s + it.quantity, 0);

  return (
    <header style={styles.header}>
      <div style={styles.left}>
        <Link href="/"><a style={styles.logo}>NEXORA</a></Link>
      </div>

      <form onSubmit={onSearch} style={styles.searchForm}>
        <input
          aria-label="Search products"
          placeholder="Search products, categories..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          style={styles.searchInput}
        />
        <button type="submit" style={styles.searchButton}>Search</button>
      </form>

      <div style={styles.actions}>
        <Link href="/cart"><a style={styles.cart}>Cart ({cartCount})</a></Link>
        <Link href="/auth/login"><a style={styles.link}>Login</a></Link>
      </div>
    </header>
  );
}

const styles = {
  header: { display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem 1rem', borderBottom: '1px solid #eee', flexWrap: 'wrap' },
  left: { flex: '0 0 auto' },
  logo: { fontWeight: 700, fontSize: '1.4rem', textDecoration: 'none', color: '#111' },
  searchForm: { flex: '1 1 auto', display: 'flex', gap: '0.5rem' },
  searchInput: { flex: 1, padding: '0.5rem', borderRadius: 4, border: '1px solid #ccc' },
  searchButton: { padding: '0.5rem 0.75rem', borderRadius: 4, border: 'none', background: '#0070f3', color: 'white' },
  actions: { flex: '0 0 auto', display: 'flex', gap: '1rem', alignItems: 'center' },
  cart: { textDecoration: 'none', color: '#111' },
  link: { textDecoration: 'none', color: '#0070f3' }
};