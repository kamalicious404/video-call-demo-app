import type { AppProps } from 'next/app';
import { useEffect } from 'react';
import '@/styles/globals.css';

function MyApp({ Component, pageProps }: AppProps) {
  useEffect(() => {
    fetch('/api/socket');
  }, []);

  return <Component {...pageProps} />;
}

export default MyApp;