(function () {
    const SMARTICO_SRC = 'https://d1om8bhvvd0l9e.cloudfront.net/s8.js';
    const PROJECT_KEY = 'b9c2f276-be35-4b8c-873a-3237486db424-4';
    const BRAND_KEY = '16b5e781';

    const SKIN_NAME = 'v3_grove_india_15_new';
    const SEGMENT_ID = 35936;

    let smarticoReady = false;
    let currentUserId = null;
    let lastSuspendState = null;

    /* ---------------- helpers ---------------- */

    function getPlayerIdFromDataLayer() {
        if (!Array.isArray(window.dataLayer)) return null;
        for (let i = window.dataLayer.length - 1; i >= 0; i--) {
            const item = window.dataLayer[i];
            if (item && item.userID != null) return item.userID;
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

    /* ---------------- LOGIN LOGIC ---------------- */

    function loginUserWithId(userId) {
        if (!smarticoReady) return;
        if (!userId || userId === currentUserId) return;

        currentUserId = userId;

        window._smartico_user_id = userId;
        window._smartico?.setUserId?.(userId);

        applySkinViaSegment();
        updateSmarticoSuspension();

        window.dataLayer.push({
            event: 'smartico_login',
            userId
        });

        console.log('[Smartico] logged in:', userId);
    }

    function waitForUserIdAndLogin() {
        if (!smarticoReady) return;
        if (!localStorage.getItem('token')) return;

        let attempts = 0;
        const maxAttempts = 30; // ~3 сек

        (function poll() {
            attempts++;

            const userId = getPlayerIdFromDataLayer();
            if (userId) {
                loginUserWithId(userId);
                return;
            }

            if (attempts < maxAttempts) {
                setTimeout(poll, 100);
            } else {
                console.warn('[Smartico] userID not found after login');
            }
        })();
    }

    function logoutUser() {
        if (!currentUserId) return;

        currentUserId = null;
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

    /* ---------------- SKIN ---------------- */

    function applySkinViaSegment() {
        if (!currentUserId) return;
        if (window._smartico.__skinApplied) return;

        window._smartico.api
            ?.checkSegmentMatch(SEGMENT_ID)
            ?.then(match => {
                if (match === true) {
                    window._smartico.setSkin(SKIN_NAME);
                    window._smartico.__skinApplied = true;
                    localStorage.setItem('smartico_skin_v3', 'true');
                }
            });
    }

    /* ---------------- SUSPENSION ---------------- */

    function updateSmarticoSuspension() {
        if (!currentUserId || !window._smartico) return;

        const shouldSuspend = isRestrictedPage();
        if (shouldSuspend === lastSuspendState) return;

        lastSuspendState = shouldSuspend;

        window._smartico.suspendPopups?.(shouldSuspend);
        window._smartico.suspendInbox?.(shouldSuspend);
        window._smartico.suspendMiniGames?.(shouldSuspend);
    }

    /* ---------------- SPA ---------------- */

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
            updateSmarticoSuspension();
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
