import type { AppProps } from 'next/app';
import Navigation from '@button-inc/bcgov-theme/Navigation';
import BCSans from '../components/BCSans';
import 'bootstrap3/dist/css/bootstrap.min.css';
import Link from 'next/link';
import 'styles/globals.css';
import { useState } from 'react';

const Menu = () => (
  <ul>
    <li>
      <Link href="/my-requests">
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
  const [currentUser, setCurrentUser] = useState(null);
  return (
    <>
      <BCSans />
      <Navigation title="Hello British Columbia" onBannerClick={console.log}>
        <Menu />
      </Navigation>
      <Component {...pageProps} currentUser={currentUser} setCurrentUser={setCurrentUser}>
        <button onClick={() => console.log(currentUser)}>Click</button>
      </Component>
    </>
  );
}
export default MyApp;
