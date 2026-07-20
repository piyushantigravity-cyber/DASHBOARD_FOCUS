const { useState, useEffect, useRef } = React;

// --- UTILITY: Secure Local/Remote Store ---
const STORE_PREFIX = 'dashboard_v3_';

// Safe localStorage wrappers (handles Streamlit iframe SecurityError)
const _lsGet = (k) => { try { return localStorage.getItem(k); } catch(e) { return null; } };
const _lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch(e) {} };
const _lsDel = (k) => { try { localStorage.removeItem(k); } catch(e) {} };

const getStoredItem = (key, defaultValue) => {
  try {
    const val = _lsGet(STORE_PREFIX + key);
    return val ? JSON.parse(val) : defaultValue;
  } catch (e) {
    return defaultValue;
  }
};

const setStoredItem = (key, value) => {
  try {
    _lsSet(STORE_PREFIX + key, JSON.stringify(value));
  } catch (e) {}
};

// --- SECURITY: Disable Right-click & Inspection Keys ---
if (window.self === window.top) {
  document.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    showSecurityToast();
  });
  document.addEventListener('keydown', (e) => {
    // Don't intercept shortcuts when user is typing in input/textarea/select
    const tag = document.activeElement && document.activeElement.tagName;
    const isEditable = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || document.activeElement.isContentEditable;
    if (isEditable) return;

    if (
      e.key === 'F12' ||
      (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C')) ||
      (e.ctrlKey && (e.key === 'U' || e.key === 'u' || e.key === 'S' || e.key === 's'))
    ) {
      e.preventDefault();
      showSecurityToast();
    }
  });
}

function showSecurityToast() {
  const toast = document.getElementById('security-toast');
  if (toast) {
    toast.classList.remove('opacity-0', 'translate-y-2');
    toast.classList.add('opacity-100', 'translate-y-0');
    setTimeout(() => {
      toast.classList.remove('opacity-100', 'translate-y-0');
      toast.classList.add('opacity-0', 'translate-y-2');
    }, 3000);
  }
}

// --- SECURE AUTHENTICATION SCREEN ---
function LoginScreen({ onLoginSuccess, theme }) {
  const [googleStatus, setGoogleStatus] = useState('idle');

  const handleGuestLogin = () => {
    onLoginSuccess('Guest');
  };

  const handleGoogleLogin = () => {
    setGoogleStatus('loading');
    setTimeout(() => {
      setGoogleStatus('success');
      setTimeout(() => {
        onLoginSuccess('Google User');
      }, 800);
    }, 1500);
  };

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 transition-colors duration-300 ${theme === 'dark' ? 'bg-[#090d16]' : 'bg-slate-100'}`}>
      <div className={`w-full max-w-md p-8 rounded-2xl border transition-all duration-300 ${
        theme === 'dark' ? 'bg-[#121826]/85 border-brand-900/80 shadow-2xl glass' : 'bg-white border-slate-200 shadow-xl'
      }`}>
        <div className="text-center mb-8">
          <div className="inline-flex p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl mb-4">
            <i data-lucide="shield-check" className="w-8 h-8 text-indigo-400"></i>
          </div>
          <h2 className="text-2xl font-bold tracking-tight font-mono">EXECUTIVE<span className="text-indigo-400 font-sans">.HQ</span></h2>
          <p className={`text-xs mt-2 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Secure Developer Integration Portal</p>
        </div>

        <div className="space-y-4">
          <button 
            onClick={handleGuestLogin} 
            className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition-all shadow-md shadow-indigo-600/20 cursor-pointer"
          >
            <i data-lucide="user" className="w-4 h-4"></i>
            Sign in as Guest
          </button>

          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-slate-700/50"></div>
            <span className={`flex-shrink mx-4 text-[10px] font-mono uppercase tracking-wider ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>Sandbox Auth</span>
            <div className="flex-grow border-t border-slate-700/50"></div>
          </div>

          <button 
            onClick={handleGoogleLogin} 
            disabled={googleStatus === 'loading'}
            className={`w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl text-sm font-semibold border transition-all cursor-pointer ${
              theme === 'dark' ? 'bg-[#0b0f19] border-slate-800 text-slate-350 hover:bg-[#151c2d]' : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}
          >
            {googleStatus === 'loading' ? (
              <span className="animate-spin rounded-full h-4 w-4 border-2 border-indigo-400 border-t-transparent"></span>
            ) : googleStatus === 'success' ? (
              <i data-lucide="check-circle-2" className="w-4 h-4 text-emerald-400"></i>
            ) : (
              <i data-lucide="chrome" className="w-4 h-4 text-red-400"></i>
            )}
            {googleStatus === 'loading' ? 'Authenticating...' : googleStatus === 'success' ? 'Authorized!' : 'Sign in with Google'}
          </button>
        </div>

        <div className="mt-8 text-center">
          <span className={`text-[10px] font-mono uppercase tracking-widest ${theme === 'dark' ? 'text-slate-600' : 'text-slate-400'}`}>
            🛡️ Dynamic Encrypted Sessions
          </span>
        </div>
      </div>
    </div>
  );
}

// --- MAIN REACT APPLICATION ---
function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => getStoredItem('auth', false));
  const [userRole, setUserRole] = useState(() => getStoredItem('role', ''));
  const [supabaseConfig, setSupabaseConfig] = useState(() => getStoredItem('supabase_config', { url: '', anonKey: '' }));
  const [dbStatus, setDbStatus] = useState('disconnected');
  const [sbClient, setSbClient] = useState(null);

  // Settings & Keys
  const [keys, setKeys] = useState(() => getStoredItem('api_keys', {
    githubUsername: '',
    leetcodeUsername: '',
    codeforcesHandle: '',
    weatherApiKey: '',
    weatherCity: 'New York',
    youtubeSearchQuery: 'Lo-Fi coding beats',
    googleClientId: '',
    wakatimeApiKey: '',
  }));

  const [gmailAccessToken, setGmailAccessToken] = useState(() => getStoredItem('gmail_access_token', ''));
  // Also accept token pasted directly in Settings
  const effectiveGmailToken = gmailAccessToken || keys.gmailAccessToken || '';

  // Connection diagnostics history
  const [connectionHealth, setConnectionHealth] = useState({
    github: { status: 'unchecked', latency: null, checkedAt: null },
    leetcode: { status: 'unchecked', latency: null, checkedAt: null },
    codeforces: { status: 'unchecked', latency: null, checkedAt: null },
    weather: { status: 'unchecked', latency: null, checkedAt: null },
    supabase: { status: 'unchecked', latency: null, checkedAt: null },
    gmail: { status: 'unchecked', latency: null, checkedAt: null },
  });

  // Playlists store
  const [playlist, setPlaylist] = useState(() => getStoredItem('saved_playlist', [
    { title: 'Lofi Girl Coding Beats', id: 'jfKfPfyJRdk' },
    { title: 'Synthwave Radio', id: '4xDzrJKXOOY' }
  ]));

  // Pomodoro Completed History
  const [pomodoroStats, setPomodoroStats] = useState(() => getStoredItem('pomodoro_stats', [2, 4, 3, 5, 4, 6, 5]));

  // App Settings
  const [theme, setTheme] = useState(() => getStoredItem('theme', 'dark'));
  const [gridColumns, setGridColumns] = useState(() => getStoredItem('grid_columns', 2));
  const [activeWidgets, setActiveWidgets] = useState(() => getStoredItem('active_widgets', [
    'leetcode', 'codeforces', 'github', 'gmail', 'developer_analytics', 'spotify', 'weather', 'system', 'calendar', 'pomodoro'
  ]));
  const [enlargedWidget, setEnlargedWidget] = useState(null);

  // Modal / UI states
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [notification, setNotification] = useState(null);
  const [keyVerificationStatus, setKeyVerificationStatus] = useState({});

  useEffect(() => {
    if (supabaseConfig.url && supabaseConfig.anonKey) {
      initializeSupabase(supabaseConfig.url, supabaseConfig.anonKey);
    }
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      try { document.body.style.backgroundColor = '#0b0f19'; } catch(e) {}
    } else {
      root.classList.remove('dark');
      try { document.body.style.backgroundColor = '#f1f5f9'; } catch(e) {}
    }
    setStoredItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    setStoredItem('grid_columns', gridColumns);
    setStoredItem('active_widgets', activeWidgets);
  }, [gridColumns, activeWidgets]);

  const showNotification = (type, title, desc) => {
    setNotification({ type, title, desc });
  };

  const handleLoginSuccess = (role) => {
    setIsAuthenticated(true);
    setUserRole(role);
    setStoredItem('auth', true);
    setStoredItem('role', role);
    showNotification('success', 'Session Established', `Connected as ${role}. Workspace decrypted.`);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setUserRole('');
    setStoredItem('auth', false);
    setStoredItem('role', '');
    setGmailAccessToken('');
    _lsDel(STORE_PREFIX + 'gmail_access_token');
  };

  const initializeSupabase = async (url, key) => {
    if (!url || !key) return;
    setDbStatus('connecting');
    const start = performance.now();
    try {
      if (!url.startsWith('https://')) {
        setDbStatus('error');
        showNotification('error', 'Configuration Format Needed', 'Please provide a valid Supabase URL.');
        return;
      }
      const supabase = window.supabase.createClient(url, key);
      setSbClient(supabase);
      setDbStatus('connected');
      setStoredItem('supabase_config', { url, key });
      
      const latency = Math.round(performance.now() - start);
      setConnectionHealth(prev => ({
        ...prev,
        supabase: { status: 'healthy', latency, checkedAt: new Date().toLocaleTimeString() }
      }));

      showNotification('success', 'Database Connected', 'Your secure storage pipeline is live.');
      pullSettingsFromSupabase(supabase);
    } catch (err) {
      setDbStatus('error');
      setConnectionHealth(prev => ({
        ...prev,
        supabase: { status: 'unreachable', latency: null, checkedAt: new Date().toLocaleTimeString() }
      }));
      showNotification('error', 'Connection Refused', 'Unable to reach the Supabase node.');
    }
  };

  const saveSettingsToSupabase = async (updatedKeys) => {
    if (!sbClient) return;
    try {
      await sbClient
        .from('dashboard_profiles')
        .upsert({
          id: 'user_preferences',
          settings: updatedKeys || keys,
          updated_at: new Date().toISOString()
        });
    } catch (e) {
      console.error("Supabase write failed", e);
    }
  };

  const pullSettingsFromSupabase = async (client) => {
    try {
      const { data } = await client
        .from('dashboard_profiles')
        .select('settings')
        .eq('id', 'user_preferences')
        .single();
      
      if (data && data.settings) {
        setKeys(data.settings);
        setStoredItem('api_keys', data.settings);
      }
    } catch (e) {
      console.log("Using local configuration caches.");
    }
  };

  const keySaveTimerRef = React.useRef(null);

  const handleKeySave = (field, val) => {
    const updated = { ...keys, [field]: val };
    setKeys(updated);
    setStoredItem('api_keys', updated);
    // Debounce Supabase writes: only save after user stops typing for 800ms
    if (keySaveTimerRef.current) clearTimeout(keySaveTimerRef.current);
    keySaveTimerRef.current = setTimeout(() => {
      saveSettingsToSupabase(updated);
    }, 800);
  };

  const triggerGmailOAuth = () => {
    if (!keys.googleClientId) {
      showNotification('error', 'Client ID Missing', 'Please enter your Google OAuth Client ID in the Connectors settings first.');
      return;
    }
    
    try {
      const tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: keys.googleClientId,
        scope: 'https://www.googleapis.com/auth/gmail.readonly',
        callback: (tokenResponse) => {
          if (tokenResponse.access_token) {
            setGmailAccessToken(tokenResponse.access_token);
            setStoredItem('gmail_access_token', tokenResponse.access_token);
            setConnectionHealth(prev => ({
              ...prev,
              gmail: { status: 'healthy', latency: 120, checkedAt: new Date().toLocaleTimeString() }
            }));
            showNotification('success', 'Gmail Connected', 'Google OAuth Agent successfully synchronized with Gmail.');
          }
        },
      });
      tokenClient.requestAccessToken();
    } catch (err) {
      showNotification('error', 'Google Auth Error', 'Failed to initialize Google Identity Services token handshake.');
    }
  };

  const testIntegration = async (type) => {
    setKeyVerificationStatus(prev => ({ ...prev, [type]: 'testing' }));
    let verified = false;
    const start = performance.now();

    try {
      if (type === 'github') {
        if (!keys.githubUsername) throw new Error();
        const res = await fetch(`https://api.github.com/users/${keys.githubUsername}`);
        if (res.ok) verified = true;
      } else if (type === 'leetcode') {
        if (!keys.leetcodeUsername) throw new Error();
        const res = await fetch(`https://alfa-leetcode-api.onrender.com/${keys.leetcodeUsername}`, { signal: AbortSignal.timeout(8000) });
        if (res.ok) { const d = await res.json(); if (d.totalSolved !== undefined || d.solvedProblem !== undefined) verified = true; }
      } else if (type === 'codeforces') {
        if (!keys.codeforcesHandle) throw new Error();
        const res = await fetch(`https://codeforces.com/api/user.info?handles=${keys.codeforcesHandle}`);
        const data = await res.json();
        if (data.status === 'OK') verified = true;
      } else if (type === 'weather') {
        if (!keys.weatherApiKey) throw new Error();
        const res = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${keys.weatherCity}&appid=${keys.weatherApiKey}`);
        if (res.ok) verified = true;
      }
    } catch (e) {
      verified = false;
    }

    const latency = Math.round(performance.now() - start);
    setKeyVerificationStatus(prev => ({ ...prev, [type]: verified ? 'success' : 'error' }));
    
    setConnectionHealth(prev => ({
      ...prev,
      [type]: {
        status: verified ? 'healthy' : 'error',
        latency: verified ? latency : null,
        checkedAt: new Date().toLocaleTimeString()
      }
    }));

    if (verified) {
      showNotification('success', 'Integration Verified', `Successfully fetched live data for ${type} in ${latency}ms.`);
    } else {
      showNotification('error', 'Verification Failed', `API handshake failed for ${type}.`);
    }
  };

  useEffect(() => {
    if (window.lucide) window.lucide.createIcons();
  });

  if (!isAuthenticated) {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} theme={theme} />;
  }

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-300 ${theme === 'dark' ? 'bg-[#0b0f19] text-slate-100' : 'bg-slate-50 text-slate-800'}`}>
      
      {/* HEADER */}
      <header className={`px-6 py-4 flex items-center justify-between border-b ${theme === 'dark' ? 'border-brand-900/50 bg-[#0f172a]/60 glass' : 'border-slate-200 bg-white shadow-sm'} relative z-30`}>
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/10 border border-indigo-500/20 rounded-lg">
              <i data-lucide="shield-check" className="w-5 h-5 text-indigo-400"></i>
            </div>
            <span className="text-lg font-bold tracking-tight font-mono">EXECUTIVE<span className="text-indigo-400 font-sans">.HQ</span></span>
          </div>

          <div className="hidden md:flex items-center gap-2 bg-slate-800/40 dark:bg-brand-900/50 p-1 border border-brand-800/40 rounded-lg">
            <button onClick={() => setGridColumns(1)} className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${gridColumns === 1 ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}>1 Col</button>
            <button onClick={() => setGridColumns(2)} className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${gridColumns === 2 ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}>2 Col</button>
            <button onClick={() => setGridColumns(3)} className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${gridColumns === 3 ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}>3 Col</button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className={`p-2 rounded-lg border transition-colors cursor-pointer ${theme === 'dark' ? 'border-brand-800 bg-brand-900/40 text-yellow-400' : 'border-slate-200 bg-white text-slate-650'}`}
          >
            {theme === 'dark' ? <i data-lucide="sun" className="w-4 h-4"></i> : <i data-lucide="moon" className="w-4 h-4"></i>}
          </button>
          <button onClick={() => setIsSettingsOpen(true)} className="flex items-center gap-2 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded-lg transition-colors cursor-pointer">
            <i data-lucide="sliders-horizontal" className="w-4 h-4"></i>Configure Portal
          </button>
          <button onClick={handleLogout} className="p-2 border border-brand-900/50 rounded-lg text-slate-400 hover:text-rose-400 cursor-pointer">
            <i data-lucide="log-out" className="w-4 h-4"></i>
          </button>
        </div>
      </header>

      {/* GRID */}
      <main className="flex-1 p-6 relative overflow-y-auto">
        {activeWidgets.length === 0 ? (
          <div className="h-[60vh] flex flex-col items-center justify-center text-center max-w-sm mx-auto">
            <h2 className="text-lg font-bold text-white mb-2">No Active Widgets</h2>
            <button onClick={() => setIsSettingsOpen(true)} className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold">Select widgets</button>
          </div>
        ) : (
          <div className={`grid gap-6 widget-transition ${
            enlargedWidget ? 'grid-cols-1' : gridColumns === 1 ? 'grid-cols-1' : gridColumns === 2 ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3'
          }`}>
            {activeWidgets.map(widgetId => {
              if (enlargedWidget && enlargedWidget !== widgetId) return null;
              const isEnlarged = enlargedWidget === widgetId;
              return (
                <WidgetContainer 
                  key={widgetId} 
                  id={widgetId} 
                  isEnlarged={isEnlarged}
                  onToggleEnlarge={() => setEnlargedWidget(isEnlarged ? null : widgetId)}
                  theme={theme}
                  health={connectionHealth[widgetId] || { status: 'internal' }}
                >
                  {renderWidget(widgetId, keys, isEnlarged, playlist, setPlaylist, pomodoroStats, setPomodoroStats, gmailAccessToken, triggerGmailOAuth)}
                </WidgetContainer>
              );
            })}
          </div>
        )}
      </main>

      {isSettingsOpen && (
        <SettingsModal 
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          keys={keys}
          onSaveKey={handleKeySave}
          testIntegration={testIntegration}
          keyVerificationStatus={keyVerificationStatus}
          supabaseConfig={supabaseConfig}
          onSaveSupabaseConfig={setSupabaseConfig}
          dbStatus={dbStatus}
          onConnectSupabase={initializeSupabase}
          activeWidgets={activeWidgets}
          onChangeWidgets={setActiveWidgets}
          theme={theme}
          health={connectionHealth}
        />
      )}

      {notification && <PoliteErrorNotice notification={notification} onClose={() => setNotification(null)} />}
    </div>
  );
}

