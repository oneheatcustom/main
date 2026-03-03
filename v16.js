(function () {
    const SMARTICO_SRC = 'https://d1om8bhvvd0l9e.cloudfront.net/s8.js';
    const PROJECT_KEY = 'b9c2f276-be35-4b8c-873a-3237486db424-4';
    const BRAND_KEY = '16b5e781';

    const SKIN_NAME = 'v3_grove_india_15_new';
    const SEGMENT_ID = 35936;

    let smarticoReady = false;
    let lastSuspendState = null;

    /* ---------------- helpers ---------------- */
    function getLatestUserIdFromDataLayer() {
        if (!Array.isArray(window.dataLayer)) return null;
        for (let i = window.dataLayer.length - 1; i >= 0; i--) {
            const item = window.dataLayer[i];
            if (item && item.userId != null) return item.userId;
            if (item && item.userID != null) return item.userID; // fallback
        }
        return null;
    }

    function setLanguage() {
        window._smartico_language =
            (document.documentElement.lang || 'EN').toUpperCase();
    }

    function isRestrictedPage() {
        const path = location.pathname.replace(/\/+$/, '').toLowerCase();
        return /^\/([a-z]{2}(?:-[a-z]{2})?\/)?(deposit|withdraw)$/.test(path);
    }

    /* ---------------- INIT ---------------- */
    function initSmartico() {
        if (window._smartico) return;

        const script = document.createElement('script');
        script.src = SMARTICO_SRC;
        script.async = true;

        script.onload = function () {
            window._smartico.init(PROJECT_KEY, { brand_key: BRAND_KEY });
            smarticoReady = true;

            window.dataLayer = window.dataLayer || [];
            window.dataLayer.push({ event: 'smartico_initialized' });

            syncLoginState();
        };

        document.head.appendChild(script);
    }

    /* ---------------- POST LOGIN SETUP ---------------- */
    function postLoginSetup(userId) {
        if (!smarticoReady || !userId) return;

        // --- skin via segment ---
        if (!window._smartico.__skinApplied) {
            window._smartico.api?.checkSegmentMatch(SEGMENT_ID)?.then(match => {
                if (match === true) {
                    window._smartico.setSkin(SKIN_NAME);
                    window._smartico.__skinApplied = true;
                    localStorage.setItem('smartico_skin_v3', 'true');
                    console.log('[Smartico] Skin applied via segment', SEGMENT_ID);
                }
            });
        }

        // --- control flag with retry ---
        if (!localStorage.getItem('smartico_control')) {
            let attempts = 0;
            const maxAttempts = 20;
            (function poll() {
                attempts++;
                try {
                    const profile = window._smartico.api.getUserProfile();
                    if (
                        profile &&
                        profile.ach_gamification_in_control_group !== undefined
                    ) {
                        localStorage.setItem(
                            'smartico_control',
                            String(profile.ach_gamification_in_control_group)
                        );
                        console.log(
                            '[Smartico] control group saved:',
                            profile.ach_gamification_in_control_group
                        );
                        return;
                    }
                } catch (e) {}
                if (attempts < maxAttempts) setTimeout(poll, 100);
                else console.warn('[Smartico] control group not available after retry');
            })();
        }

        // --- suspension ---
        const shouldSuspend = isRestrictedPage();
        if (shouldSuspend !== lastSuspendState) {
            lastSuspendState = shouldSuspend;
            window._smartico.suspendPopups?.(shouldSuspend);
            window._smartico.suspendInbox?.(shouldSuspend);
            window._smartico.suspendMiniGames?.(shouldSuspend);
        }
    }

    /* ---------------- LOGIN / LOGOUT ---------------- */
    function loginUser() {
        const userId = getLatestUserIdFromDataLayer();
        if (!userId) return;

        window._smartico_user_id = userId;
        window._smartico?.setUserId?.(userId);

        postLoginSetup(userId);

        window.dataLayer.push({ event: 'smartico_login', userId });
        console.log('[Smartico] logged in:', userId);
    }

    function logoutUser() {
        window._smartico_user_id = null;

        localStorage.removeItem('smartico_skin_v3');
        localStorage.removeItem('smartico_control');
        lastSuspendState = null;

        window.dataLayer.push({ event: 'smartico_logout' });
        console.log('[Smartico] logged out');
    }

    function syncLoginState() {
        const token = localStorage.getItem('token');
        if (token) {
            waitForUserIdAndLogin();
        } else {
            logoutUser();
        }
    }

    function waitForUserIdAndLogin() {
        if (!smarticoReady) return;
        if (!localStorage.getItem('token')) return;

        let attempts = 0;
        const maxAttempts = 30;

        (function poll() {
            attempts++;
            const userId = getLatestUserIdFromDataLayer();
            if (userId) {
                loginUser();
                return;
            }
            if (attempts < maxAttempts) setTimeout(poll, 100);
            else console.warn('[Smartico] userID not found after login');
        })();
    }

    /* ---------------- SPA / Deep link ---------------- */
    function handleUrlChange() {
        if (!window._smartico?.dp) return;

        const hash = location.hash;
        if (!hash.startsWith('#smartico_dl=')) return;

        window._smartico.dp(hash.replace('#smartico_dl=', ''));
        history.replaceState(null, document.title, location.pathname + location.search);
    }

    ['pushState', 'replaceState'].forEach(method => {
        const orig = history[method];
        history[method] = function () {
            const res = orig.apply(this, arguments);
            window.dispatchEvent(new Event(method));
            return res;
        };
    });

    ['hashchange', 'popstate', 'pushState', 'replaceState'].forEach(e => {
        window.addEventListener(e, () => {
            handleUrlChange();
            loginUser(); // SPA-safe: проверка и логин
        });
    });

    /* ---------------- TOKEN WATCH ---------------- */
    window.addEventListener('storage', e => {
        if (e.key === 'token') syncLoginState();
    });

    (function () {
        const setItem = localStorage.setItem;
        const removeItem = localStorage.removeItem;

        localStorage.setItem = function (k, v) {
            setItem.apply(this, arguments);
            if (k === 'token') syncLoginState();
        };
        localStorage.removeItem = function (k) {
            removeItem.apply(this, arguments);
            if (k === 'token') syncLoginState();
        };
    })();

    /* ---------------- BOOT ---------------- */
    setLanguage();
    initSmartico();
})();
