import type { AppProps } from 'next/app';
import Navigation from '@button-inc/bcgov-theme/Navigation';
import BCSans from '../components/BCSans';
import 'bootstrap3/dist/css/bootstrap.min.css';
import Link from 'next/link';
import 'styles/globals.css';

const Menu = () => (
  <ul>
    <li>
      <Link href="/">
        <a>My Requests</a>
      </Link>
    </li>
    <li>
      <Link href="/">
        <a>Pending Approval</a>
      </Link>
    </li>
    <li>
      <Link href=".">
        <a>Login</a>
      </Link>
    </li>
    <li>
      <Link href="/request">
        <a>Make Request</a>
      </Link>
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
