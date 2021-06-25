import type { AppProps } from 'next/app';
import Navigation from '@button-inc/bcgov-theme/Navigation';
import BCSans from '../components/BCSans';
import '../styles/globals.css';

const Menu = () => (
  <ul>
    <li>
      <a href=".">My Requests</a>
    </li>
    <li>
      <a href=".">Pending Approvals</a>
    </li>
    <li>
      <a href=".">Login</a>
    </li>
  </ul>
);

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <>
      <BCSans />
      <Navigation title="Hello British Columbia" onBannerClick={console.log}>
        <Menu />
      </Navigation>
      <Component {...pageProps} />
    </>
  );
}
export default MyApp;