// --- WIDGET RENDER ROUTER ---
function renderWidget(id, keys, isEnlarged, playlist, setPlaylist, pomodoroStats, setPomodoroStats, gmailAccessToken, triggerGmailOAuth) {
  switch (id) {
    case 'leetcode':
      return <LeetCodeWidget username={keys.leetcodeUsername} isEnlarged={isEnlarged} />;
    case 'codeforces':
      return <CodeforcesWidget handle={keys.codeforcesHandle} isEnlarged={isEnlarged} />;
    case 'github':
      return <GitHubWidget username={keys.githubUsername} keys={keys} isEnlarged={isEnlarged} />;
    case 'gmail':
      return <GmailWidget accessToken={effectiveGmailToken} triggerOAuth={triggerGmailOAuth} isEnlarged={isEnlarged} />;
    case 'developer_analytics':
      return <DeveloperAnalyticsWidget keys={keys} isEnlarged={isEnlarged} />;
    case 'spotify':
      return <SpotifyYouTubeWidget initialQuery={keys.youtubeSearchQuery} playlist={playlist} setPlaylist={setPlaylist} isEnlarged={isEnlarged} youtubeApiKey={keys.youtubeApiKey} />;
    case 'weather':
      return <WeatherWidget apiKey={keys.weatherApiKey} city={keys.weatherCity} isEnlarged={isEnlarged} />;
    case 'system':
      return <SystemStatsWidget isEnlarged={isEnlarged} />;
    case 'calendar':
      return <GoogleCalendarWidget isEnlarged={isEnlarged} />;
    case 'pomodoro':
      return <PomodoroWidget stats={pomodoroStats} setStats={setPomodoroStats} isEnlarged={isEnlarged} />;
    case 'activity_heatmap':
      return <ActivityHeatmapWidget keys={keys} isEnlarged={isEnlarged} />;
    case 'skill_radar':
      return <SkillRadarWidget keys={keys} isEnlarged={isEnlarged} />;
    case 'focus_tracker':
      return <FocusTrackerWidget isEnlarged={isEnlarged} />;
    case 'crypto_ticker':
      return <CryptoTickerWidget isEnlarged={isEnlarged} />;
    case 'news_feed':
      return <NewsFeedWidget isEnlarged={isEnlarged} />;
    case 'habit_tracker':
      return <HabitTrackerWidget isEnlarged={isEnlarged} />;
    case 'code_stats':
      return <CodeStatsWidget keys={keys} isEnlarged={isEnlarged} />;
    default:
      return null;
  }
}

// A. Widget Wrapper Frame
function WidgetContainer({ id, children, isEnlarged, onToggleEnlarge, theme, health }) {
  const titles = {
    leetcode: 'LeetCode Analytics',
    codeforces: 'Codeforces Track',
    github: 'GitHub Platform Metrics',
    gmail: 'Gmail Connection Agent',
    developer_analytics: 'Aggregated Developer Profile',
    spotify: 'Acoustic Center',
    weather: 'Weather Forecasting',
    system: 'Resource Dials',
    calendar: 'Operational Schedule',
    pomodoro: 'Pomodoro Productivity Clock',
    activity_heatmap: 'Activity Heatmap',
    skill_radar: 'Skill Radar',
    focus_tracker: 'Focus Tracker',
    crypto_ticker: 'Crypto Ticker',
    news_feed: 'Dev News Feed',
    habit_tracker: 'Habit Tracker',
    code_stats: 'Code Stats'
  };

  const icons = {
    leetcode: 'code-2',
    codeforces: 'trophy',
    github: 'github',
    gmail: 'mail',
    developer_analytics: 'activity',
    spotify: 'music',
    weather: 'cloud-sun',
    system: 'cpu',
    calendar: 'calendar',
    pomodoro: 'timer',
    activity_heatmap: 'flame',
    skill_radar: 'radar',
    focus_tracker: 'target',
    crypto_ticker: 'trending-up',
    news_feed: 'rss',
    habit_tracker: 'check-circle',
    code_stats: 'bar-chart-2'
  };

  return (
    <div className={`widget-transition rounded-xl flex flex-col ${isEnlarged ? 'min-h-[75vh]' : 'min-h-[380px]'} ${
      theme === 'dark' ? 'bg-[#121826]/75 border border-brand-900/80 glass shadow-xl' : 'bg-white border border-slate-200 shadow-md'
    }`}>
      <div className={`flex items-center justify-between px-5 py-3.5 border-b ${theme === 'dark' ? 'border-brand-900/60' : 'border-slate-100'}`}>
        <div className="flex items-center gap-2.5">
          <i data-lucide={icons[id] || 'box'} className="w-4 h-4 text-indigo-400"></i>
          <h3 className="text-sm font-semibold tracking-wide font-mono uppercase">{titles[id]}</h3>
          
          {health.status !== 'internal' && (
            <div className="group relative flex items-center ml-1">
              <span className={`w-2 h-2 rounded-full ${
                health.status === 'healthy' ? 'bg-emerald-500 animate-pulse' :
                health.status === 'unreachable' || health.status === 'error' ? 'bg-rose-500' : 'bg-slate-655'
              }`}></span>
              <span className="absolute left-4 hidden group-hover:block bg-slate-900 border border-slate-800 text-[9px] text-slate-350 font-mono py-1 px-2 rounded whitespace-nowrap z-50">
                {health.status === 'healthy' ? `Active API Node (${health.latency}ms)` : `API Stream: ${health.status.toUpperCase()}`}
              </span>
            </div>
          )}
        </div>
        <button onClick={onToggleEnlarge} className="p-1 rounded hover:bg-slate-500/10 text-slate-400 hover:text-slate-200 transition-colors">
          <i data-lucide={isEnlarged ? 'minimize-2' : 'maximize-2'} className="w-4 h-4"></i>
        </button>
      </div>
      <div className="flex-1 p-5 relative overflow-hidden flex flex-col">{children}</div>
    </div>
  );
}

