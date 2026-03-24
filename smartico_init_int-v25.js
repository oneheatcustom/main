(function () {
    const SMARTICO_SRC = 'https://d1om8bhvvd0l9e.cloudfront.net/s8.js';
    const PROJECT_KEY = 'b9c2f276-be35-4b8c-873a-3237486db424-4';
    const BRAND_KEY = '16b5e781';

    const SKIN_NAME = 'v3_grove_india_15_new';
    const SEGMENT_ID = 35936;

    const ACCOUNT_API = '/api/v3/user/getAccountInfo';

    let smarticoReady = false;
    let currentUserId = null;
    let lastSuspendState = null;

    let lastTokenUsed = null;
    let isFetching = false;

    /* ---------------- helpers ---------------- */

    function getToken() {
        return localStorage.getItem('token');
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

    /* ---------------- API ---------------- */

    function fetchUserNumber(token, retries = 2) {
        if (isFetching) return;
        isFetching = true;

        fetch(ACCOUNT_API, {
            method: "GET",
            headers: {
                Authorization: "Token " + token,
                "Content-type": "application/json; charset=UTF-8",
                "X-Channel": "MOBILE_WEB"
            }
        })
        .then(res => res.json())
        .then(result => {
            isFetching = false;

            const number = result?.number;

            if (!number) {
                console.warn('[Smartico] number not found');
                return;
            }

            loginUserWithId(number);
        })
        .catch(() => {
            isFetching = false;

            if (retries > 0) {
                setTimeout(() => fetchUserNumber(token, retries - 1), 500);
            } else {
                console.warn('[Smartico] API failed');
            }
        });
    }

    /* ---------------- LOGIN ---------------- */

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
        const token = getToken();

        if (!token) {
            logoutUser();
            lastTokenUsed = null;
            return;
        }

        if (token === lastTokenUsed) return;
        lastTokenUsed = token;

        fetchUserNumber(token);
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
