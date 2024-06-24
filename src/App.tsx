import { createClient, OAuthStrategy } from '@wix/sdk';
import { useEffect, useCallback, useState } from 'react';

const FUNCTION_URL = 'https://handdot.wixstudio.io/headlesslogin/_functions';
const CLIENT_ID = 'ff181d4e-8d78-4f8a-808c-f221dca290dc';

const myWixClient = createClient({
  auth: OAuthStrategy({
    clientId: CLIENT_ID,
  }),
});

function hasHash(url: string) {
  return new URL(url).hash !== '';
}

function removeHash() {
  history.pushState("", document.title, window.location.pathname + window.location.search);
}

function useOAuth() {
  const [loggedIn, setLoggedIn] = useState(false);

  const initializeOAuth = useCallback(async () => {
    const memberTokens = localStorage.getItem('memberTokens');
    if (memberTokens) {
      myWixClient.auth.setTokens(JSON.parse(memberTokens));
      setLoggedIn(true);
      removeHash();
      return;
    }

    if (!hasHash(window.location.href)) return;

    try {
      const returnedOAuthData = await myWixClient.auth.parseFromUrl();
      const oAuthData = JSON.parse(localStorage.getItem('oAuthData') || '{}');

      const memberTokens = await myWixClient.auth.getMemberTokens(
        returnedOAuthData.code,
        returnedOAuthData.state,
        oAuthData
      );
      myWixClient.auth.setTokens(memberTokens);
      localStorage.setItem('memberTokens', JSON.stringify(memberTokens));
      setLoggedIn(true);
      alert('logged in');
    } catch (e) {
      console.error('OAuth initialization failed', e);
    } finally {
      removeHash();
      localStorage.removeItem('oAuthData');
    }
  }, []);

  useEffect(() => {
    initializeOAuth();
  }, [initializeOAuth]);

  return { loggedIn, setLoggedIn };
}

function App() {
  const { loggedIn, setLoggedIn } = useOAuth();

  const handleLogin = async () => {
    const siteUrl = window.location.href;
    const oAuthData = await myWixClient.auth.generateOAuthData(siteUrl);
    localStorage.setItem('oAuthData', JSON.stringify(oAuthData));

    const { authUrl } = await myWixClient.auth.getAuthUrl(oAuthData);
    window.location.href = authUrl;
  };

  const handleApiCall = async (endpoint: string, options = {}) => {
    try {
      const response = await fetch(`${FUNCTION_URL}${endpoint}`, options);
      const data = await response.json();
      console.log('data', data);
    } catch (e) {
      console.error('API call failed', e);
    }
  };

  const handleLogout = async () => {
    try {
      await myWixClient.auth.logout(window.location.href);
      localStorage.removeItem('memberTokens');
      localStorage.removeItem('oAuthData');
      setLoggedIn(false);
      alert('logged out');
    } catch (e) {
      console.error('Logout failed', e);
    }
  };

  return (
    <div>
      <p>LoggedIn: {String(loggedIn)}</p>
      <button onClick={handleLogin}>login</button>
      <button onClick={() => handleApiCall('/multiply?leftOperand=2&rightOperand=10')}>call api test1</button>
      <button onClick={async () => handleApiCall('/myId', await myWixClient.auth.getAuthHeaders())}>call api test2</button>
      <button onClick={handleLogout}>logout</button>
    </div>
  );
}

export default App;
