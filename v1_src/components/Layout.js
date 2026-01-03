import Head from 'next/head';
import Header from './Header';
import Footer from './Footer';

export default function Layout({ children, title = 'NEXORA - Shop' }) {
  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="description" content="NEXORA - Multi-vendor marketplace" />
      </Head>
      <Header />
      <main style={{ minHeight: '70vh', padding: '1rem' }}>{children}</main>
      <Footer />
    </>
  );
}