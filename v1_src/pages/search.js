import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import ProductCard from '../components/ProductCard';
import client from '../utils/api';
import { useEffect, useState } from 'react';

export default function SearchPage() {
  const router = useRouter();
  const { q = '', category = '', cod = '', sort = '', page = 1 } = router.query;
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const params = { q, category, cod, sort, page, limit: 20 };
      const res = await client.get('/products/active', { params });
      setProducts(res.data.data || []);
    } catch (e) {
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [q, category, cod, sort, page]);

  return (
    <Layout title="Search - NEXORA">
      <h2>Search Results</h2>
      <div style={{ display: 'flex', gap: 12 }}>
        <aside style={{ width: 240 }}>
          <div>
            <h4>Filters</h4>
            <div>
              <label>
                <input type="checkbox" checked={cod === 'true'} onChange={(e) => router.push({ query: { ...router.query, cod: e.target.checked ? 'true' : '' } })} />
                {' '}COD available
              </label>
            </div>
            <div style={{ marginTop: 12 }}>
              <label>Sort</label>
              <select value={sort} onChange={(e) => router.push({ query: { ...router.query, sort: e.target.value } })}>
                <option value="">Relevance</option>
                <option value="price_asc">Price: Low → High</option>
                <option value="price_desc">Price: High → Low</option>
              </select>
            </div>
          </div>
        </aside>

        <div style={{ flex: 1 }}>
          {loading ? <p>Loading...</p> : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 12 }}>
              {products.map((p) => <ProductCard key={p._id} product={p} />)}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}