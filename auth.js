// Grain Google OAuth gate — restricts to @grain.com.sg accounts
(function() {
  const ALLOWED_DOMAIN = 'grain.com.sg';
  const CLIENT_ID = ''; // TODO: Replace with Google OAuth Client ID
  const SESSION_KEY = 'grain_auth';

  // Check existing session
  function getSession() {
    try {
      const data = JSON.parse(localStorage.getItem(SESSION_KEY));
      if (data && data.email && data.exp > Date.now()) return data;
    } catch(e) {}
    return null;
  }

  function setSession(email, name, picture) {
    localStorage.setItem(SESSION_KEY, JSON.stringify({
      email, name, picture,
      exp: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
    }));
  }

  function clearSession() {
    localStorage.removeItem(SESSION_KEY);
    location.reload();
  }

  // If already authed, show content
  const session = getSession();
  if (session) {
    document.documentElement.classList.add('authed');
    window.grainUser = session;
    return;
  }

  // Block content and show login
  const style = document.createElement('style');
  style.textContent = `
    html:not(.authed) body > *:not(.auth-gate) { display: none !important; }
    .auth-gate {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #FFFCF7;
      font-family: 'Funkis A', system-ui, sans-serif;
    }
    .auth-box {
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 24px;
      padding: 48px;
    }
    .auth-logo { width: 48px; height: 48px; }
    .auth-title {
      font-family: 'Funkis A', sans-serif;
      font-weight: 700;
      font-size: 24px;
      color: #1A1A1A;
    }
    .auth-btn {
      display: inline-flex;
      align-items: center;
      gap: 12px;
      padding: 14px 48px;
      background: #FFFFFF;
      border: 1px solid #E0DCD7;
      border-radius: 10px;
      font-family: 'Funkis A', sans-serif;
      font-weight: 500;
      font-size: 16px;
      color: #1A1A1A;
      cursor: pointer;
      transition: border-color 0.2s, box-shadow 0.2s;
      margin-top: 12px;
    }
    .auth-btn:hover {
      border-color: #9A9691;
      box-shadow: 0 2px 8px rgba(0,0,0,0.06);
    }
    .auth-btn svg { width: 20px; height: 20px; }
  `;
  document.head.appendChild(style);

  const gate = document.createElement('div');
  gate.className = 'auth-gate';
  gate.innerHTML = `
    <div class="auth-box">
      <svg class="auth-logo" viewBox="0 0 24 24" fill="#1A1A1A"><path d="M20.5441 0.00360107V7.28361C20.5441 8.78497 20.0076 10.2611 19.0967 11.4493C18.2687 12.5294 17.2102 13.3755 15.9392 13.8795C14.8159 14.38 13.3542 14.9093 13.293 14.9273C13.293 14.8768 13.293 14.8012 13.293 14.7616C13.293 12.3854 13.293 9.99831 13.3074 7.62924C13.347 5.62022 14.1391 3.91363 15.6116 2.53108C16.3605 1.8182 17.2066 1.39335 18.067 1.01891L20.5441 0.00720147V0.00360107Z"/><path d="M4.00745 9.40759C4.5475 9.61642 5.10195 9.78563 5.6096 10.0017C6.29007 10.2897 7.00294 10.5345 7.6366 10.9018C9.37917 11.9171 10.5277 13.4544 11.0353 15.4275C11.2046 16.0827 11.2694 16.7488 11.2658 17.4257C11.2622 19.5463 11.2658 21.6634 11.2658 23.784C11.2658 23.8524 11.2658 23.9208 11.2658 24C10.5817 23.9532 9.94443 23.802 9.33237 23.55C7.09295 22.6319 5.50519 21.0513 4.5727 18.819C4.19466 17.9081 4.01105 16.9612 4.01105 15.9819C4.01105 13.8577 4.01105 11.7046 4.01105 9.58041C4.01105 9.53001 4.01105 9.4832 4.01105 9.40399L4.00745 9.40759Z"/><path d="M11.2658 10.2575C10.9346 10.1387 10.6106 10.0343 10.3226 9.9263C9.47647 9.57346 8.68079 9.27102 7.84911 8.89298C6.14975 7.97128 4.93283 6.55993 4.34597 4.70212C4.10115 3.92803 3.99314 3.06034 4.00034 2.25025C4.00394 1.58418 4.00034 0.918101 4.00034 0.248427C4.00034 0.187221 4.00034 0.0864096 4.00034 0C4.27756 0.108012 4.56559 0.212423 4.81762 0.316835C5.6601 0.662473 6.54219 0.972107 7.35227 1.38255C8.93282 2.17824 10.0453 3.44558 10.7222 5.08376C11.111 6.02347 11.2839 7.00998 11.2658 8.02889V10.2575Z"/><path d="M20.544 14.0882C20.5332 14.9559 20.5944 16.4357 20.4 17.5626C20.0579 19.118 19.2299 20.5365 18.1174 21.6706C16.9904 22.8192 15.6007 23.5536 14.0238 23.9065C13.7609 23.9641 13.5881 23.9929 13.2965 23.9929C13.2965 23.568 13.2965 23.1792 13.2965 22.7904C13.2965 22.0163 13.2677 21.199 13.4261 20.4321C13.8257 18.4951 14.8626 16.9937 16.4648 15.8596C17.2641 15.3591 17.8401 15.1467 18.5782 14.8479C19.1759 14.6031 19.9319 14.2826 20.5476 14.0918"/></svg>
      <div class="auth-title">Web Statistics</div>
      <button class="auth-btn" id="authBtn">
        <svg viewBox="0 0 18 18"><path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/><path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/><path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.997 8.997 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/><path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/></svg>
        Sign in with Google
      </button>
    </div>
  `;
  document.body.prepend(gate);

  // Google Sign-In handler
  window.handleGoogleAuth = function(response) {
    const payload = JSON.parse(atob(response.credential.split('.')[1]));
    const email = payload.email;
    const domain = email.split('@')[1];

    if (domain !== ALLOWED_DOMAIN) {
      alert('Access restricted to @grain.com.sg accounts.');
      return;
    }

    setSession(email, payload.name, payload.picture);
    document.documentElement.classList.add('authed');
    gate.remove();
    window.grainUser = { email, name: payload.name, picture: payload.picture };
  };

  // Load Google Identity Services
  const gsiScript = document.createElement('script');
  gsiScript.src = 'https://accounts.google.com/gsi/client';
  gsiScript.onload = function() {
    if (!CLIENT_ID) {
      // No client ID configured — skip auth for development
      console.warn('Grain Auth: No CLIENT_ID set. Skipping auth.');
      document.documentElement.classList.add('authed');
      gate.remove();
      return;
    }
    google.accounts.id.initialize({
      client_id: CLIENT_ID,
      callback: handleGoogleAuth,
      auto_select: true,
    });
    document.getElementById('authBtn').addEventListener('click', () => {
      google.accounts.id.prompt();
    });
  };
  document.head.appendChild(gsiScript);

  // Expose logout
  window.grainLogout = clearSession;
})();
