import constants from '../config/constantsClient';

export default function Footer() {
  return (
    <footer style={{ borderTop: '1px solid #eee', padding: '1rem', marginTop: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <strong>NEXORA</strong><br />
          <small>Marketplace by {constants.BRAND.PARENT}</small><br />
          <small>Contact: {constants.EMAILS.SUPPORT}</small>
        </div>
        <div>
          <a href={constants.SOCIAL.INSTAGRAM} target="_blank" rel="noopener noreferrer">Instagram</a> ·{' '}
          <a href={constants.SOCIAL.FACEBOOK} target="_blank" rel="noopener noreferrer">Facebook</a> ·{' '}
          <a href={constants.SOCIAL.PINTEREST} target="_blank" rel="noopener noreferrer">Pinterest</a>
        </div>
      </div>
    </footer>
  );
}