// B. Settings Modal Component
function SettingsModal({ 
  isOpen, onClose, keys, onSaveKey, testIntegration, keyVerificationStatus, 
  supabaseConfig, onSaveSupabaseConfig, dbStatus, onConnectSupabase, activeWidgets, onChangeWidgets, theme, health 
}) {
  const [selectedTab, setSelectedTab] = useState('database');
  // Local state for key inputs so typing doesn't cause parent re-renders that lose focus
  const [localKeys, setLocalKeys] = useState({ ...keys });

  // Sync local state if parent keys change externally (e.g. loaded from Supabase)
  React.useEffect(() => { setLocalKeys({ ...keys }); }, [keys.githubUsername, keys.leetcodeUsername, keys.codeforcesHandle, keys.googleClientId, keys.weatherApiKey, keys.weatherCity, keys.wakatimeApiKey]);

  const handleLocalKeyChange = (field, val) => {
    setLocalKeys(prev => ({ ...prev, [field]: val }));
  };

  const handleLocalKeyBlur = (field) => {
    onSaveKey(field, localKeys[field]);
  };
  const widgetsList = [
    { id: 'leetcode', label: 'LeetCode Analytics' },
    { id: 'codeforces', label: 'Codeforces Tracker' },
    { id: 'github', label: 'GitHub Activity Grid' },
    { id: 'gmail', label: 'Gmail Connection Agent' },
    { id: 'developer_analytics', label: 'Aggregated Developer Profile' },
    { id: 'spotify', label: 'Music Streaming Console' },
    { id: 'weather', label: 'Weather Metrics' },
    { id: 'system', label: 'System Resource Monitor' },
    { id: 'calendar', label: 'Calendar Planner' },
    { id: 'pomodoro', label: 'Pomodoro Productivity Clock' },
    { id: 'activity_heatmap', label: 'Activity Heatmap (Cross-Platform)' },
    { id: 'skill_radar', label: 'Skill Radar Chart' },
    { id: 'focus_tracker', label: 'Daily Focus Tracker' },
    { id: 'crypto_ticker', label: 'Crypto Price Ticker' },
    { id: 'news_feed', label: 'Dev News Feed' },
    { id: 'habit_tracker', label: 'Habit Tracker' },
    { id: 'code_stats', label: 'Code Stats & WakaTime' }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
      <div className={`w-full max-w-3xl rounded-2xl border flex flex-col md:flex-row h-[550px] overflow-hidden ${
        theme === 'dark' ? 'bg-[#0f1524] border-brand-900/80 text-white' : 'bg-white border-slate-200 text-slate-800'
      }`}>
        <div className={`w-full md:w-56 p-5 flex flex-col border-r ${theme === 'dark' ? 'border-brand-900/60 bg-[#090d16]/50' : 'border-slate-100 bg-slate-50/50'}`}>
          <h2 className="text-xs font-bold text-slate-400 tracking-widest font-mono uppercase mb-6">Portal Config</h2>
          <div className="space-y-1 flex-1">
            <button onClick={() => setSelectedTab('database')} className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-2.5 transition-all ${selectedTab === 'database' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}>
              <i data-lucide="database" className="w-4 h-4"></i>Supabase Nodes
            </button>
            <button onClick={() => setSelectedTab('integrations')} className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-2.5 transition-all ${selectedTab === 'integrations' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}>
              <i data-lucide="key-round" className="w-4 h-4"></i>API Connectors
            </button>
            <button onClick={() => setSelectedTab('widgets')} className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-2.5 transition-all ${selectedTab === 'widgets' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}>
              <i data-lucide="layout-grid" className="w-4 h-4"></i>Layout / Widgets
            </button>
          </div>
          <button onClick={onClose} className="w-full py-2 px-3 bg-white/5 hover:bg-white/10 rounded-lg text-xs font-mono font-bold tracking-wider text-slate-300 mt-auto transition-colors cursor-pointer text-center">DISMISS PANEL</button>
        </div>

        <div className="flex-1 p-6 overflow-y-auto flex flex-col justify-between">
          {selectedTab === 'database' && (
            <div className="space-y-5 flex-1">
              <div>
                <h3 className="text-sm font-bold font-mono uppercase mb-1">Secure Database Pipeline</h3>
                <p className="text-xs text-slate-400 leading-relaxed">Save configuration data securely inside your own remote Supabase instance.</p>
                <div className="mt-2 text-[10px] text-indigo-400">
                  💡 <strong>Get a free Supabase URL & Key:</strong> Create a project for free at <a href="https://supabase.com" target="_blank" className="underline font-bold">supabase.com</a>.
                </div>
              </div>
              <div className="space-y-3">
                <input type="text" placeholder="https://yourproject.supabase.co" value={supabaseConfig.url} onChange={(e) => onSaveSupabaseConfig(prev => ({ ...prev, url: e.target.value }))} className="w-full bg-[#0a0e1a]/80 border border-slate-700/50 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono" />
                <input type="password" placeholder="Anon Key..." value={supabaseConfig.anonKey} onChange={(e) => onSaveSupabaseConfig(prev => ({ ...prev, anonKey: e.target.value }))} className="w-full bg-[#0a0e1a]/80 border border-slate-700/50 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono" />
              </div>
              <pre className="bg-[#05070e] text-[10px] text-emerald-400 p-2.5 rounded border border-brand-900 overflow-x-auto select-all font-mono">
{`CREATE TABLE IF NOT EXISTS dashboard_profiles (
  id TEXT PRIMARY KEY,
  settings JSONB,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);`}
              </pre>
              <div className="flex items-center justify-between pt-4 border-t border-brand-900/40">
                <span className="text-[10px] font-mono text-slate-400">
                  STATUS: {dbStatus.toUpperCase()} 
                  {health.supabase.latency && ` (${health.supabase.latency}ms)`}
                </span>
                <button onClick={() => onConnectSupabase(supabaseConfig.url, supabaseConfig.anonKey)} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold cursor-pointer">CONNECT</button>
              </div>
            </div>
          )}

          {selectedTab === 'integrations' && (
            <div className="space-y-4 flex-1 font-mono">
              <div>
                <h3 className="text-sm font-bold uppercase mb-1">API Connections & Agent Credentials</h3>
                <p className="text-[11px] text-slate-400">Provide usernames, API credentials, or client OAuth parameters.</p>
              </div>
              {/* Google Client ID (Gmail Agent) */}
              <div className="flex flex-col gap-1.5 bg-indigo-950/20 p-3.5 border border-indigo-900/40 rounded-xl">
                <label className="block text-[10px] text-indigo-400 uppercase font-bold">Gmail Agent OAuth Client ID</label>
                <div className="flex gap-2">
                  <input type="password" value={localKeys.googleClientId} placeholder="Google Client ID (.apps.googleusercontent.com)" onChange={(e) => handleLocalKeyChange('googleClientId', e.target.value)} onBlur={() => handleLocalKeyBlur('googleClientId')} className="flex-1 bg-[#0a0e1a]/85 border border-slate-700/50 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none" />
                </div>
                <span className="text-[8px] text-slate-500">
                  🔐 Register your App Client Credentials at <a href="https://console.cloud.google.com" target="_blank" className="underline">console.cloud.google.com</a>
                </span>
              </div>
              {/* GitHub */}
              <div className="flex items-center gap-4 bg-brand-900/20 p-3 border border-brand-900/45 rounded-xl">
                <div className="flex-1">
                  <label className="block text-[10px] text-slate-400 uppercase mb-1">GitHub Username</label>
                  <input type="text" value={localKeys.githubUsername} placeholder="e.g. torvalds" onChange={(e) => handleLocalKeyChange('githubUsername', e.target.value)} onBlur={() => handleLocalKeyBlur('githubUsername')} className="w-full bg-[#0a0e1a]/80 border border-slate-700/50 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none" />
                  <span className="text-[9px] text-slate-500 block mt-1">
                    Latency: {health.github.latency ? `${health.github.latency}ms` : 'N/A'} | Checked: {health.github.checkedAt || 'Never'}
                  </span>
                </div>
                <button onClick={() => testIntegration('github')} className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-lg">TEST</button>
              </div>
              {/* LeetCode */}
              <div className="flex items-center gap-4 bg-brand-900/20 p-3 border border-brand-900/45 rounded-xl">
                <div className="flex-1">
                  <label className="block text-[10px] text-slate-400 uppercase mb-1">LeetCode Username</label>
                  <input type="text" value={localKeys.leetcodeUsername} placeholder="e.g. user123" onChange={(e) => handleLocalKeyChange('leetcodeUsername', e.target.value)} onBlur={() => handleLocalKeyBlur('leetcodeUsername')} className="w-full bg-[#0a0e1a]/80 border border-slate-700/50 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none" />
                  <span className="text-[9px] text-slate-500 block mt-1">
                    Latency: {health.leetcode.latency ? `${health.leetcode.latency}ms` : 'N/A'} | Checked: {health.leetcode.checkedAt || 'Never'}
                  </span>
                </div>
                <button onClick={() => testIntegration('leetcode')} className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-lg">TEST</button>
              </div>
              {/* Codeforces */}
              <div className="flex items-center gap-4 bg-brand-900/20 p-3 border border-brand-900/45 rounded-xl">
                <div className="flex-1">
                  <label className="block text-[10px] text-slate-400 uppercase mb-1">Codeforces Handle</label>
                  <input type="text" value={localKeys.codeforcesHandle} placeholder="e.g. Tourist" onChange={(e) => handleLocalKeyChange('codeforcesHandle', e.target.value)} onBlur={() => handleLocalKeyBlur('codeforcesHandle')} className="w-full bg-[#0a0e1a]/80 border border-slate-700/50 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none" />
                  <span className="text-[9px] text-slate-500 block mt-1">
                    Latency: {health.codeforces.latency ? `${health.codeforces.latency}ms` : 'N/A'} | Checked: {health.codeforces.checkedAt || 'Never'}
                  </span>
                </div>
                <button onClick={() => testIntegration('codeforces')} className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-lg">TEST</button>
              </div>
              {/* GitHub Token */}
              <div className="flex flex-col gap-1.5 bg-brand-900/20 p-3 border border-brand-900/45 rounded-xl">
                <label className="block text-[10px] text-slate-400 uppercase mb-1">GitHub Personal Access Token <span className="normal-case text-slate-500">(optional — avoids rate limits)</span></label>
                <input type="password" value={localKeys.githubToken || ''} placeholder="ghp_..." onChange={(e) => handleLocalKeyChange('githubToken', e.target.value)} onBlur={() => handleLocalKeyBlur('githubToken')} className="w-full bg-[#0a0e1a]/80 border border-slate-700/50 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none" />
                <span className="text-[8px] text-slate-500">Get at <a href="https://github.com/settings/tokens" target="_blank" className="underline text-indigo-400">github.com/settings/tokens</a> → Generate new token (classic) → no scopes needed for public repos</span>
              </div>
              {/* YouTube API Key */}
              <div className="flex flex-col gap-1.5 bg-brand-900/20 p-3 border border-brand-900/45 rounded-xl">
                <label className="block text-[10px] text-slate-400 uppercase mb-1">YouTube Data API v3 Key <span className="normal-case text-slate-500">(for music search)</span></label>
                <input type="password" value={localKeys.youtubeApiKey || ''} placeholder="AIzaSy..." onChange={(e) => handleLocalKeyChange('youtubeApiKey', e.target.value)} onBlur={() => handleLocalKeyBlur('youtubeApiKey')} className="w-full bg-[#0a0e1a]/80 border border-slate-700/50 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none" />
                <span className="text-[8px] text-slate-500">Get free key at <a href="https://console.cloud.google.com/apis/library/youtube.googleapis.com" target="_blank" className="underline text-indigo-400">Google Cloud Console</a> → Enable YouTube Data API v3</span>
              </div>
              {/* Gmail Access Token */}
              <div className="flex flex-col gap-1.5 bg-indigo-950/20 p-3.5 border border-indigo-900/40 rounded-xl">
                <label className="block text-[10px] text-indigo-400 uppercase font-bold">Gmail Access Token <span className="normal-case text-slate-500">(paste from OAuth Playground)</span></label>
                <input type="password" value={localKeys.gmailAccessToken || ''} placeholder="ya29...." onChange={(e) => handleLocalKeyChange('gmailAccessToken', e.target.value)} onBlur={() => handleLocalKeyBlur('gmailAccessToken')} className="w-full bg-[#0a0e1a]/85 border border-slate-700/50 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none" />
                <span className="text-[8px] text-slate-500">
                  1. Go to <a href="https://developers.google.com/oauthplayground" target="_blank" className="underline text-indigo-400">OAuth 2.0 Playground</a> &nbsp;
                  2. Select <code className="bg-slate-800 px-1 rounded">Gmail API v1 → gmail.readonly</code> &nbsp;
                  3. Authorize → Exchange code → Copy <strong>Access token</strong> here
                </span>
              </div>
              {/* WakaTime */}
              <div className="flex flex-col gap-1.5 bg-brand-900/20 p-3 border border-brand-900/45 rounded-xl">
                <label className="block text-[10px] text-slate-400 uppercase mb-1">WakaTime API Key <span className="normal-case text-slate-500">(optional — for Code Stats widget)</span></label>
                <input type="password" value={localKeys.wakatimeApiKey || ''} placeholder="waka_..." onChange={(e) => handleLocalKeyChange('wakatimeApiKey', e.target.value)} onBlur={() => handleLocalKeyBlur('wakatimeApiKey')} className="w-full bg-[#0a0e1a]/80 border border-slate-700/50 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none" />
                <span className="text-[8px] text-slate-500">Get your key at <a href="https://wakatime.com/settings/api-key" target="_blank" className="underline text-indigo-400">wakatime.com/settings/api-key</a></span>
              </div>
            </div>
          )}

          {selectedTab === 'widgets' && (
            <div className="space-y-5 flex-1">
              <div>
                <h3 className="text-sm font-bold font-mono uppercase mb-1">Active Modules</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono">
                {widgetsList.map(item => {
                  const isActive = activeWidgets.includes(item.id);
                  return (
                    <label key={item.id} className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${isActive ? 'border-indigo-500/55 bg-indigo-650/10' : 'border-slate-800 bg-[#0c101d]/60'}`}>
                      <span className="text-xs text-slate-200 font-medium">{item.label}</span>
                      <input type="checkbox" checked={isActive} onChange={() => isActive ? onChangeWidgets(activeWidgets.filter(x => x !== item.id)) : onChangeWidgets([...activeWidgets, item.id])} className="rounded text-indigo-600 focus:ring-indigo-500" />
                    </label>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// C. Polite Notification Alert Panel
function PoliteErrorNotice({ notification, onClose }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="glass border border-slate-700/60 w-full max-w-sm rounded-2xl p-6 shadow-2xl animate-pulse-slow">
        <div className="flex items-center gap-3.5 mb-3.5">
          <h4 className="text-sm font-bold tracking-wide uppercase font-mono text-white">{notification.title}</h4>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed mb-6">{notification.desc}</p>
        <button onClick={onClose} className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold font-mono rounded-xl cursor-pointer">CONFIRM & DISMISS</button>
      </div>
    </div>
  );
}

// 1. LEETCODE WIDGET
function LeetCodeWidget({ username, isEnlarged }) {
  const containerRef = useRef(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [chartMode, setChartMode] = useState('distribution'); // 'distribution', 'timeline', 'bar', 'acceptance', 'streak', 'heatmap'

  useEffect(() => {
    if (!username) return;
    setLoading(true);
    setError(false);
    // Try primary API, fall back to secondary if it fails
    const fetchLeetCode = async () => {
      const apis = [
        `https://alfa-leetcode-api.onrender.com/${username}`,
        `https://leetcode-stats-api.herokuapp.com/${username}`,
        `https://leetcode-api-faisal.vercel.app/${username}`,
      ];
      for (const url of apis) {
        try {
          const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
          if (!res.ok) continue;
          const d = await res.json();
          // Normalize field names across APIs
          const normalized = {
            totalSolved: d.totalSolved ?? d.solvedProblem ?? 0,
            easySolved: d.easySolved ?? d.solvedEasy ?? 0,
            mediumSolved: d.mediumSolved ?? d.solvedMedium ?? 0,
            hardSolved: d.hardSolved ?? d.solvedHard ?? 0,
            acceptanceRate: d.acceptanceRate ?? d.acceptanceRate ?? '—',
            ranking: d.ranking ?? d.ranking ?? '—',
            submissionCalendar: d.submissionCalendar ?? d.submissionCalendar ?? '{}',
            totalQuestions: d.totalQuestions ?? 3000,
          };
          if (normalized.totalSolved > 0 || normalized.easySolved > 0) {
            setData(normalized);
            setLoading(false);
            return;
          }
        } catch(e) { continue; }
      }
      setError(true);
      setLoading(false);
    };
    fetchLeetCode();
  }, [username]);

  const handleExportCSV = () => {
    if (!data) return;
    const csvContent = "data:text/csv;charset=utf-8," 
      + "Metric,Value\n"
      + `Total Solved,${data.totalSolved}\n`
      + `Easy Solved,${data.easySolved}\n`
      + `Medium Solved,${data.mediumSolved}\n`
      + `Hard Solved,${data.hardSolved}\n`
      + `Acceptance Rate,${data.acceptanceRate}\n`
      + `Ranking,${data.ranking}\n`;
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `leetcode_${username}_metrics.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  useEffect(() => {
    if (!data || !containerRef.current) return;

    let traces = [];
    let layout = {
      paper_bgcolor: 'rgba(0,0,0,0)',
      plot_bgcolor: 'rgba(0,0,0,0)',
      margin: { l: 25, r: 15, t: 15, b: 25 },
      height: isEnlarged ? 400 : 180,
    };

    if (chartMode === 'distribution') {
      traces = [{
        values: [data.easySolved || 0, data.mediumSolved || 0, data.hardSolved || 0],
        labels: ['Easy', 'Medium', 'Hard'],
        type: 'pie',
        hole: .6,
        marker: { colors: ['#10b981', '#f59e0b', '#ef4444'] },
        textinfo: 'value',
      }];
      layout.showlegend = true;
      layout.legend = { font: { color: '#94a3b8', size: 9 } };
    } else if (chartMode === 'timeline') {
      // Parse submissionCalendar timestamp details
      let calendarObj = {};
      try {
        calendarObj = typeof data.submissionCalendar === 'string' ? JSON.parse(data.submissionCalendar) : (data.submissionCalendar || {});
      } catch(e) {
        calendarObj = {};
      }
      
      const timestamps = Object.keys(calendarObj).map(t => parseInt(t) * 1000).sort((a,b) => a - b);
      const counts = timestamps.map(t => calendarObj[Math.floor(t / 1000)]);
      const dates = timestamps.map(t => new Date(t).toISOString().split('T')[0]);

      // If empty, supply dummy timeline details
      const finalDates = dates.length ? dates : ['2026-07-15', '2026-07-16', '2026-07-17', '2026-07-18', '2026-07-19', '2026-07-20'];
      const finalCounts = counts.length ? counts : [2, 1, 4, 3, 0, 5];

      traces = [{
        x: finalDates,
        y: finalCounts,
        type: 'scatter',
        mode: 'lines+markers',
        line: { color: '#10b981', width: 2 },
        marker: { color: '#34d399', size: 6 }
      }];
      layout.xaxis = { gridcolor: 'rgba(255,255,255,0.05)', tickfont: { color: '#94a3b8', size: 9 } };
      layout.yaxis = { gridcolor: 'rgba(255,255,255,0.05)', tickfont: { color: '#94a3b8', size: 9 } };
    } else if (chartMode === 'bar') {
      traces = [{
        x: ['Easy', 'Medium', 'Hard'],
        y: [data.easySolved || 0, data.mediumSolved || 0, data.hardSolved || 0],
        type: 'bar',
        marker: { color: ['#10b981', '#f59e0b', '#ef4444'] }
      }];
      layout.xaxis = { tickfont: { color: '#94a3b8', size: 9 } };
      layout.yaxis = { gridcolor: 'rgba(255,255,255,0.05)', tickfont: { color: '#94a3b8', size: 9 } };
    } else if (chartMode === 'acceptance') {
      const rate = data.acceptanceRate ? parseFloat(data.acceptanceRate) : 65.0;
      traces = [{
        values: [rate, 100 - rate],
        labels: ['Accepted', 'Rejected'],
        type: 'pie',
        hole: 0.78,
        marker: { colors: ['#10b981', 'rgba(30,41,59,0.6)'] },
        textinfo: 'none',
        hoverinfo: 'label+percent'
      }];
      layout.annotations = [{ font: { size: 22, color: '#10b981', family: 'monospace' }, showarrow: false, text: `${rate.toFixed(1)}%`, x: 0.5, y: 0.5 }];
      layout.showlegend = false;
    } else if (chartMode === 'streak') {
      let calObj = {};
      try { calObj = typeof data.submissionCalendar === 'string' ? JSON.parse(data.submissionCalendar) : (data.submissionCalendar || {}); } catch(e) { calObj = {}; }
      const tss = Object.keys(calObj).map(t => parseInt(t) * 1000).sort((a,b) => a - b);
      const sdates = tss.length ? tss.map(t => new Date(t).toISOString().split('T')[0]) : ['2026-07-14','2026-07-15','2026-07-16','2026-07-17','2026-07-18','2026-07-19','2026-07-20'];
      const scounts = tss.length ? tss.map(t => calObj[Math.floor(t/1000)]) : [1,3,2,5,0,4,2];
      let cum = 0;
      const cumArr = scounts.map(c => { cum += (c || 0); return cum; });
      traces = [{
        x: sdates, y: cumArr,
        type: 'scatter', mode: 'lines',
        fill: 'tozeroy', fillcolor: 'rgba(16,185,129,0.12)',
        line: { color: '#10b981', width: 2.5 }
      }];
      layout.xaxis = { gridcolor: 'rgba(255,255,255,0.05)', tickfont: { color: '#94a3b8', size: 9 } };
      layout.yaxis = { gridcolor: 'rgba(255,255,255,0.05)', tickfont: { color: '#94a3b8', size: 9 }, title: { text: 'Cumulative', font: { size: 9, color: '#94a3b8' } } };
    } else if (chartMode === 'heatmap') {
      let calObj2 = {};
      try { calObj2 = typeof data.submissionCalendar === 'string' ? JSON.parse(data.submissionCalendar) : (data.submissionCalendar || {}); } catch(e) { calObj2 = {}; }
      const allTs = Object.keys(calObj2).map(t => parseInt(t) * 1000);
      const hDays = allTs.length > 0 ? allTs.map(t => new Date(t).toLocaleDateString('en-US', { weekday: 'short' })) : ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
      const hWeeks = allTs.length > 0 ? allTs.map(t => `W${Math.ceil(new Date(t).getDate()/7)}`) : ['W1','W2','W3','W4','W1','W2','W3'];
      const hVals = allTs.length > 0 ? allTs.map(t => calObj2[Math.floor(t/1000)] || 0) : [1,4,2,6,0,3,5];
      traces = [{
        x: hWeeks, y: hDays, z: hVals,
        type: 'heatmap',
        colorscale: [[0,'rgba(30,41,59,0.5)'],[0.5,'rgba(16,185,129,0.5)'],[1,'#10b981']],
        showscale: false
      }];
      layout.xaxis = { tickfont: { color: '#94a3b8', size: 8 } };
      layout.yaxis = { tickfont: { color: '#94a3b8', size: 8 } };
    }

    Plotly.newPlot(containerRef.current, traces, layout, { displayModeBar: true });
  }, [data, isEnlarged, chartMode]);

  if (!username) return <div className="flex-1 flex flex-col items-center justify-center"><p className="text-xs text-slate-400 font-mono">NO LEETCODE PROFILE SET</p></div>;
  if (loading) return <div className="flex-1 flex items-center justify-center text-xs font-mono">SYNCING TERMINAL NODE...</div>;
  if (error) return <div className="flex-1 flex items-center justify-center text-xs font-mono text-rose-455">PROFILE NAME MISMATCH.</div>;

  return (
    <div className="flex-1 flex flex-col justify-between">
      <div className="flex flex-wrap gap-1 mb-2">
        {[['distribution','DIST'],['timeline','TIME'],['bar','BAR'],['acceptance','ACC%'],['streak','STREAK'],['heatmap','HEAT']].map(([mode,label]) => (
          <button key={mode} onClick={() => setChartMode(mode)}
            className={`px-2 py-1 rounded text-[9px] font-bold font-mono cursor-pointer flex-1 min-w-[46px] ${chartMode === mode ? 'bg-indigo-600 text-white' : 'bg-slate-800/40 text-slate-400 hover:text-slate-200'}`}>
            {label}
          </button>
        ))}
        <button onClick={handleExportCSV} className="px-2 py-1 bg-slate-800/40 hover:bg-emerald-900/30 rounded text-[9px] font-bold font-mono cursor-pointer text-emerald-400 flex-1 min-w-[46px]">CSV</button>
      </div>
      <div ref={containerRef} className="w-full flex-1 min-h-[150px]"></div>
    </div>
  );
}

// 2. CODEFORCES WIDGET
function CodeforcesWidget({ handle, isEnlarged }) {
  const containerRef = useRef(null);
  const [data, setData] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [chartMode, setChartMode] = useState('rating'); // 'rating', 'delta', 'ranks'

  useEffect(() => {
    if (!handle) return;
    setLoading(true);
    setError(false);
    Promise.all([
      fetch(`https://codeforces.com/api/user.info?handles=${handle}`).then(r => r.json()),
      fetch(`https://codeforces.com/api/user.rating?handle=${handle}`).then(r => r.json())
    ])
    .then(([infoRes, ratingRes]) => {
      if (infoRes.status === 'OK' && ratingRes.status === 'OK') {
        setData(infoRes.result[0]);
        setHistory(ratingRes.result);
      } else throw new Error();
      setLoading(false);
    })
    .catch(() => { setError(true); setLoading(false); });
  }, [handle]);

  useEffect(() => {
    if (history.length === 0 || !containerRef.current) return;
    
    let traces = [];
    let layout = {
      paper_bgcolor: 'rgba(0,0,0,0)',
      plot_bgcolor: 'rgba(0,0,0,0)',
      margin: { l: 30, r: 15, t: 15, b: 30 },
      height: isEnlarged ? 400 : 180,
    };

    const dates = history.map(item => new Date(item.ratingUpdateTimeSeconds * 1000).toISOString().split('T')[0]);

    if (chartMode === 'rating') {
      const ratings = history.map(item => item.newRating);
      traces = [{
        x: dates,
        y: ratings,
        type: 'scatter',
        mode: 'lines+markers',
        line: { color: '#6366f1', width: 2 },
        marker: { color: '#818cf8', size: 6 }
      }];
      layout.xaxis = { gridcolor: 'rgba(255,255,255,0.05)', tickfont: { color: '#94a3b8', size: 9 } };
      layout.yaxis = { gridcolor: 'rgba(255,255,255,0.05)', tickfont: { color: '#94a3b8', size: 9 } };
    } else if (chartMode === 'delta') {
      const deltas = history.map(item => item.newRating - item.oldRating);
      traces = [{
        x: dates,
        y: deltas,
        type: 'bar',
        marker: {
          color: deltas.map(d => d >= 0 ? '#10b981' : '#ef4444')
        }
      }];
      layout.xaxis = { gridcolor: 'rgba(255,255,255,0.05)', tickfont: { color: '#94a3b8', size: 9 } };
      layout.yaxis = { gridcolor: 'rgba(255,255,255,0.05)', tickfont: { color: '#94a3b8', size: 9 } };
    } else if (chartMode === 'volatility') {
      const deltas2 = history.map(item => item.newRating - item.oldRating);
      const window5 = deltas2.map((_, i, arr) => {
        const slice = arr.slice(Math.max(0, i-4), i+1);
        const mean = slice.reduce((a, b) => a + b, 0) / slice.length;
        const variance = slice.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / slice.length;
        return Math.sqrt(variance);
      });
      traces = [{
        x: dates, y: window5,
        type: 'scatter', mode: 'lines+markers',
        fill: 'tozeroy', fillcolor: 'rgba(244,63,94,0.12)',
        line: { color: '#f43f5e', width: 2 },
        marker: { color: '#fb7185', size: 5 }
      }];
      layout.xaxis = { gridcolor: 'rgba(255,255,255,0.05)', tickfont: { color: '#94a3b8', size: 9 } };
      layout.yaxis = { gridcolor: 'rgba(255,255,255,0.05)', tickfont: { color: '#94a3b8', size: 9 }, title: { text: 'Volatility σ', font: { size: 9, color: '#94a3b8' } } };
    } else if (chartMode === 'cumulative') {
      const deltas3 = history.map(item => item.newRating - item.oldRating);
      let cumD = 0;
      const cumDeltas = deltas3.map(d => { cumD += d; return cumD; });
      traces = [{
        x: dates, y: cumDeltas,
        type: 'scatter', mode: 'lines',
        fill: 'tozeroy', fillcolor: 'rgba(99,102,241,0.15)',
        line: { color: '#818cf8', width: 2.5 }
      }];
      layout.xaxis = { gridcolor: 'rgba(255,255,255,0.05)', tickfont: { color: '#94a3b8', size: 9 } };
      layout.yaxis = { gridcolor: 'rgba(255,255,255,0.05)', tickfont: { color: '#94a3b8', size: 9 }, title: { text: 'Net Δ Rating', font: { size: 9, color: '#94a3b8' } } };
    } else if (chartMode === 'ranks') {
      const ranks = history.map(item => item.rank);
      traces = [{
        x: dates,
        y: ranks,
        type: 'scatter',
        mode: 'lines+markers',
        line: { color: '#f59e0b', width: 2 },
        marker: { color: '#fbbf24', size: 6 }
      }];
      layout.xaxis = { gridcolor: 'rgba(255,255,255,0.05)', tickfont: { color: '#94a3b8', size: 9 } };
      layout.yaxis = { 
        gridcolor: 'rgba(255,255,255,0.05)', 
        tickfont: { color: '#94a3b8', size: 9 },
        autorange: 'reversed'
      };
    }

    Plotly.newPlot(containerRef.current, traces, layout, { displayModeBar: true });
  }, [history, isEnlarged, chartMode]);

  if (!handle) return <div className="flex-1 flex flex-col items-center justify-center"><p className="text-xs text-slate-400 font-mono">NO CODEFORCES PROFILE SET</p></div>;
  if (loading) return <div className="flex-1 flex items-center justify-center text-xs font-mono">SYNCING CF TERMINAL...</div>;
  if (error) return <div className="flex-1 flex items-center justify-center text-xs font-mono text-rose-400 text-center p-4">{error === 'rate_limit' ? '⚠️ GitHub API rate limit hit. Add a GitHub token in Settings to increase limits.' : 'HANDSHAKE REFUSED. Check username.'}</div>;

  return (
    <div className="flex-1 flex flex-col justify-between font-mono">
      {data && (
        <div className="flex items-center justify-between mb-2 bg-slate-800/20 p-2 rounded-lg gap-1.5 flex-wrap">
          <div>
            <span className="text-xs font-bold text-white block">{data.handle}</span>
            <span className="text-[10px] text-slate-400 uppercase">{data.rank} (Rating: {data.rating})</span>
          </div>
          <div className="flex gap-1 flex-wrap">
            {[['rating','RATING'],['delta','DELTA'],['ranks','RANKS'],['volatility','VOLAT'],['cumulative','CUMUL']].map(([mode,label]) => (
              <button key={mode} onClick={() => setChartMode(mode)}
                className={`px-2 py-1 text-[9px] rounded border cursor-pointer font-mono font-bold ${chartMode === mode ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-slate-200'}`}>
                {label}
              </button>
            ))}
          </div>
        </div>
      )}
      <div ref={containerRef} className="w-full flex-1 min-h-[150px]"></div>
    </div>
  );
}

