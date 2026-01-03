import Layout from '../components/Layout';
import ProductCard from '../components/ProductCard';
import client from '../utils/api';
import Link from 'next/link';

export default function Home({ featured, latest }) {
  return (
    <Layout title="NEXORA - Home">
      <section>
        <h2>Featured</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 12 }}>
          {featured.map((p) => <ProductCard key={p._id} product={p} />)}
        </div>
      </section>

      <section style={{ marginTop: 24 }}>
        <h2>Latest Products</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 12 }}>
          {latest.map((p) => <ProductCard key={p._id} product={p} />)}
        </div>
      </section>

      <div style={{ marginTop: 24 }}>
        <Link href="/search"><a>Search more products</a></Link>
      </div>
    </Layout>
  );
}

// Dummy server-side fetch (replace URLs with your APIs)
export async function getServerSideProps() {
  try {
    const resFeatured = await client.get('/products/active?limit=8'); // dummy
    const featured = resFeatured.data?.data?.slice(0, 8) || [];

    const resLatest = await client.get('/products/active?limit=12'); // dummy
    const latest = resLatest.data?.data?.slice(0, 12) || [];

    return { props: { featured, latest } };
  } catch (e) {
    return { props: { featured: [], latest: [] } };
  }
}