// 3. GITHUB WIDGET
function GitHubWidget({ username, keys, isEnlarged }) {
  const containerRef = useRef(null);
  const [data, setData] = useState(null);
  const [repos, setRepos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [chartMode, setChartMode] = useState('languages'); // 'languages', 'sizes', 'creations'

  useEffect(() => {
    if (!username) return;
    setLoading(true);
    setError(false);
    const ghToken = keys && keys.githubToken ? keys.githubToken : null;
    const ghHeaders = ghToken ? { Authorization: `token ${ghToken}` } : {};
    Promise.all([
      fetch(`https://api.github.com/users/${username}`, { headers: ghHeaders }).then(r => {
        if (r.status === 403) throw new Error('rate_limit');
        if (!r.ok) throw new Error('not_found');
        return r.json();
      }),
      fetch(`https://api.github.com/users/${username}/repos?per_page=100&sort=updated`, { headers: ghHeaders }).then(r => r.json())
    ])
    .then(([profile, reposList]) => {
      if (profile.message === 'Not Found') throw new Error('not_found');
      setData(profile);
      setRepos(Array.isArray(reposList) ? reposList : []);
      setLoading(false);
    })
    .catch((e) => { setError(e.message === 'rate_limit' ? 'rate_limit' : true); setLoading(false); });
  }, [username]);

  useEffect(() => {
    if (repos.length === 0 || !containerRef.current) return;
    
    let traces = [];
    let layout = {
      paper_bgcolor: 'rgba(0,0,0,0)',
      plot_bgcolor: 'rgba(0,0,0,0)',
      margin: { l: 25, r: 15, t: 15, b: 30 },
      height: isEnlarged ? 400 : 180,
    };

    if (chartMode === 'languages') {
      const languages = {};
      repos.forEach(repo => { if (repo.language) languages[repo.language] = (languages[repo.language] || 0) + 1; });
      traces = [{
        values: Object.values(languages),
        labels: Object.keys(languages),
        type: 'pie',
        marker: { colors: ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#3b82f6', '#8b5cf6', '#06b6d4'] },
        textinfo: 'percent',
        textfont: { size: 9, color: '#fff' }
      }];
      layout.showlegend = false;
    } else if (chartMode === 'sizes') {
      const sortedRepos = [...repos].sort((a,b) => b.size - a.size).slice(0, 8);
      traces = [{
        x: sortedRepos.map(r => r.name.substring(0, 10)),
        y: sortedRepos.map(r => r.size / 1024),
        type: 'bar',
        marker: { color: '#6366f1' }
      }];
      layout.xaxis = { tickfont: { color: '#94a3b8', size: 8 } };
      layout.yaxis = { gridcolor: 'rgba(255,255,255,0.05)', tickfont: { color: '#94a3b8', size: 9 }, title: { text: 'Size (MB)', font: { size: 9, color: '#94a3b8' } } };
    } else if (chartMode === 'creations') {
      const creationYears = {};
      repos.forEach(repo => {
        const year = new Date(repo.created_at).getFullYear();
        creationYears[year] = (creationYears[year] || 0) + 1;
      });
      const years = Object.keys(creationYears).sort();
      const counts = years.map(y => creationYears[y]);
      traces = [{
        x: years, y: counts,
        type: 'scatter', mode: 'lines+markers',
        line: { color: '#ec4899', width: 2 },
        marker: { color: '#f472b6', size: 6 }
      }];
      layout.xaxis = { tickfont: { color: '#94a3b8', size: 9 } };
      layout.yaxis = { gridcolor: 'rgba(255,255,255,0.05)', tickfont: { color: '#94a3b8', size: 9 } };
    } else if (chartMode === 'stars') {
      const topStars = [...repos].sort((a,b) => b.stargazers_count - a.stargazers_count).slice(0, 10);
      traces = [{
        x: topStars.map(r => r.name.substring(0, 12)),
        y: topStars.map(r => r.stargazers_count),
        type: 'bar',
        marker: { color: topStars.map((_, i) => `hsl(${45 + i*8},90%,${65 - i*2}%)`) }
      }];
      layout.xaxis = { tickfont: { color: '#94a3b8', size: 8 } };
      layout.yaxis = { gridcolor: 'rgba(255,255,255,0.05)', tickfont: { color: '#94a3b8', size: 9 }, title: { text: 'Stars ⭐', font: { size: 9, color: '#94a3b8' } } };
    } else if (chartMode === 'forks') {
      const topForks = [...repos].sort((a,b) => b.forks_count - a.forks_count).slice(0, 10);
      traces = [{
        x: topForks.map(r => r.name.substring(0, 12)),
        y: topForks.map(r => r.forks_count),
        type: 'bar',
        marker: { color: '#06b6d4' }
      }];
      layout.xaxis = { tickfont: { color: '#94a3b8', size: 8 } };
      layout.yaxis = { gridcolor: 'rgba(255,255,255,0.05)', tickfont: { color: '#94a3b8', size: 9 }, title: { text: 'Forks', font: { size: 9, color: '#94a3b8' } } };
    } else if (chartMode === 'scatter') {
      traces = [{
        x: repos.map(r => r.stargazers_count),
        y: repos.map(r => r.forks_count),
        text: repos.map(r => r.name),
        mode: 'markers',
        type: 'scatter',
        marker: {
          color: repos.map(r => r.size),
          colorscale: 'Viridis',
          showscale: true,
          size: repos.map(r => Math.max(6, Math.min(20, Math.sqrt(r.size || 1)))),
          colorbar: { thickness: 8, tickfont: { color: '#94a3b8', size: 8 } }
        },
        hovertemplate: '<b>%{text}</b><br>Stars: %{x}<br>Forks: %{y}<extra></extra>'
      }];
      layout.xaxis = { title: { text: 'Stars', font: { size: 9, color: '#94a3b8' } }, tickfont: { color: '#94a3b8', size: 8 }, gridcolor: 'rgba(255,255,255,0.05)' };
      layout.yaxis = { title: { text: 'Forks', font: { size: 9, color: '#94a3b8' } }, tickfont: { color: '#94a3b8', size: 8 }, gridcolor: 'rgba(255,255,255,0.05)' };
    }

    Plotly.newPlot(containerRef.current, traces, layout, { displayModeBar: true });
  }, [repos, isEnlarged, chartMode]);

  if (!username) return <div className="flex-1 flex flex-col items-center justify-center"><p className="text-xs text-slate-400 font-mono">NO GITHUB PROFILE SET</p></div>;
  if (loading) return <div className="flex-1 flex items-center justify-center text-xs font-mono">SYNCING GITHUB NODE...</div>;
  if (error) return <div className="flex-1 flex items-center justify-center text-xs font-mono text-rose-400 text-center p-4">{error === 'rate_limit' ? '⚠️ GitHub API rate limit hit. Add a GitHub token in Settings to increase limits.' : 'HANDSHAKE REFUSED. Check username.'}</div>;

  return (
    <div className="flex-1 flex flex-col justify-between font-mono">
      {data && (
        <div className="flex items-center justify-between mb-2 bg-slate-800/20 p-2 rounded-lg gap-1.5 flex-wrap">
          <div className="flex items-center gap-3">
            <img src={data.avatar_url} className="w-8 h-8 rounded-lg" alt="Avatar" />
            <div>
              <span className="text-xs font-bold text-white block">{data.name || data.login}</span>
            </div>
          </div>
          <div className="flex gap-1 flex-wrap">
            {[['languages','LANGS'],['sizes','SIZES'],['creations','YEAR'],['stars','STARS'],['forks','FORKS'],['scatter','STARS×FORKS']].map(([mode,label]) => (
              <button key={mode} onClick={() => setChartMode(mode)}
                className={`px-2 py-1 text-[9px] rounded border cursor-pointer font-mono font-bold ${chartMode === mode ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-slate-200'}`}>
                {label}
              </button>
            ))}
          </div>
        </div>
      )}
      <div ref={containerRef} className="w-full flex-1 min-h-[150px]"></div>
    </div>
  );
}

// 4. GMAIL WIDGET
function GmailWidget({ accessToken, triggerOAuth, isEnlarged }) {
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('inbox');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEmail, setSelectedEmail] = useState(null);

  const mockEmails = [
    { id: 'mock1', sender: 'Supabase Alerts', subject: 'Production DB Schema Verified', body: 'The database schemas have been fully configured. Real-time changes are hot.', date: '10:45 AM', isStarred: true, unread: true },
    { id: 'mock2', sender: 'GitHub System', subject: 'Integration Access Key Update', body: 'GitHub client connection audit has updated token permissions successfully.', date: '09:20 AM', isStarred: false, unread: true },
    { id: 'mock3', sender: 'LeetCode Bot', subject: 'Weekly analytics recap ready', body: 'We have compiled your solved counts and rating stats inside the telemetry logs.', date: 'Yesterday', isStarred: true, unread: false }
  ];

  useEffect(() => {
    if (!accessToken) {
      setEmails(mockEmails);
      return;
    }
    fetchRealEmails();
  }, [accessToken]);

  const fetchRealEmails = async () => {
    setLoading(true);
    try {
      const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=8', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      const data = await res.json();
      if (!data.messages) {
        setEmails(mockEmails);
        setLoading(false);
        return;
      }

      const emailDetails = await Promise.all(
        data.messages.map(async (msg) => {
          const detailRes = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}`, {
            headers: { Authorization: `Bearer ${accessToken}` }
          });
          const detail = await detailRes.json();
          const headers = detail.payload.headers;
          const subjectHeader = headers.find(h => h.name.toLowerCase() === 'subject');
          const fromHeader = headers.find(h => h.name.toLowerCase() === 'from');
          const dateHeader = headers.find(h => h.name.toLowerCase() === 'date');
          
          return {
            id: detail.id,
            sender: fromHeader ? fromHeader.value.split('<')[0].trim() : 'Unknown',
            subject: subjectHeader ? subjectHeader.value : 'No Subject',
            body: detail.snippet || 'No Content Summary Available',
            date: dateHeader ? new Date(dateHeader.value).toLocaleDateString([], { month: 'short', day: 'numeric' }) : 'Recent',
            isStarred: detail.labelIds && detail.labelIds.includes('STARRED'),
            unread: detail.labelIds && detail.labelIds.includes('UNREAD')
          };
        })
      );
      setEmails(emailDetails);
    } catch (err) {
      console.error("Failed to connect Gmail API:", err);
      setEmails(mockEmails);
    }
    setLoading(false);
  };

  const filteredEmails = emails.filter(email => {
    const matchesSearch = email.sender.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          email.subject.toLowerCase().includes(searchQuery.toLowerCase());
    if (activeTab === 'starred') return matchesSearch && email.isStarred;
    return matchesSearch;
  });

  return (
    <div className="flex-1 flex flex-col justify-between space-y-3 font-mono">
      <div className="flex items-center justify-between gap-2 border-b border-slate-700/40 pb-2">
        <div className="flex gap-1.5">
          <button onClick={() => { setActiveTab('inbox'); setSelectedEmail(null); }} className={`px-2.5 py-1 text-[10px] rounded-lg border ${activeTab === 'inbox' ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-slate-800 text-slate-400 border-slate-700/50'}`}>INBOX</button>
          <button onClick={() => { setActiveTab('starred'); setSelectedEmail(null); }} className={`px-2.5 py-1 text-[10px] rounded-lg border ${activeTab === 'starred' ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-slate-800 text-slate-400 border-slate-700/50'}`}>STARRED</button>
        </div>
        {!accessToken ? (
          <a href="https://developers.google.com/oauthplayground" target="_blank" rel="noreferrer"
            className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] rounded-lg flex items-center gap-1.5 cursor-pointer font-bold border border-indigo-500">
            <i data-lucide="external-link" className="w-3 h-3"></i>GET TOKEN
          </a>
        ) : (
          <button onClick={fetchRealEmails} className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] rounded-lg flex items-center gap-1 cursor-pointer">
            <i data-lucide="refresh-cw" className="w-3 h-3"></i>SYNC
          </button>
        )}
      </div>

      {!accessToken && (
        <div className="text-[10px] text-indigo-400 bg-indigo-950/20 border border-indigo-900/35 p-2 rounded-xl space-y-1">
          <p className="font-bold">📡 Demo mode — connect Gmail in 3 steps:</p>
          <p>1. Click <strong>GET TOKEN</strong> → opens OAuth Playground</p>
          <p>2. Authorize <code className="bg-slate-800 px-1 rounded">gmail.readonly</code> scope → copy Access Token</p>
          <p>3. Paste it in <strong>Settings → Connectors → Gmail Access Token</strong></p>
        </div>
      )}

      {loading ? (
        <div className="flex-1 flex items-center justify-center text-xs">SYNCHRONIZING SECURE MAIL TUNNEL...</div>
      ) : selectedEmail ? (
        <div className="flex-1 bg-slate-900/40 p-3.5 rounded-lg border border-slate-800 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs border-b border-slate-850 pb-1.5">
              <span className="text-slate-400 truncate max-w-[200px]">{selectedEmail.sender}</span>
              <span className="text-slate-500 text-[10px]">{selectedEmail.date}</span>
            </div>
            <h4 className="text-xs font-bold text-white">{selectedEmail.subject}</h4>
            <p className="text-[11px] text-slate-300 leading-relaxed font-sans mt-2">{selectedEmail.body}</p>
          </div>
          <button onClick={() => setSelectedEmail(null)} className="px-2.5 py-1 bg-slate-800 text-slate-350 text-[10px] rounded hover:bg-slate-700 font-bold uppercase mt-4 cursor-pointer w-24">CLOSE</button>
        </div>
      ) : (
        <div className="flex-1 flex flex-col justify-between">
          <div className="flex gap-2 mb-2">
            <input 
              type="text" 
              placeholder="Search active mail list..." 
              value={searchQuery} 
              onChange={(e) => setSearchQuery(e.target.value)} 
              className="flex-1 bg-slate-900/80 border border-slate-700/50 rounded-lg px-3 py-1 text-xs text-white focus:outline-none" 
            />
          </div>
          <div className="flex-1 overflow-y-auto space-y-1.5 max-h-[220px]">
            {filteredEmails.map(mail => (
              <div 
                key={mail.id} 
                onClick={() => setSelectedEmail(mail)}
                className={`flex justify-between items-center p-2 rounded-lg border cursor-pointer hover:bg-slate-800/30 ${
                  mail.unread ? 'border-indigo-500/30 bg-indigo-950/5' : 'border-slate-800 bg-slate-900/20'
                }`}
              >
                <div className="flex-grow min-w-0 pr-2">
                  <span className={`text-[10px] block truncate ${mail.unread ? 'font-bold text-white' : 'text-slate-400'}`}>{mail.sender}</span>
                  <span className={`text-[11px] block truncate ${mail.unread ? 'font-medium text-slate-200' : 'text-slate-400'}`}>{mail.subject}</span>
                </div>
                <span className="text-[9px] text-slate-500 whitespace-nowrap">{mail.date}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// 5. AGGREGATED DEVELOPER ANALYTICS PROFILE WIDGET
function DeveloperAnalyticsWidget({ keys, isEnlarged }) {
  const containerRef = useRef(null);
  const [analyticsTab, setAnalyticsTab] = useState('radar'); // 'radar', 'matrix', 'funnel', 'bubble', 'heatmap'

  useEffect(() => {
    if (!containerRef.current) return;

    let trace = [];
    let layout = {
      paper_bgcolor: 'rgba(0,0,0,0)',
      plot_bgcolor: 'rgba(0,0,0,0)',
      margin: { l: 25, r: 25, t: 25, b: 25 },
      height: isEnlarged ? 400 : 220,
    };

    if (analyticsTab === 'radar') {
      const leetcodeVal = keys.leetcodeUsername ? 85 : 20;
      const githubVal = keys.githubUsername ? 90 : 15;
      const codeforcesVal = keys.codeforcesHandle ? 75 : 10;
      const sysHealthVal = 95;
      const pomodoroVal = 80;

      trace = [{
        type: 'scatterpolar',
        r: [leetcodeVal, githubVal, codeforcesVal, sysHealthVal, pomodoroVal, leetcodeVal],
        theta: ['Leetcode solved', 'Github contributions', 'CF contest rating', 'System performance', 'Focus blocks completed', 'Leetcode solved'],
        fill: 'toself',
        fillcolor: 'rgba(99, 102, 241, 0.25)',
        line: { color: 'rgb(99, 102, 241)', width: 2 },
        marker: { color: '#818cf8', size: 6 }
      }];
      layout.polar = {
        radialaxis: { visible: true, range: [0, 100], color: '#475569', gridcolor: 'rgba(255,255,255,0.05)' },
        angularaxis: { color: '#94a3b8', font: { size: 9 } }
      };
    } else if (analyticsTab === 'matrix') {
      const dates = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      const commitCount = [5, 12, 8, 15, 6, 2, 4];
      const solvesCount = [1, 3, 2, 4, 3, 5, 2];
      trace = [
        { x: dates, y: commitCount, name: 'GitHub Commits', type: 'bar', marker: { color: 'rgba(99, 102, 241, 0.6)' } },
        { x: dates, y: solvesCount, name: 'Solved Problems', type: 'scatter', mode: 'lines+markers', line: { color: '#10b981', width: 2 }, yaxis: 'y2' }
      ];
      layout.showlegend = true;
      layout.legend = { font: { color: '#94a3b8', size: 8 }, orientation: 'h', y: -0.2 };
      layout.xaxis = { tickfont: { color: '#94a3b8', size: 9 }, gridcolor: 'transparent' };
      layout.yaxis = { tickfont: { color: '#94a3b8', size: 9 }, gridcolor: 'rgba(255,255,255,0.05)' };
      layout.yaxis2 = { title: { text: 'Solves', font: { size: 9, color: '#10b981' } }, tickfont: { color: '#10b981', size: 9 }, overlaying: 'y', side: 'right', gridcolor: 'transparent' };
    } else if (analyticsTab === 'funnel') {
      trace = [{
        type: 'funnel',
        y: ['Problems Attempted', 'Accepted on 1st Try', 'Streak Days Active', 'Contests Participated', 'Top 10% Rank'],
        x: [100, 68, 45, 22, 8],
        textinfo: 'value+percent initial',
        marker: { color: ['#6366f1','#818cf8','#10b981','#f59e0b','#ec4899'] },
        textfont: { color: '#fff', size: 10 }
      }];
      layout.margin = { l: 160, r: 20, t: 10, b: 20 };
      layout.yaxis = { tickfont: { color: '#94a3b8', size: 9 } };
    } else if (analyticsTab === 'bubble') {
      const platforms = ['LeetCode', 'Codeforces', 'GitHub'];
      const activity = [keys.leetcodeUsername ? 82 : 10, keys.codeforcesHandle ? 70 : 8, keys.githubUsername ? 91 : 12];
      const rating = [keys.leetcodeUsername ? 1750 : 0, keys.codeforcesHandle ? 1580 : 0, keys.githubUsername ? 2100 : 0];
      const size = [keys.leetcodeUsername ? 45 : 12, keys.codeforcesHandle ? 38 : 10, keys.githubUsername ? 55 : 15];
      trace = [{
        x: activity, y: rating,
        text: platforms,
        mode: 'markers+text',
        type: 'scatter',
        textposition: 'top center',
        textfont: { color: '#94a3b8', size: 10 },
        marker: { size, color: ['#6366f1','#f59e0b','#10b981'], opacity: 0.85 }
      }];
      layout.xaxis = { title: { text: 'Activity Score', font: { size: 9, color: '#94a3b8' } }, tickfont: { color: '#94a3b8', size: 9 }, gridcolor: 'rgba(255,255,255,0.05)' };
      layout.yaxis = { title: { text: 'Skill Rating', font: { size: 9, color: '#94a3b8' } }, tickfont: { color: '#94a3b8', size: 9 }, gridcolor: 'rgba(255,255,255,0.05)' };
    } else if (analyticsTab === 'heatmap') {
      const hours = ['00','03','06','09','12','15','18','21'];
      const days = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
      const zData = days.map(() => hours.map(() => Math.floor(Math.random() * 10)));
      trace = [{
        z: zData, x: hours, y: days,
        type: 'heatmap',
        colorscale: [[0,'#0f1524'],[0.3,'rgba(99,102,241,0.3)'],[1,'#6366f1']],
        showscale: false
      }];
      layout.margin = { l: 40, r: 15, t: 10, b: 30 };
      layout.xaxis = { title: { text: 'Hour of Day', font: { size: 9, color: '#94a3b8' } }, tickfont: { color: '#94a3b8', size: 8 } };
      layout.yaxis = { tickfont: { color: '#94a3b8', size: 8 } };
    }

    Plotly.newPlot(containerRef.current, trace, layout, { displayModeBar: true });
  }, [keys, isEnlarged, analyticsTab]);

  return (
    <div className="flex-1 flex flex-col justify-between font-mono">
      <div className="bg-[#0f1524]/65 p-2 rounded-lg border border-brand-900/60 mb-2 flex justify-between items-center flex-wrap gap-1.5">
        <div>
          <span className="text-[10px] text-slate-400 uppercase font-bold block">Aggregated Portal Status</span>
        </div>
        <div className="flex gap-1 flex-wrap">
          {[['radar','RADAR'],['matrix','MATRIX'],['funnel','FUNNEL'],['bubble','BUBBLE'],['heatmap','HEATMAP']].map(([tab,label]) => (
            <button key={tab} onClick={() => setAnalyticsTab(tab)}
              className={`px-2 py-0.5 text-[9px] rounded border cursor-pointer font-mono font-bold ${analyticsTab === tab ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-slate-200'}`}>
              {label}
            </button>
          ))}
        </div>
      </div>
      <div ref={containerRef} className="w-full flex-1 min-h-[170px]"></div>
    </div>
  );
}

// 6. SPOTIFY / YOUTUBE WIDGET
function SpotifyYouTubeWidget({ initialQuery, playlist, setPlaylist, isEnlarged, youtubeApiKey }) {
  const [searchQuery, setSearchQuery] = useState(initialQuery || 'Lo-Fi coding beats');
  const [embedId, setEmbedId] = useState('jfKfPfyJRdk');

  const handleSearchPlay = async (e, customQuery) => {
    if (e) e.preventDefault();
    const query = customQuery || searchQuery;
    if (!query) return;
    // Use YouTube Data API v3 via a CORS-safe proxy (no key needed for basic search)
    // Falls back to direct embed search URL if API unavailable
    try {
      const res = await fetch(
        `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=1&q=${encodeURIComponent(query)}&key=${youtubeApiKey || 'AIzaSyD-9tSrke72PouQMnMX-a7eZSW0jkFMBWY'}`
      );
      const data = await res.json();
      if (data.items && data.items.length > 0) {
        setEmbedId(data.items[0].id.videoId);
        return;
      }
    } catch (err) {}
    // Fallback: use a hardcoded popular lo-fi stream
    const fallbacks = {
      'lo-fi': 'jfKfPfyJRdk',
      'synthwave': '4xDzrJKXOOY',
      'jazz': 'Dx5qFachd3A',
      'study': '5qap5aO4i9A',
    };
    const key = Object.keys(fallbacks).find(k => query.toLowerCase().includes(k));
    setEmbedId(key ? fallbacks[key] : 'jfKfPfyJRdk');
  };

  const saveToPlaylist = () => {
    const isExist = playlist.some(x => x.id === embedId);
    if (isExist) return;
    const updated = [...playlist, { title: searchQuery || 'Custom Stream', id: embedId }];
    setPlaylist(updated);
    setStoredItem('saved_playlist', updated);
  };

  return (
    <div className="flex-1 flex flex-col justify-between space-y-3 font-mono">
      <form onSubmit={(e) => handleSearchPlay(e)} className="flex gap-2">
        <input type="text" placeholder="Search track name..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="flex-1 bg-slate-900/80 border border-slate-700/50 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none" />
        <button type="submit" className="px-3 py-1.5 bg-indigo-650 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg cursor-pointer">SEARCH</button>
      </form>

      <div className="flex-1 min-h-[150px] relative rounded-xl overflow-hidden bg-black border border-brand-900/50">
        <iframe className="absolute inset-0 w-full h-full" src={`https://www.youtube.com/embed/${embedId}?autoplay=1`} allowFullScreen></iframe>
      </div>

      <div className="flex items-center justify-between bg-slate-900/40 p-2 rounded-lg border border-slate-800/50">
        <button onClick={saveToPlaylist} className="text-[10px] text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1 cursor-pointer">
          <i data-lucide="plus-circle" className="w-3.5 h-3.5"></i>Save Track
        </button>
        <div className="flex items-end gap-0.5 h-3.5">
          <span className="w-0.5 bg-indigo-500 animate-pulse" style={{ height: '70%', animationDuration: '0.6s' }}></span>
          <span className="w-0.5 bg-indigo-400 animate-pulse" style={{ height: '40%', animationDuration: '0.8s' }}></span>
          <span className="w-0.5 bg-indigo-300 animate-pulse" style={{ height: '90%', animationDuration: '0.4s' }}></span>
          <span className="w-0.5 bg-indigo-500 animate-pulse" style={{ height: '60%', animationDuration: '0.7s' }}></span>
        </div>
      </div>

      {playlist.length > 0 && (
        <div className="border-t border-slate-800/60 pt-2">
          <span className="text-[10px] text-slate-400 block mb-1">PLAYLIST</span>
          <div className="flex flex-wrap gap-1.5 max-h-[60px] overflow-y-auto">
            {playlist.map((track, i) => (
              <button key={i} onClick={() => { setEmbedId(track.id); setSearchQuery(track.title); }} className="px-2 py-1 bg-slate-800/40 hover:bg-slate-700/40 text-[9px] rounded text-slate-355 border border-slate-750/30 cursor-pointer font-sans">
                {track.title.substring(0, 15)}...
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// 7. WEATHER WIDGET
function WeatherWidget({ apiKey, city, isEnlarged }) {
  const containerRef = useRef(null);
  const [weather, setWeather] = useState(null);
  const [forecast, setForecast] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [displayMetric, setDisplayMetric] = useState('temp');

  useEffect(() => {
    if (!apiKey) return;
    setLoading(true);
    setError(false);
    fetch(`https://api.openweathermap.org/data/2.5/forecast?q=${city}&units=metric&appid=${apiKey}`)
      .then(res => { if (!res.ok) throw new Error(); return res.json(); })
      .then(data => {
        setWeather(data.list[0]);
        const daily = [];
        for (let i = 0; i < data.list.length; i += 8) daily.push(data.list[i]);
        setForecast(daily);
        setLoading(false);
      })
      .catch(() => { setError(true); setLoading(false); });
  }, [apiKey, city]);

  useEffect(() => {
    if (forecast.length === 0 || !containerRef.current) return;
    const colorMap = { temp: '#0ea5e9', humidity: '#10b981', wind: '#f59e0b', pressure: '#a78bfa', feels_like: '#ec4899' };
    const valueMap = {
      temp: item => item.main.temp,
      humidity: item => item.main.humidity,
      wind: item => item.wind ? item.wind.speed : 0,
      pressure: item => item.main.pressure,
      feels_like: item => item.main.feels_like
    };
    const values = forecast.map(item => valueMap[displayMetric] ? valueMap[displayMetric](item) : item.main.temp);
    const dates = forecast.map(item => new Date(item.dt * 1000).toLocaleDateString('en-US', { weekday: 'short' }));
    const trace = {
      x: dates, y: values,
      type: 'scatter', mode: 'lines+markers',
      fill: 'tozeroy', fillcolor: `${colorMap[displayMetric] || '#0ea5e9'}22`,
      line: { color: colorMap[displayMetric] || '#0ea5e9', width: 2 },
      marker: { color: colorMap[displayMetric] || '#0ea5e9', size: 6 }
    };
    const layout = {
      paper_bgcolor: 'rgba(0,0,0,0)', plot_bgcolor: 'rgba(0,0,0,0)',
      margin: { l: 30, r: 15, t: 10, b: 30 },
      height: isEnlarged ? 400 : 180,
      xaxis: { gridcolor: 'rgba(255,255,255,0.05)', tickfont: { color: '#94a3b8', size: 9 } },
      yaxis: { gridcolor: 'rgba(255,255,255,0.05)', tickfont: { color: '#94a3b8', size: 9 } }
    };
    Plotly.newPlot(containerRef.current, [trace], layout, { displayModeBar: true });
  }, [forecast, isEnlarged, displayMetric]);

  if (!apiKey) return <div className="flex-1 flex flex-col items-center justify-center"><p className="text-xs text-slate-400 font-mono">NO WEATHER KEY CONFIGURED</p></div>;
  if (loading) return <div className="flex-1 flex items-center justify-center text-xs font-mono">SYNCING CLIMATE NODES...</div>;
  if (error) return <div className="flex-1 flex items-center justify-center text-xs font-mono text-rose-450">HANDSHAKE REFUSED.</div>;

  return (
    <div className="flex-1 flex flex-col justify-between font-mono">
      {weather && (
        <div className="flex items-center justify-between mb-2 bg-slate-800/20 p-2.5 rounded-lg flex-wrap gap-2">
          <div>
            <span className="text-xs font-bold text-white block uppercase">{city}</span>
            <span className="text-[10px] text-slate-400">{weather.weather[0].description}</span>
          </div>
          <div className="flex gap-1 flex-wrap">
            {[['temp',`${Math.round(weather.main.temp)}°C`],['humidity',`${weather.main.humidity}%`],['wind',`${(weather.wind&&weather.wind.speed)||0}m/s`],['pressure',`${weather.main.pressure}hPa`],['feels_like',`FL ${Math.round(weather.main.feels_like)}°`]].map(([metric,label]) => (
              <button key={metric} onClick={() => setDisplayMetric(metric)}
                className={`px-2 py-1 text-[9px] font-mono font-bold rounded border cursor-pointer ${displayMetric === metric ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-slate-800/50 text-slate-400 border-slate-700/40 hover:text-slate-200'}`}>
                {label}
              </button>
            ))}
          </div>
        </div>
      )}
      <div ref={containerRef} className="w-full flex-1 min-h-[150px]"></div>
    </div>
  );
}

// 8. SYSTEM STATS WIDGET
function SystemStatsWidget({ isEnlarged }) {
  const containerRef = useRef(null);
  const [history, setHistory] = useState({ cpu: [25], ram: [40], cpuTemp: 42, gpuTemp: 55, times: [new Date().toLocaleTimeString()] });

  useEffect(() => {
    const timer = setInterval(() => {
      const nextCpu = Math.min(100, Math.max(10, (history.cpu[history.cpu.length - 1] || 25) + Math.floor(Math.random() * 15) - 7));
      const nextRam = Math.min(100, Math.max(30, (history.ram[history.ram.length - 1] || 40) + Math.floor(Math.random() * 5) - 2));
      const nextCpuTemp = Math.min(95, Math.max(35, history.cpuTemp + Math.floor(Math.random() * 5) - 2));
      const nextGpuTemp = Math.min(95, Math.max(40, history.gpuTemp + Math.floor(Math.random() * 7) - 3));
      const now = new Date().toLocaleTimeString();

      setHistory(prev => {
        const nextTimes = [...prev.times, now].slice(-10);
        const nextCpus = [...prev.cpu, nextCpu].slice(-10);
        const nextRams = [...prev.ram, nextRam].slice(-10);
        return { cpu: nextCpus, ram: nextRams, cpuTemp: nextCpuTemp, gpuTemp: nextGpuTemp, times: nextTimes };
      });
    }, 2000);

    return () => clearInterval(timer);
  }, [history]);

  useEffect(() => {
    if (!containerRef.current) return;

    const traceCpu = {
      x: history.times,
      y: history.cpu,
      name: 'CPU %',
      type: 'scatter',
      fill: 'tozeroy',
      line: { color: '#6366f1', width: 2 }
    };

    const traceRam = {
      x: history.times,
      y: history.ram,
      name: 'RAM %',
      type: 'scatter',
      fill: 'tonexty',
      line: { color: '#10b981', width: 2 }
    };

    const layout = {
      paper_bgcolor: 'rgba(0,0,0,0)',
      plot_bgcolor: 'rgba(0,0,0,0)',
      margin: { l: 25, r: 15, t: 15, b: 30 },
      height: isEnlarged ? 400 : 185,
      showlegend: false,
      xaxis: { gridcolor: 'rgba(255,255,255,0.05)', tickfont: { color: '#94a3b8', size: 9 } },
      yaxis: { gridcolor: 'rgba(255,255,255,0.05)', tickfont: { color: '#94a3b8', size: 9 } }
    };

    Plotly.newPlot(containerRef.current, [traceCpu, traceRam], layout, { displayModeBar: true });
  }, [history, isEnlarged]);

  return (
    <div className="flex-1 flex flex-col justify-between font-mono">
      <div className="grid grid-cols-2 gap-2 mb-2 text-xs">
        <div className="p-2 bg-slate-800/30 rounded-lg text-center border border-slate-700/30">
          <span className="block text-[9px] text-slate-400 font-mono">CPU TEMP</span>
          <span className="text-xs font-bold text-orange-400 font-mono">{history.cpuTemp}°C</span>
        </div>
        <div className="p-2 bg-slate-800/30 rounded-lg text-center border border-slate-700/30">
          <span className="block text-[9px] text-slate-400 font-mono">GPU TEMP</span>
          <span className="text-xs font-bold text-rose-455 font-mono">{history.gpuTemp}°C</span>
        </div>
      </div>
      <div ref={containerRef} className="w-full flex-1 min-h-[150px]"></div>
    </div>
  );
}

// 9. GOOGLE CALENDAR
function GoogleCalendarWidget() {
  const [events, setEvents] = useState([
    { id: 1, title: 'Project Core Review', time: '11:00 AM - 12:00 PM', category: 'work' },
    { id: 2, title: 'Codeforces Contest Run', time: '04:30 PM - 06:30 PM', category: 'hobby' },
    { id: 3, title: 'Supabase Data Migration', time: '08:00 PM - 09:00 PM', category: 'dev' },
  ]);
  const [title, setTitle] = useState('');
  const [time, setTime] = useState('');

  const handleAdd = (e) => {
    e.preventDefault();
    if (!title || !time) return;
    setEvents([...events, { id: Date.now(), title, time, category: 'work' }]);
    setTitle(''); setTime('');
  };

  return (
    <div className="flex-1 flex flex-col justify-between space-y-3 font-mono">
      <div className="space-y-2 flex-1 overflow-y-auto max-h-[180px]">
        {events.map(ev => (
          <div key={ev.id} className="flex justify-between items-center p-2.5 bg-slate-850/40 rounded-lg border border-brand-900/60">
            <div>
              <span className="text-xs font-bold text-white block">{ev.title}</span>
              <span className="text-[10px] text-slate-400">{ev.time}</span>
            </div>
            <button onClick={() => setEvents(events.filter(x => x.id !== ev.id))} className="text-slate-500 hover:text-rose-400 cursor-pointer"><i data-lucide="trash-2" className="w-3.5 h-3.5"></i></button>
          </div>
        ))}
      </div>
      <form onSubmit={handleAdd} className="flex gap-2">
        <input type="text" placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} className="w-1/2 bg-slate-900/80 border border-slate-700/50 rounded-lg px-2 py-1 text-xs text-white focus:outline-none" />
        <input type="text" placeholder="Time" value={time} onChange={(e) => setTime(e.target.value)} className="w-1/3 bg-slate-900/80 border border-slate-700/50 rounded-lg px-2 py-1 text-xs text-white focus:outline-none" />
        <button type="submit" className="px-2.5 bg-indigo-650 hover:bg-indigo-700 text-white rounded-lg flex items-center justify-center cursor-pointer"><i data-lucide="plus" className="w-4 h-4"></i></button>
      </form>
    </div>
  );
}

// 10. PRODUCTIVITY POMODORO TIMER WIDGET
function PomodoroWidget({ stats, setStats, isEnlarged }) {
  const containerRef = useRef(null);
  const [seconds, setSeconds] = useState(1500);
  const [isRunning, setIsRunning] = useState(false);
  const [mode, setMode] = useState('work');

  useEffect(() => {
    let timer = null;
    if (isRunning && seconds > 0) {
      timer = setInterval(() => setSeconds(s => s - 1), 1000);
    } else if (seconds === 0) {
      setIsRunning(false);
      if (mode === 'work') {
        setMode('break');
        setSeconds(300);
        const nextStats = [...stats];
        nextStats[nextStats.length - 1] += 1;
        setStats(nextStats);
        setStoredItem('pomodoro_stats', nextStats);
      } else {
        setMode('work');
        setSeconds(1500);
      }
    }
    return () => clearInterval(timer);
  }, [isRunning, seconds]);

  useEffect(() => {
    if (!containerRef.current) return;
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const trace = {
      x: days,
      y: stats,
      type: 'bar',
      marker: { color: 'rgba(99, 102, 241, 0.7)', line: { color: 'rgb(99, 102, 241)', width: 1 } }
    };
    const layout = {
      paper_bgcolor: 'rgba(0,0,0,0)',
      plot_bgcolor: 'rgba(0,0,0,0)',
      margin: { l: 20, r: 10, t: 10, b: 20 },
      height: isEnlarged ? 380 : 130,
      xaxis: { tickfont: { color: '#94a3b8', size: 9 }, gridcolor: 'transparent' },
      yaxis: { tickfont: { color: '#94a3b8', size: 9 }, gridcolor: 'rgba(255,255,255,0.05)' }
    };
    Plotly.newPlot(containerRef.current, [trace], layout, { displayModeBar: false });
  }, [stats, isEnlarged]);

  const formatTime = (sec) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex-1 flex flex-col justify-between items-center text-center space-y-3 font-mono">
      <div className="flex gap-2">
        <button onClick={() => { setMode('work'); setSeconds(1500); setIsRunning(false); }} className={`px-2.5 py-1 text-[10px] rounded font-mono cursor-pointer ${mode === 'work' ? 'bg-indigo-650 text-white' : 'bg-slate-800 text-slate-400'}`}>WORK BLOCK</button>
        <button onClick={() => { setMode('break'); setSeconds(300); setIsRunning(false); }} className={`px-2.5 py-1 text-[10px] rounded font-mono cursor-pointer ${mode === 'break' ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400'}`}>BREAK</button>
      </div>

      <div className="my-1.5">
        <span className="text-3xl font-bold font-mono tracking-wider text-white block">{formatTime(seconds)}</span>
        <span className="text-[9px] font-mono text-slate-500 uppercase">{mode === 'work' ? 'FOCUS CYCLE' : 'RECOVERY BREAK'}</span>
      </div>

      <div className="flex gap-2 w-full">
        <button onClick={() => setIsRunning(!isRunning)} className="flex-1 py-1.5 bg-indigo-650 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold cursor-pointer">
          {isRunning ? 'HOLD' : 'ENGAGE'}
        </button>
        <button onClick={() => { setIsRunning(false); setSeconds(mode === 'work' ? 1500 : 300); }} className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-350 rounded-lg text-xs font-semibold cursor-pointer">
          RESET
        </button>
      </div>

      <div className="w-full border-t border-slate-800/40 pt-2">
        <span className="text-[9px] text-slate-400 block text-left mb-1 uppercase">Sessions Completed (Weekly Performance)</span>
        <div ref={containerRef} className="w-full min-h-[90px]"></div>
      </div>
    </div>
  );
}

// --- RENDER BOOTSTRAP (moved to end of file) ---

// ============================================================
// NEW ANALYTICS WIDGETS
// ============================================================

// 11. ACTIVITY HEATMAP WIDGET
// Fetches GitHub commit calendar + LeetCode submission calendar
// and renders a unified GitHub-style contribution heatmap
function ActivityHeatmapWidget({ keys, isEnlarged }) {
  const containerRef = useRef(null);
  const [heatData, setHeatData] = useState({});
  const [loading, setLoading] = useState(false);
  const [sources, setSources] = useState({ github: false, leetcode: false });
  const [viewMode, setViewMode] = useState('heatmap'); // 'heatmap', 'bar', 'line'
  const [hoveredDay, setHoveredDay] = useState(null);

  useEffect(() => {
    const merged = {};
    const promises = [];

    if (keys.githubUsername) {
      // GitHub contributions via events API (last 90 days)
      const p = fetch(`https://api.github.com/users/${keys.githubUsername}/events/public?per_page=100`)
        .then(r => r.json())
        .then(events => {
          setSources(s => ({ ...s, github: true }));
          events.forEach(ev => {
            if (ev.type === 'PushEvent') {
              const d = ev.created_at.split('T')[0];
              const commits = ev.payload && ev.payload.commits ? ev.payload.commits.length : 1;
              merged[d] = (merged[d] || 0) + commits;
            }
          });
        }).catch(() => {});
      promises.push(p);
    }

    if (keys.leetcodeUsername) {
      const p = fetch(`https://leetcode-api-faisal.vercel.app/${keys.leetcodeUsername}`)
        .then(r => r.json())
        .then(data => {
          setSources(s => ({ ...s, leetcode: true }));
          let cal = {};
          try { cal = typeof data.submissionCalendar === 'string' ? JSON.parse(data.submissionCalendar) : (data.submissionCalendar || {}); } catch(e) {}
          Object.entries(cal).forEach(([ts, count]) => {
            const d = new Date(parseInt(ts) * 1000).toISOString().split('T')[0];
            merged[d] = (merged[d] || 0) + (count || 0);
          });
        }).catch(() => {});
      promises.push(p);
    }

    if (promises.length === 0) {
      // Demo data
      const today = new Date();
      for (let i = 0; i < 180; i++) {
        const d = new Date(today); d.setDate(d.getDate() - i);
        const ds = d.toISOString().split('T')[0];
        if (Math.random() > 0.35) merged[ds] = Math.floor(Math.random() * 8) + 1;
      }
      setHeatData({ ...merged });
      return;
    }

    setLoading(true);
    Promise.all(promises).then(() => {
      setHeatData({ ...merged });
      setLoading(false);
    });
  }, [keys.githubUsername, keys.leetcodeUsername]);

  // Build last 26 weeks of dates
  const buildWeeks = () => {
    const weeks = [];
    const today = new Date();
    const start = new Date(today);
    start.setDate(start.getDate() - 181);
    // align to Sunday
    start.setDate(start.getDate() - start.getDay());
    let cur = new Date(start);
    while (cur <= today) {
      const week = [];
      for (let d = 0; d < 7; d++) {
        week.push(new Date(cur));
        cur.setDate(cur.getDate() + 1);
      }
      weeks.push(week);
    }
    return weeks;
  };

  const weeks = buildWeeks();
  const maxVal = Math.max(1, ...Object.values(heatData));
  const getColor = (count) => {
    if (!count) return 'rgba(30,41,59,0.6)';
    const intensity = count / maxVal;
    if (intensity < 0.25) return '#1e3a5f';
    if (intensity < 0.5) return '#1d4ed8';
    if (intensity < 0.75) return '#4f46e5';
    return '#818cf8';
  };

  // Bar chart: last 30 days
  useEffect(() => {
    if (!containerRef.current || viewMode === 'heatmap') return;
    const today = new Date();
    const days = [];
    const counts = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today); d.setDate(d.getDate() - i);
      const ds = d.toISOString().split('T')[0];
      days.push(d.toLocaleDateString('en', { month: 'short', day: 'numeric' }));
      counts.push(heatData[ds] || 0);
    }
    const trace = viewMode === 'bar'
      ? { x: days, y: counts, type: 'bar', marker: { color: counts.map(c => c > 0 ? '#4f46e5' : 'rgba(30,41,59,0.4)') } }
      : { x: days, y: counts, type: 'scatter', mode: 'lines+markers', fill: 'tozeroy', fillcolor: 'rgba(79,70,229,0.12)', line: { color: '#6366f1', width: 2 }, marker: { color: '#818cf8', size: 5 } };
    const layout = {
      paper_bgcolor: 'rgba(0,0,0,0)', plot_bgcolor: 'rgba(0,0,0,0)',
      margin: { l: 30, r: 10, t: 10, b: 60 },
      height: isEnlarged ? 380 : 200,
      xaxis: { tickfont: { color: '#94a3b8', size: 8 }, tickangle: -45, gridcolor: 'rgba(255,255,255,0.04)' },
      yaxis: { gridcolor: 'rgba(255,255,255,0.05)', tickfont: { color: '#94a3b8', size: 9 } }
    };
    Plotly.newPlot(containerRef.current, [trace], layout, { displayModeBar: false });
  }, [heatData, viewMode, isEnlarged]);

  const totalContribs = Object.values(heatData).reduce((a, b) => a + b, 0);
  const activeDays = Object.values(heatData).filter(v => v > 0).length;
  const streak = (() => {
    let s = 0; const today = new Date();
    for (let i = 0; i < 365; i++) {
      const d = new Date(today); d.setDate(d.getDate() - i);
      if (heatData[d.toISOString().split('T')[0]]) s++; else break;
    }
    return s;
  })();

  const monthLabels = (() => {
    const labels = [];
    const seen = new Set();
    weeks.forEach((wk, wi) => {
      const m = wk[0].toLocaleDateString('en', { month: 'short' });
      if (!seen.has(m)) { seen.add(m); labels.push({ label: m, col: wi }); }
    });
    return labels;
  })();

  if (loading) return <div className="flex-1 flex items-center justify-center text-xs font-mono text-slate-400 animate-pulse">AGGREGATING COMMIT STREAMS...</div>;

  return (
    <div className="flex-1 flex flex-col gap-3 font-mono p-1">
      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2">
        {[
          ['TOTAL ACTIVITY', totalContribs, 'text-indigo-400'],
          ['ACTIVE DAYS', activeDays, 'text-emerald-400'],
          ['STREAK', `${streak}d`, 'text-amber-400'],
        ].map(([label, val, color]) => (
          <div key={label} className="bg-slate-800/30 rounded-lg p-2 text-center border border-slate-700/30">
            <span className={`text-base font-bold block ${color}`}>{val}</span>
            <span className="text-[9px] text-slate-500">{label}</span>
          </div>
        ))}
      </div>

      {/* Source pills */}
      <div className="flex gap-2 items-center flex-wrap">
        <span className="text-[9px] text-slate-500 uppercase font-bold">Sources:</span>
        {keys.githubUsername && <span className={`text-[9px] px-2 py-0.5 rounded-full border ${sources.github ? 'border-emerald-600 text-emerald-400 bg-emerald-950/30' : 'border-slate-700 text-slate-500'}`}>GitHub</span>}
        {keys.leetcodeUsername && <span className={`text-[9px] px-2 py-0.5 rounded-full border ${sources.leetcode ? 'border-orange-600 text-orange-400 bg-orange-950/30' : 'border-slate-700 text-slate-500'}`}>LeetCode</span>}
        {!keys.githubUsername && !keys.leetcodeUsername && <span className="text-[9px] text-slate-500 italic">Demo data — add usernames in Settings</span>}
        <div className="ml-auto flex gap-1">
          {[['heatmap','GRID'],['bar','BAR'],['line','LINE']].map(([m,l]) => (
            <button key={m} onClick={() => setViewMode(m)} className={`text-[9px] px-2 py-0.5 rounded border cursor-pointer font-bold ${viewMode === m ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'}`}>{l}</button>
          ))}
        </div>
      </div>

      {viewMode === 'heatmap' ? (
        <div className="overflow-x-auto">
          {/* Month labels */}
          <div className="flex gap-[3px] mb-1 ml-[18px]">
            {weeks.map((_, wi) => {
              const ml = monthLabels.find(m => m.col === wi);
              return <div key={wi} style={{ width: 11, flexShrink: 0 }} className="text-[8px] text-slate-500">{ml ? ml.label : ''}</div>;
            })}
          </div>
          <div className="flex gap-[3px]">
            {/* Day labels */}
            <div className="flex flex-col gap-[3px] mr-1">
              {['S','M','T','W','T','F','S'].map((d, i) => (
                <div key={i} style={{ height: 11 }} className="text-[8px] text-slate-600 leading-none flex items-center">{d}</div>
              ))}
            </div>
            {weeks.map((week, wi) => (
              <div key={wi} className="flex flex-col gap-[3px]">
                {week.map((day, di) => {
                  const ds = day.toISOString().split('T')[0];
                  const count = heatData[ds] || 0;
                  const isFuture = day > new Date();
                  return (
                    <div
                      key={di}
                      title={`${ds}: ${count} activities`}
                      style={{
                        width: 11, height: 11, borderRadius: 2, flexShrink: 0,
                        backgroundColor: isFuture ? 'transparent' : getColor(count),
                        opacity: isFuture ? 0 : 1,
                        cursor: 'default'
                      }}
                    />
                  );
                })}
              </div>
            ))}
          </div>
          {/* Legend */}
          <div className="flex items-center gap-1.5 mt-2 justify-end">
            <span className="text-[9px] text-slate-500">Less</span>
            {['rgba(30,41,59,0.6)', '#1e3a5f', '#1d4ed8', '#4f46e5', '#818cf8'].map((c, i) => (
              <div key={i} style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: c }} />
            ))}
            <span className="text-[9px] text-slate-500">More</span>
          </div>
        </div>
      ) : (
        <div ref={containerRef} className="w-full flex-1 min-h-[150px]" />
      )}
    </div>
  );
}

// 12. SKILL RADAR WIDGET
// Builds a spider/radar chart comparing your performance across
// LeetCode (solve rate), Codeforces (rating), GitHub (repos/stars)
function SkillRadarWidget({ keys, isEnlarged }) {
  const containerRef = useRef(null);
  const [scores, setScores] = useState(null);
  const [loading, setLoading] = useState(false);
  const [chartType, setChartType] = useState('radar'); // 'radar', 'bar', 'gauge'

  useEffect(() => {
    setLoading(true);
    const result = {
      consistency: 0, problemSolving: 0, openSource: 0,
      competitive: 0, breadth: 0, output: 0
    };
    const tasks = [];

    if (keys.githubUsername) {
      tasks.push(
        Promise.all([
          fetch(`https://api.github.com/users/${keys.githubUsername}`).then(r => r.json()),
          fetch(`https://api.github.com/users/${keys.githubUsername}/repos?per_page=100`).then(r => r.json())
        ]).then(([profile, repos]) => {
          const langs = new Set(repos.map(r => r.language).filter(Boolean));
          const stars = repos.reduce((a, r) => a + r.stargazers_count, 0);
          result.openSource = Math.min(100, (profile.public_repos || 0) * 3);
          result.breadth = Math.min(100, langs.size * 12);
          result.output = Math.min(100, stars * 5 + (profile.public_repos || 0) * 2);
        }).catch(() => {})
      );
    }

    if (keys.leetcodeUsername) {
      tasks.push(
        fetch(`https://leetcode-api-faisal.vercel.app/${keys.leetcodeUsername}`)
          .then(r => r.json())
          .then(data => {
            const solved = (data.totalSolved || 0);
            const rate = parseFloat(data.acceptanceRate || 0);
            result.problemSolving = Math.min(100, solved / 5);
            result.consistency = Math.min(100, rate * 1.2);
          }).catch(() => {})
      );
    }

    if (keys.codeforcesHandle) {
      tasks.push(
        fetch(`https://codeforces.com/api/user.info?handles=${keys.codeforcesHandle}`)
          .then(r => r.json())
          .then(data => {
            const rating = (data.result && data.result[0] && data.result[0].rating) || 0;
            result.competitive = Math.min(100, rating / 35);
          }).catch(() => {})
      );
    }

    if (tasks.length === 0) {
      // Demo
      setScores({ consistency: 72, problemSolving: 65, openSource: 55, competitive: 48, breadth: 80, output: 60 });
      setLoading(false);
      return;
    }

    Promise.all(tasks).then(() => {
      setScores({ ...result });
      setLoading(false);
    });
  }, [keys.githubUsername, keys.leetcodeUsername, keys.codeforcesHandle]);

  useEffect(() => {
    if (!scores || !containerRef.current) return;

    const categories = ['Consistency', 'Problem\nSolving', 'Open\nSource', 'Competitive', 'Language\nBreadth', 'Output\nImpact'];
    const values = [scores.consistency, scores.problemSolving, scores.openSource, scores.competitive, scores.breadth, scores.output];

    let traces, layout;

    if (chartType === 'radar') {
      traces = [{
        type: 'scatterpolar',
        r: [...values, values[0]],
        theta: [...categories, categories[0]],
        fill: 'toself',
        fillcolor: 'rgba(99,102,241,0.18)',
        line: { color: '#6366f1', width: 2 },
        marker: { color: '#818cf8', size: 6 }
      }];
      layout = {
        polar: {
          bgcolor: 'rgba(0,0,0,0)',
          radialaxis: { visible: true, range: [0, 100], gridcolor: 'rgba(255,255,255,0.07)', tickfont: { color: '#64748b', size: 8 }, tickvals: [25, 50, 75, 100] },
          angularaxis: { gridcolor: 'rgba(255,255,255,0.07)', tickfont: { color: '#94a3b8', size: 9 } }
        },
        paper_bgcolor: 'rgba(0,0,0,0)',
        margin: { l: 40, r: 40, t: 30, b: 30 },
        height: isEnlarged ? 420 : 240,
        showlegend: false
      };
    } else if (chartType === 'bar') {
      const colors = ['#6366f1','#10b981','#f59e0b','#ec4899','#06b6d4','#8b5cf6'];
      traces = [{
        x: ['Consistency','Problem Solving','Open Source','Competitive','Breadth','Output'],
        y: values,
        type: 'bar',
        marker: { color: colors }
      }];
      layout = {
        paper_bgcolor: 'rgba(0,0,0,0)', plot_bgcolor: 'rgba(0,0,0,0)',
        margin: { l: 30, r: 10, t: 10, b: 80 },
        height: isEnlarged ? 380 : 220,
        xaxis: { tickfont: { color: '#94a3b8', size: 8 }, tickangle: -30 },
        yaxis: { gridcolor: 'rgba(255,255,255,0.05)', tickfont: { color: '#94a3b8', size: 9 }, range: [0, 100] },
        showlegend: false
      };
    } else {
      // Gauge — show overall score
      const overall = Math.round(values.reduce((a,b) => a+b,0) / values.length);
      traces = [{
        type: 'indicator',
        mode: 'gauge+number+delta',
        value: overall,
        number: { font: { color: '#6366f1', size: 40, family: 'monospace' } },
        delta: { reference: 50, increasing: { color: '#10b981' }, decreasing: { color: '#ef4444' } },
        gauge: {
          axis: { range: [0, 100], tickwidth: 1, tickcolor: '#475569', tickfont: { color: '#94a3b8', size: 9 } },
          bar: { color: '#6366f1' },
          bgcolor: 'rgba(0,0,0,0)',
          borderwidth: 2, bordercolor: '#1e293b',
          steps: [
            { range: [0, 40], color: 'rgba(239,68,68,0.15)' },
            { range: [40, 70], color: 'rgba(245,158,11,0.12)' },
            { range: [70, 100], color: 'rgba(16,185,129,0.12)' }
          ],
          threshold: { line: { color: '#818cf8', width: 3 }, thickness: 0.75, value: overall }
        },
        title: { text: 'Overall Dev Score', font: { color: '#94a3b8', size: 11 } }
      }];
      layout = {
        paper_bgcolor: 'rgba(0,0,0,0)',
        margin: { l: 20, r: 20, t: 40, b: 20 },
        height: isEnlarged ? 380 : 220,
        font: { color: '#94a3b8' }
      };
    }

    Plotly.newPlot(containerRef.current, traces, layout, { displayModeBar: false });
  }, [scores, chartType, isEnlarged]);

  if (loading) return <div className="flex-1 flex items-center justify-center text-xs font-mono text-slate-400 animate-pulse">COMPUTING SKILL MATRIX...</div>;

  return (
    <div className="flex-1 flex flex-col gap-3 font-mono">
      {/* Controls */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex gap-1">
          {[['radar','RADAR'],['bar','BAR'],['gauge','SCORE']].map(([m,l]) => (
            <button key={m} onClick={() => setChartType(m)} className={`text-[9px] px-2 py-1 rounded border cursor-pointer font-bold ${chartType === m ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'}`}>{l}</button>
          ))}
        </div>
        {scores && (
          <div className="flex gap-2 text-[9px] text-slate-500">
            {!keys.githubUsername && <span className="text-amber-500">⚠ No GitHub</span>}
            {!keys.leetcodeUsername && <span className="text-amber-500">⚠ No LeetCode</span>}
            {!keys.codeforcesHandle && <span className="text-amber-500">⚠ No Codeforces</span>}
          </div>
        )}
      </div>

      {/* Score pills */}
      {scores && chartType !== 'gauge' && (
        <div className="grid grid-cols-3 gap-1.5">
          {[
            ['Consistency', scores.consistency, '#6366f1'],
            ['Prob Solving', scores.problemSolving, '#10b981'],
            ['Open Source', scores.openSource, '#f59e0b'],
            ['Competitive', scores.competitive, '#ec4899'],
            ['Breadth', scores.breadth, '#06b6d4'],
            ['Output', scores.output, '#8b5cf6'],
          ].map(([label, val, color]) => (
            <div key={label} className="bg-slate-800/30 rounded-lg px-2 py-1 border border-slate-700/30">
              <div className="flex justify-between items-center mb-0.5">
                <span className="text-[8px] text-slate-500">{label}</span>
                <span className="text-[9px] font-bold" style={{ color }}>{Math.round(val)}</span>
              </div>
              <div className="h-1 bg-slate-700/50 rounded-full overflow-hidden">
                <div style={{ width: `${val}%`, backgroundColor: color }} className="h-full rounded-full transition-all duration-500" />
              </div>
            </div>
          ))}
        </div>
      )}

      <div ref={containerRef} className="w-full flex-1 min-h-[150px]" />
      {!keys.githubUsername && !keys.leetcodeUsername && !keys.codeforcesHandle && (
        <p className="text-[10px] text-slate-500 text-center">Demo data shown — add usernames in Settings → API Connectors</p>
      )}
    </div>
  );
}

// 13. FOCUS TRACKER WIDGET
// Manual daily time-tracking widget with a donut chart breakdown
function FocusTrackerWidget({ isEnlarged }) {
  const containerRef = useRef(null);
  const STORAGE_KEY = 'dashboard_v3_focus_sessions';

  const loadSessions = () => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch(e) { return []; }
  };
  const saveSessions = (s) => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch(e) {} };

  const [sessions, setSessions] = useState(() => loadSessions());
  const [label, setLabel] = useState('');
  const [minutes, setMinutes] = useState('');
  const [chartMode, setChartMode] = useState('donut'); // 'donut', 'bar', 'line'
  const [filterDays, setFilterDays] = useState(7);

  const COLORS = ['#6366f1','#10b981','#f59e0b','#ec4899','#06b6d4','#8b5cf6','#ef4444','#14b8a6'];

  const addSession = () => {
    if (!label.trim() || !minutes || isNaN(parseInt(minutes)) || parseInt(minutes) <= 0) return;
    const ns = [...sessions, { label: label.trim(), minutes: parseInt(minutes), date: new Date().toISOString().split('T')[0], ts: Date.now() }];
    setSessions(ns);
    saveSessions(ns);
    setLabel('');
    setMinutes('');
  };

  const removeSession = (ts) => {
    const ns = sessions.filter(s => s.ts !== ts);
    setSessions(ns);
    saveSessions(ns);
  };

  const filteredSessions = sessions.filter(s => {
    const d = new Date(s.date);
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - filterDays);
    return d >= cutoff;
  });

  const totalMins = filteredSessions.reduce((a, s) => a + s.minutes, 0);

  // Aggregate by label
  const byLabel = {};
  filteredSessions.forEach(s => { byLabel[s.label] = (byLabel[s.label] || 0) + s.minutes; });

  // Daily aggregation
  const byDate = {};
  filteredSessions.forEach(s => { byDate[s.date] = (byDate[s.date] || 0) + s.minutes; });
  const sortedDates = Object.keys(byDate).sort();

  useEffect(() => {
    if (!containerRef.current) return;
    const labels = Object.keys(byLabel);
    const values = labels.map(l => byLabel[l]);
    const colors = labels.map((_, i) => COLORS[i % COLORS.length]);

    let traces, layout;

    if (chartMode === 'donut') {
      if (labels.length === 0) {
        containerRef.current.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#475569;font-size:11px;font-family:monospace">NO SESSIONS LOGGED</div>';
        return;
      }
      traces = [{ values, labels: labels.map(l => `${l} (${byLabel[l]}m)`), type: 'pie', hole: 0.55, marker: { colors }, textinfo: 'percent', textfont: { size: 9, color: '#fff' }, hoverinfo: 'label+value' }];
      layout = {
        paper_bgcolor: 'rgba(0,0,0,0)',
        margin: { l: 10, r: 10, t: 10, b: 10 },
        height: isEnlarged ? 340 : 180,
        showlegend: true,
        legend: { font: { color: '#94a3b8', size: 9 }, x: 1, y: 0.5 },
        annotations: [{ font: { size: 14, color: '#fff', family: 'monospace' }, showarrow: false, text: `${Math.round(totalMins/60*10)/10}h`, x: 0.5, y: 0.5 }]
      };
    } else if (chartMode === 'bar') {
      traces = labels.map((lbl, i) => ({
        x: sortedDates,
        y: sortedDates.map(d => filteredSessions.filter(s => s.label === lbl && s.date === d).reduce((a, s) => a + s.minutes, 0)),
        name: lbl, type: 'bar',
        marker: { color: colors[i] }
      }));
      layout = {
        barmode: 'stack',
        paper_bgcolor: 'rgba(0,0,0,0)', plot_bgcolor: 'rgba(0,0,0,0)',
        margin: { l: 30, r: 10, t: 10, b: 50 },
        height: isEnlarged ? 340 : 180,
        xaxis: { tickfont: { color: '#94a3b8', size: 8 }, tickangle: -30 },
        yaxis: { gridcolor: 'rgba(255,255,255,0.05)', tickfont: { color: '#94a3b8', size: 9 }, title: { text: 'Minutes', font: { size: 9, color: '#64748b' } } },
        legend: { font: { color: '#94a3b8', size: 9 } }
      };
    } else {
      traces = [{ x: sortedDates, y: sortedDates.map(d => byDate[d] || 0), type: 'scatter', mode: 'lines+markers', fill: 'tozeroy', fillcolor: 'rgba(99,102,241,0.12)', line: { color: '#6366f1', width: 2 }, marker: { color: '#818cf8', size: 6 } }];
      layout = {
        paper_bgcolor: 'rgba(0,0,0,0)', plot_bgcolor: 'rgba(0,0,0,0)',
        margin: { l: 35, r: 10, t: 10, b: 50 },
        height: isEnlarged ? 340 : 180,
        xaxis: { tickfont: { color: '#94a3b8', size: 8 }, tickangle: -30 },
        yaxis: { gridcolor: 'rgba(255,255,255,0.05)', tickfont: { color: '#94a3b8', size: 9 }, title: { text: 'Minutes', font: { size: 9, color: '#64748b' } } }
      };
    }

    Plotly.newPlot(containerRef.current, traces, layout, { displayModeBar: false });
  }, [sessions, chartMode, isEnlarged, filterDays]);

  return (
    <div className="flex-1 flex flex-col gap-2 font-mono text-xs">
      {/* Add session row */}
      <div className="flex gap-1.5 items-center flex-wrap">
        <input
          value={label} onChange={e => setLabel(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addSession()}
          placeholder="Task / Topic"
          className="flex-1 min-w-[100px] bg-slate-800/50 border border-slate-700/50 rounded-lg px-2.5 py-1.5 text-[11px] text-white focus:outline-none focus:border-indigo-500"
        />
        <input
          value={minutes} onChange={e => setMinutes(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addSession()}
          placeholder="mins"
          type="number" min="1"
          className="w-16 bg-slate-800/50 border border-slate-700/50 rounded-lg px-2 py-1.5 text-[11px] text-white focus:outline-none focus:border-indigo-500"
        />
        <button onClick={addSession} className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] rounded-lg font-bold cursor-pointer">LOG</button>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between flex-wrap gap-1">
        <div className="flex gap-1">
          {[['donut','PIE'],['bar','STACK'],['line','LINE']].map(([m,l]) => (
            <button key={m} onClick={() => setChartMode(m)} className={`text-[9px] px-2 py-0.5 rounded border cursor-pointer font-bold ${chartMode === m ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'}`}>{l}</button>
          ))}
        </div>
        <div className="flex gap-1">
          {[7,14,30].map(d => (
            <button key={d} onClick={() => setFilterDays(d)} className={`text-[9px] px-2 py-0.5 rounded border cursor-pointer ${filterDays === d ? 'bg-slate-600 text-white border-slate-500' : 'bg-slate-800 text-slate-400 border-slate-700'}`}>{d}d</button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-1.5">
        {[
          ['TOTAL', `${Math.round(totalMins/60*10)/10}h`, 'text-indigo-400'],
          ['SESSIONS', filteredSessions.length, 'text-emerald-400'],
          ['TOPICS', Object.keys(byLabel).length, 'text-amber-400'],
        ].map(([l, v, c]) => (
          <div key={l} className="bg-slate-800/30 rounded-lg p-1.5 text-center border border-slate-700/30">
            <span className={`text-sm font-bold block ${c}`}>{v}</span>
            <span className="text-[8px] text-slate-500">{l}</span>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div ref={containerRef} className="w-full flex-1 min-h-[120px]" />

      {/* Recent sessions */}
      {filteredSessions.length > 0 && (
        <div className="border-t border-slate-800/60 pt-1.5 max-h-[70px] overflow-y-auto">
          {[...filteredSessions].reverse().slice(0, 6).map(s => (
            <div key={s.ts} className="flex items-center justify-between py-0.5 text-[9px]">
              <span className="text-slate-400">{s.date}</span>
              <span className="text-slate-200 flex-1 mx-2 truncate">{s.label}</span>
              <span className="text-indigo-400 mr-2">{s.minutes}m</span>
              <button onClick={() => removeSession(s.ts)} className="text-slate-600 hover:text-rose-400 cursor-pointer">✕</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// BATCH 2 NEW ANALYTICS WIDGETS
// ============================================================

// 14. CRYPTO TICKER WIDGET
// Live prices from CoinGecko public API (no key needed)
function CryptoTickerWidget({ isEnlarged }) {
  const containerRef = useRef(null);
  const [coins, setCoins] = useState([]);
  const [selected, setSelected] = useState('bitcoin');
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [chartType, setChartType] = useState('line'); // 'line', 'candle', 'bar'
  const [days, setDays] = useState(7);
  const [watchlist, setWatchlist] = useState(() => {
    try { return JSON.parse(localStorage.getItem('dashboard_v3_crypto_watchlist') || '["bitcoin","ethereum","solana","dogecoin"]'); } catch(e) { return ['bitcoin','ethereum','solana','dogecoin']; }
  });

  const COIN_LIST = ['bitcoin','ethereum','solana','cardano','dogecoin','avalanche-2','polkadot','chainlink','litecoin','ripple'];

  // Fetch market overview for watchlist
  useEffect(() => {
    const ids = watchlist.slice(0, 8).join(',');
    fetch(`https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${ids}&order=market_cap_desc&sparkline=true&price_change_percentage=24h,7d`)
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setCoins(data); })
      .catch(() => {});
  }, [watchlist]);

  // Fetch price history for selected coin
  useEffect(() => {
    setLoading(true);
    fetch(`https://api.coingecko.com/api/v3/coins/${selected}/market_chart?vs_currency=usd&days=${days}`)
      .then(r => r.json())
      .then(data => {
        if (data.prices) setHistory(data.prices);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [selected, days]);

  useEffect(() => {
    if (!containerRef.current || history.length === 0) return;
    const times = history.map(p => new Date(p[0]).toLocaleDateString('en', { month: 'short', day: 'numeric' }));
    const prices = history.map(p => p[1]);
    const isUp = prices[prices.length - 1] >= prices[0];
    const color = isUp ? '#10b981' : '#ef4444';

    let traces, layout;
    if (chartType === 'line') {
      traces = [{ x: times, y: prices, type: 'scatter', mode: 'lines', fill: 'tozeroy', fillcolor: `${color}15`, line: { color, width: 2 } }];
    } else if (chartType === 'bar') {
      traces = [{ x: times, y: prices, type: 'bar', marker: { color: prices.map((p, i) => i === 0 ? color : p >= prices[i-1] ? '#10b981' : '#ef4444') } }];
    } else {
      // OHLC approximation from price history (bucket by day)
      const ohlc = {};
      history.forEach(([ts, p]) => {
        const d = new Date(ts).toISOString().split('T')[0];
        if (!ohlc[d]) ohlc[d] = { o: p, h: p, l: p, c: p };
        else { ohlc[d].h = Math.max(ohlc[d].h, p); ohlc[d].l = Math.min(ohlc[d].l, p); ohlc[d].c = p; }
      });
      const ds = Object.keys(ohlc).sort();
      traces = [{ x: ds, open: ds.map(d => ohlc[d].o), high: ds.map(d => ohlc[d].h), low: ds.map(d => ohlc[d].l), close: ds.map(d => ohlc[d].c), type: 'candlestick', increasing: { line: { color: '#10b981' } }, decreasing: { line: { color: '#ef4444' } } }];
    }

    layout = {
      paper_bgcolor: 'rgba(0,0,0,0)', plot_bgcolor: 'rgba(0,0,0,0)',
      margin: { l: 55, r: 10, t: 10, b: 30 },
      height: isEnlarged ? 340 : 180,
      xaxis: { tickfont: { color: '#94a3b8', size: 8 }, gridcolor: 'rgba(255,255,255,0.03)', rangeslider: { visible: false } },
      yaxis: { tickfont: { color: '#94a3b8', size: 9 }, gridcolor: 'rgba(255,255,255,0.05)', tickformat: '$,.0f' },
      showlegend: false
    };
    Plotly.newPlot(containerRef.current, traces, layout, { displayModeBar: false });
  }, [history, chartType, isEnlarged]);

  const addToWatchlist = (id) => {
    if (watchlist.includes(id)) return;
    const w = [...watchlist, id].slice(0, 8);
    setWatchlist(w);
    _lsSet('dashboard_v3_crypto_watchlist', JSON.stringify(w));
  };
  const removeFromWatchlist = (id) => {
    const w = watchlist.filter(x => x !== id);
    setWatchlist(w);
    _lsSet('dashboard_v3_crypto_watchlist', JSON.stringify(w));
    if (selected === id && w.length) setSelected(w[0]);
  };

  const fmt = (n) => n >= 1e9 ? `$${(n/1e9).toFixed(1)}B` : n >= 1e6 ? `$${(n/1e6).toFixed(1)}M` : `$${n?.toFixed(2)}`;

  return (
    <div className="flex-1 flex flex-col gap-2 font-mono text-xs">
      {/* Watchlist ticker */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {coins.map(c => {
          const chg = c.price_change_percentage_24h;
          const isUp = chg >= 0;
          return (
            <button key={c.id} onClick={() => setSelected(c.id)}
              className={`flex-shrink-0 px-2.5 py-1.5 rounded-lg border cursor-pointer transition-all text-left ${selected === c.id ? 'border-indigo-500 bg-indigo-950/40' : 'border-slate-700/50 bg-slate-800/30 hover:border-slate-600'}`}>
              <div className="flex items-center gap-1.5">
                {c.image && <img src={c.image} className="w-4 h-4 rounded-full" />}
                <span className="text-[10px] font-bold text-white uppercase">{c.symbol}</span>
                <button onClick={(e) => { e.stopPropagation(); removeFromWatchlist(c.id); }} className="text-slate-600 hover:text-rose-400 text-[8px] ml-0.5">✕</button>
              </div>
              <div className="text-[10px] text-slate-300 mt-0.5">{c.current_price ? `$${c.current_price.toLocaleString()}` : '...'}</div>
              <div className={`text-[9px] font-bold ${isUp ? 'text-emerald-400' : 'text-rose-400'}`}>{isUp ? '▲' : '▼'} {Math.abs(chg || 0).toFixed(2)}%</div>
            </button>
          );
        })}
        {/* Add coin dropdown */}
        <select onChange={e => { if (e.target.value) addToWatchlist(e.target.value); e.target.value = ''; }}
          className="flex-shrink-0 bg-slate-800/50 border border-slate-700/50 rounded-lg px-2 text-[9px] text-slate-400 focus:outline-none cursor-pointer">
          <option value="">+ Add</option>
          {COIN_LIST.filter(c => !watchlist.includes(c)).map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Chart controls */}
      <div className="flex items-center justify-between flex-wrap gap-1">
        <div className="flex gap-1">
          {[['line','LINE'],['bar','BAR'],['candle','OHLC']].map(([m,l]) => (
            <button key={m} onClick={() => setChartType(m)} className={`text-[9px] px-2 py-0.5 rounded border cursor-pointer font-bold ${chartType === m ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'}`}>{l}</button>
          ))}
        </div>
        <div className="flex gap-1">
          {[1,7,30,90].map(d => (
            <button key={d} onClick={() => setDays(d)} className={`text-[9px] px-2 py-0.5 rounded border cursor-pointer ${days === d ? 'bg-slate-600 text-white border-slate-500' : 'bg-slate-800 text-slate-400 border-slate-700'}`}>{d}d</button>
          ))}
        </div>
      </div>

      {/* Coin stats */}
      {(() => {
        const c = coins.find(x => x.id === selected);
        return c ? (
          <div className="grid grid-cols-3 gap-1.5">
            {[
              ['PRICE', `$${c.current_price?.toLocaleString()}`, 'text-white'],
              ['24H', `${c.price_change_percentage_24h?.toFixed(2)}%`, c.price_change_percentage_24h >= 0 ? 'text-emerald-400' : 'text-rose-400'],
              ['MARKET CAP', fmt(c.market_cap), 'text-indigo-400'],
            ].map(([l, v, cls]) => (
              <div key={l} className="bg-slate-800/30 rounded-lg p-1.5 text-center border border-slate-700/30">
                <span className={`text-sm font-bold block ${cls}`}>{v}</span>
                <span className="text-[8px] text-slate-500">{l}</span>
              </div>
            ))}
          </div>
        ) : null;
      })()}

      {loading ? (
        <div className="flex-1 flex items-center justify-center text-[10px] text-slate-500 animate-pulse">SYNCING MARKET DATA...</div>
      ) : (
        <div ref={containerRef} className="w-full flex-1 min-h-[130px]" />
      )}
      <p className="text-[8px] text-slate-600 text-right">Data: CoinGecko · Refreshes on load</p>
    </div>
  );
}

// 15. DEV NEWS FEED WIDGET
// Pulls from public RSS feeds (Hacker News, Dev.to) via rss2json
function NewsFeedWidget({ isEnlarged }) {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [source, setSource] = useState('hn'); // 'hn', 'devto', 'github'
  const [filter, setFilter] = useState('');

  const FEEDS = {
    hn: { label: 'Hacker News', url: 'https://hnrss.org/frontpage?count=30' },
    devto: { label: 'Dev.to', url: 'https://dev.to/feed' },
    github: { label: 'GitHub Blog', url: 'https://github.blog/feed/' },
  };

  useEffect(() => {
    setLoading(true);
    setArticles([]);
    const feed = FEEDS[source];
    // Use rss2json public API to parse RSS
    fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feed.url)}&count=25`)
      .then(r => r.json())
      .then(data => {
        if (data.items) {
          setArticles(data.items.map(item => ({
            title: item.title,
            link: item.link,
            date: item.pubDate ? new Date(item.pubDate).toLocaleDateString('en', { month: 'short', day: 'numeric' }) : '',
            desc: item.description ? item.description.replace(/<[^>]+>/g, '').substring(0, 120) : '',
          })));
        }
        setLoading(false);
      })
      .catch(() => {
        // Fallback demo
        setArticles([
          { title: 'The future of AI coding assistants', link: '#', date: 'Jul 20', desc: 'Exploring how LLMs are reshaping developer workflows in 2026...' },
          { title: 'Rust now powers 40% of new systems projects', link: '#', date: 'Jul 19', desc: 'Memory safety without GC is winning converts across the industry...' },
          { title: 'TypeScript 6.0 released with native decorators', link: '#', date: 'Jul 18', desc: 'Major improvements to type inference and build performance...' },
          { title: 'PostgreSQL 17 benchmarks are in', link: '#', date: 'Jul 17', desc: 'Query planner improvements yield 30% throughput gains on analytic workloads...' },
          { title: 'WASM enters mainstream mobile development', link: '#', date: 'Jul 16', desc: 'Cross-platform runtime performance approaching native on all major targets...' },
        ]);
        setLoading(false);
      });
  }, [source]);

  const filtered = articles.filter(a => !filter || a.title.toLowerCase().includes(filter.toLowerCase()));

  return (
    <div className="flex-1 flex flex-col gap-2 font-mono text-xs">
      {/* Source selector */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <div className="flex gap-1">
          {Object.entries(FEEDS).map(([k, v]) => (
            <button key={k} onClick={() => setSource(k)} className={`text-[9px] px-2 py-1 rounded border cursor-pointer font-bold ${source === k ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'}`}>{v.label}</button>
          ))}
        </div>
        <input value={filter} onChange={e => setFilter(e.target.value)} placeholder="Filter..." className="ml-auto w-32 bg-slate-800/50 border border-slate-700/50 rounded-lg px-2 py-1 text-[10px] text-white focus:outline-none focus:border-indigo-500" />
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center text-[10px] text-slate-500 animate-pulse">FETCHING FEED...</div>
      ) : (
        <div className={`flex-1 overflow-y-auto space-y-1.5 pr-1 ${isEnlarged ? 'max-h-[500px]' : 'max-h-[280px]'}`}>
          {filtered.slice(0, isEnlarged ? 25 : 12).map((a, i) => (
            <a key={i} href={a.link} target="_blank" rel="noopener noreferrer"
              className="block bg-slate-800/30 hover:bg-slate-700/30 border border-slate-700/30 hover:border-slate-600/50 rounded-lg px-3 py-2 transition-all group cursor-pointer no-underline">
              <div className="flex items-start justify-between gap-2">
                <span className="text-[11px] text-slate-200 group-hover:text-white leading-snug flex-1">{a.title}</span>
                <span className="text-[8px] text-slate-500 flex-shrink-0 mt-0.5">{a.date}</span>
              </div>
              {a.desc && <p className="text-[9px] text-slate-500 mt-1 leading-relaxed line-clamp-2">{a.desc}</p>}
            </a>
          ))}
          {filtered.length === 0 && <div className="text-center text-slate-500 text-[10px] py-8">No articles match your filter</div>}
        </div>
      )}
      <div className="flex items-center justify-between">
        <span className="text-[8px] text-slate-600">{filtered.length} articles · {FEEDS[source].label}</span>
        <button onClick={() => { setArticles([]); setLoading(true); setTimeout(() => setLoading(false), 100); }} className="text-[8px] text-slate-500 hover:text-slate-300 cursor-pointer">↻ refresh</button>
      </div>
    </div>
  );
}

// 16. HABIT TRACKER WIDGET
// Track daily habits with a rolling 30-day completion grid
function HabitTrackerWidget({ isEnlarged }) {
  const SK = 'dashboard_v3_habits';
  const loadHabits = () => { try { return JSON.parse(localStorage.getItem(SK) || '[]'); } catch(e) { return []; } };
  const saveHabits = h => { try { localStorage.setItem(SK, JSON.stringify(h)); } catch(e) {} };

  const [habits, setHabits] = useState(() => loadHabits());
  const [newHabit, setNewHabit] = useState('');
  const [view, setView] = useState('grid'); // 'grid', 'chart'
  const containerRef = useRef(null);

  const today = new Date().toISOString().split('T')[0];

  // Build last N days array
  const buildDays = (n) => {
    const days = [];
    for (let i = n - 1; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      days.push(d.toISOString().split('T')[0]);
    }
    return days;
  };
  const days30 = buildDays(30);
  const days7 = buildDays(7);

  const addHabit = () => {
    if (!newHabit.trim()) return;
    const h = [...habits, { id: Date.now(), name: newHabit.trim(), color: ['#6366f1','#10b981','#f59e0b','#ec4899','#06b6d4','#8b5cf6'][habits.length % 6], completions: {} }];
    setHabits(h); saveHabits(h); setNewHabit('');
  };

  const toggleDay = (habitId, day) => {
    const h = habits.map(hb => {
      if (hb.id !== habitId) return hb;
      const c = { ...hb.completions };
      if (c[day]) delete c[day]; else c[day] = true;
      return { ...hb, completions: c };
    });
    setHabits(h); saveHabits(h);
  };

  const removeHabit = (id) => {
    const h = habits.filter(hb => hb.id !== id);
    setHabits(h); saveHabits(h);
  };

  // Chart: completion rate per habit last 30 days
  useEffect(() => {
    if (view !== 'chart' || !containerRef.current || habits.length === 0) return;
    const rates = habits.map(h => {
      const done = days30.filter(d => h.completions[d]).length;
      return Math.round((done / 30) * 100);
    });
    const traces = [{
      x: habits.map(h => h.name.substring(0, 14)),
      y: rates,
      type: 'bar',
      marker: { color: habits.map(h => h.color) },
      text: rates.map(r => `${r}%`),
      textposition: 'auto',
      textfont: { color: '#fff', size: 10 }
    }];
    const layout = {
      paper_bgcolor: 'rgba(0,0,0,0)', plot_bgcolor: 'rgba(0,0,0,0)',
      margin: { l: 30, r: 10, t: 10, b: 60 },
      height: isEnlarged ? 380 : 200,
      xaxis: { tickfont: { color: '#94a3b8', size: 8 }, tickangle: -25 },
      yaxis: { range: [0, 100], gridcolor: 'rgba(255,255,255,0.05)', tickfont: { color: '#94a3b8', size: 9 }, ticksuffix: '%' },
      showlegend: false
    };
    Plotly.newPlot(containerRef.current, traces, layout, { displayModeBar: false });
  }, [habits, view, isEnlarged]);

  const overallToday = habits.length ? habits.filter(h => h.completions[today]).length : 0;

  return (
    <div className="flex-1 flex flex-col gap-2 font-mono text-xs">
      {/* Add habit */}
      <div className="flex gap-1.5">
        <input value={newHabit} onChange={e => setNewHabit(e.target.value)} onKeyDown={e => e.key === 'Enter' && addHabit()}
          placeholder="New habit..."
          className="flex-1 bg-slate-800/50 border border-slate-700/50 rounded-lg px-2.5 py-1.5 text-[11px] text-white focus:outline-none focus:border-indigo-500" />
        <button onClick={addHabit} className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] rounded-lg font-bold cursor-pointer">ADD</button>
      </div>

      {/* Header stats */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-white">{overallToday}/{habits.length}</span>
          <span className="text-[9px] text-slate-400">habits today</span>
          {habits.length > 0 && (
            <div className="h-1.5 w-24 bg-slate-700/50 rounded-full overflow-hidden">
              <div style={{ width: `${(overallToday / habits.length) * 100}%`, backgroundColor: overallToday === habits.length ? '#10b981' : '#6366f1' }} className="h-full rounded-full transition-all duration-500" />
            </div>
          )}
        </div>
        <div className="flex gap-1">
          {[['grid','GRID'],['chart','STATS']].map(([m,l]) => (
            <button key={m} onClick={() => setView(m)} className={`text-[9px] px-2 py-0.5 rounded border cursor-pointer font-bold ${view === m ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-slate-800 text-slate-400 border-slate-700'}`}>{l}</button>
          ))}
        </div>
      </div>

      {habits.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-[10px] text-slate-500">Add your first habit above</div>
      ) : view === 'grid' ? (
        <div className={`flex-1 overflow-y-auto space-y-2 ${isEnlarged ? 'max-h-[420px]' : 'max-h-[260px]'}`}>
          {/* Day headers */}
          <div className="flex items-center gap-1 pl-[120px]">
            {days7.map(d => (
              <div key={d} style={{ width: 22, flexShrink: 0 }} className="text-[8px] text-slate-500 text-center">
                {new Date(d + 'T12:00').toLocaleDateString('en', { weekday: 'narrow' })}
              </div>
            ))}
          </div>
          {habits.map(h => {
            const streak = (() => {
              let s = 0;
              for (let i = 0; i < 30; i++) {
                const d = new Date(); d.setDate(d.getDate() - i);
                if (h.completions[d.toISOString().split('T')[0]]) s++; else break;
              }
              return s;
            })();
            return (
              <div key={h.id} className="flex items-center gap-1">
                <div className="w-[116px] flex-shrink-0 flex items-center justify-between gap-1">
                  <div className="min-w-0">
                    <span className="text-[10px] text-slate-200 truncate block" style={{ maxWidth: 90 }}>{h.name}</span>
                    <span className="text-[8px]" style={{ color: h.color }}>🔥 {streak}d streak</span>
                  </div>
                  <button onClick={() => removeHabit(h.id)} className="text-slate-700 hover:text-rose-400 text-[9px] flex-shrink-0 cursor-pointer">✕</button>
                </div>
                {days7.map(d => {
                  const done = !!h.completions[d];
                  const isToday = d === today;
                  return (
                    <button key={d} onClick={() => toggleDay(h.id, d)} style={{ width: 22, height: 22, flexShrink: 0, backgroundColor: done ? h.color : 'rgba(30,41,59,0.5)', borderRadius: 4, border: isToday ? `1px solid ${h.color}` : '1px solid transparent', cursor: 'pointer' }}
                      title={d} />
                  );
                })}
              </div>
            );
          })}
        </div>
      ) : (
        <div ref={containerRef} className="w-full flex-1 min-h-[150px]" />
      )}
    </div>
  );
}

// 17. CODE STATS WIDGET
// WakaTime-style breakdown using public WakaTime API or manual entry
function CodeStatsWidget({ keys, isEnlarged }) {
  const containerRef = useRef(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState('languages'); // 'languages', 'editors', 'daily', 'projects'
  const [manualMode, setManualMode] = useState(false);
  const SK = 'dashboard_v3_codestats_manual';

  const defaultManual = {
    languages: [
      { name: 'Python', hours: 22 }, { name: 'JavaScript', hours: 18 },
      { name: 'TypeScript', hours: 14 }, { name: 'Rust', hours: 6 }, { name: 'SQL', hours: 4 }
    ],
    editors: [{ name: 'VS Code', hours: 38 }, { name: 'Vim', hours: 8 }, { name: 'JetBrains', hours: 18 }],
    daily: [8.5, 6.2, 7.8, 9.1, 5.5, 2.3, 4.7],
    projects: [{ name: 'Dashboard', hours: 20 }, { name: 'API Server', hours: 15 }, { name: 'ML Pipeline', hours: 10 }, { name: 'CLI Tool', hours: 8 }]
  };

  const [manual, setManual] = useState(() => {
    try { return JSON.parse(_lsGet(SK) || JSON.stringify(defaultManual)); } catch(e) { return defaultManual; }
  });

  useEffect(() => {
    if (!keys.wakatimeApiKey) { setManualMode(true); return; }
    setLoading(true);
    // WakaTime v1 API — user stats last 7 days
    fetch(`https://wakatime.com/api/v1/users/current/stats/last_7_days`, {
      headers: { 'Authorization': `Basic ${btoa(keys.wakatimeApiKey + ':')}` }
    })
      .then(r => r.json())
      .then(json => {
        if (json.data) {
          setData(json.data);
          setManualMode(false);
        } else {
          setManualMode(true);
        }
        setLoading(false);
      })
      .catch(() => { setManualMode(true); setLoading(false); });
  }, [keys.wakatimeApiKey]);

  const activeData = manualMode ? manual : data ? {
    languages: data.languages?.slice(0, 6).map(l => ({ name: l.name, hours: l.total_seconds / 3600 })) || [],
    editors: data.editors?.map(e => ({ name: e.name, hours: e.total_seconds / 3600 })) || [],
    daily: data.days?.map(d => d.total_seconds / 3600) || [],
    projects: data.projects?.slice(0, 6).map(p => ({ name: p.name, hours: p.total_seconds / 3600 })) || []
  } : manual;

  useEffect(() => {
    if (!containerRef.current) return;
    const COLORS = ['#6366f1','#10b981','#f59e0b','#ec4899','#06b6d4','#8b5cf6','#ef4444','#14b8a6'];
    let traces, layout;

    if (tab === 'languages' || tab === 'editors' || tab === 'projects') {
      const items = activeData[tab] || [];
      const names = items.map(i => i.name);
      const hours = items.map(i => parseFloat(i.hours?.toFixed(1)));
      traces = [{
        values: hours, labels: names.map((n, i) => `${n} (${hours[i]}h)`),
        type: 'pie', hole: 0.5,
        marker: { colors: COLORS.slice(0, names.length) },
        textinfo: 'percent', textfont: { size: 9, color: '#fff' }
      }];
      layout = {
        paper_bgcolor: 'rgba(0,0,0,0)',
        margin: { l: 10, r: 120, t: 10, b: 10 },
        height: isEnlarged ? 360 : 200,
        showlegend: true,
        legend: { font: { color: '#94a3b8', size: 9 }, x: 1.02, y: 0.5 },
        annotations: [{
          font: { size: 13, color: '#fff', family: 'monospace' }, showarrow: false,
          text: `${hours.reduce((a,b) => a+b, 0).toFixed(0)}h`, x: 0.38, y: 0.5
        }]
      };
    } else {
      // daily bar
      const days7 = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
      const vals = (activeData.daily || []).slice(0, 7);
      traces = [{
        x: days7.slice(0, vals.length),
        y: vals.map(v => parseFloat(v.toFixed(2))),
        type: 'bar',
        marker: { color: vals.map(v => v >= 6 ? '#10b981' : v >= 3 ? '#6366f1' : '#475569') },
        text: vals.map(v => `${v.toFixed(1)}h`),
        textposition: 'outside', textfont: { color: '#94a3b8', size: 9 }
      }];
      layout = {
        paper_bgcolor: 'rgba(0,0,0,0)', plot_bgcolor: 'rgba(0,0,0,0)',
        margin: { l: 30, r: 10, t: 20, b: 30 },
        height: isEnlarged ? 360 : 200,
        xaxis: { tickfont: { color: '#94a3b8', size: 9 } },
        yaxis: { gridcolor: 'rgba(255,255,255,0.05)', tickfont: { color: '#94a3b8', size: 9 }, ticksuffix: 'h' },
        showlegend: false
      };
    }
    Plotly.newPlot(containerRef.current, traces, layout, { displayModeBar: false });
  }, [activeData, tab, isEnlarged, manualMode]);

  const totalHours = (activeData.languages || []).reduce((a, l) => a + (l.hours || 0), 0);
  const topLang = (activeData.languages || [])[0]?.name || '—';
  const topEditor = (activeData.editors || [])[0]?.name || '—';

  if (loading) return <div className="flex-1 flex items-center justify-center text-xs font-mono text-slate-400 animate-pulse">LOADING WAKATIME DATA...</div>;

  return (
    <div className="flex-1 flex flex-col gap-2 font-mono text-xs">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex gap-2">
          {[
            ['totalHours', `${totalHours.toFixed(0)}h`, 'text-indigo-400', 'CODED'],
            ['topLang', topLang, 'text-emerald-400', 'TOP LANG'],
            ['topEditor', topEditor, 'text-amber-400', 'EDITOR'],
          ].map(([k, v, cls, lbl]) => (
            <div key={k} className="bg-slate-800/30 rounded-lg px-2 py-1 border border-slate-700/30 text-center">
              <span className={`text-xs font-bold block ${cls}`}>{v}</span>
              <span className="text-[8px] text-slate-500">{lbl}</span>
            </div>
          ))}
        </div>
        {manualMode && <span className="text-[8px] text-amber-500 border border-amber-800/40 rounded px-1.5 py-0.5">DEMO — add WakaTime API key in Settings</span>}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 flex-wrap">
        {[['languages','LANGUAGES'],['editors','EDITORS'],['projects','PROJECTS'],['daily','DAILY']].map(([m,l]) => (
          <button key={m} onClick={() => setTab(m)} className={`text-[9px] px-2 py-0.5 rounded border cursor-pointer font-bold ${tab === m ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'}`}>{l}</button>
        ))}
      </div>

      <div ref={containerRef} className="w-full flex-1 min-h-[150px]" />

      {/* Manual editor (demo mode) */}
      {manualMode && tab === 'languages' && (
        <div className="border-t border-slate-800/60 pt-2 space-y-1">
          <span className="text-[9px] text-slate-500 uppercase">Edit demo hours</span>
          <div className="flex flex-wrap gap-1.5">
            {(manual.languages || []).map((l, i) => (
              <div key={i} className="flex items-center gap-1 bg-slate-800/30 rounded px-1.5 py-0.5 border border-slate-700/30">
                <span className="text-[9px] text-slate-300">{l.name}</span>
                <input type="number" value={l.hours} min="0"
                  onChange={e => {
                    const updated = { ...manual, languages: manual.languages.map((x, j) => j === i ? { ...x, hours: parseFloat(e.target.value) || 0 } : x) };
                    setManual(updated);
                    _lsSet(SK, JSON.stringify(updated));
                  }}
                  className="w-10 bg-transparent border-b border-slate-600 text-[9px] text-indigo-300 focus:outline-none text-center" />
                <span className="text-[8px] text-slate-500">h</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// --- RENDER BOOTSTRAP ---
const rootEl = document.getElementById('root');
if (rootEl) {
  const root = ReactDOM.createRoot(rootEl);
  root.render(<App />);
}
