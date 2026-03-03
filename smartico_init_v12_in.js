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
        const path = window.location.pathname.replace(/\/+$/, '').toLowerCase();
        return /^\/([a-z]{2}(?:-[a-z]{2})?\/)?(deposit|withdraw)$/.test(path);
    }

    /* ---------------- INIT (один раз) ---------------- */

    function initSmartico() {
        if (window._smartico) return;

        const script = document.createElement('script');
        script.src = SMARTICO_SRC;
        script.async = true;

        script.onload = function () {
            if (!window._smartico?.init) return;

            window._smartico.init(PROJECT_KEY, { brand_key: BRAND_KEY });
            smarticoReady = true;

            window.dataLayer = window.dataLayer || [];
            window.dataLayer.push({ event: 'smartico_initialized' });

            // если пользователь уже залогинен
            syncLoginState();
        };

        document.head.appendChild(script);
    }

    /* ---------------- LOGIN / LOGOUT ---------------- */

    function loginUser() {
        if (!smarticoReady) return;

        const token = localStorage.getItem('token');
        if (!token) return;

        const userId = getPlayerIdFromDataLayer();
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
    }

    function logoutUser() {
        if (!currentUserId) return;

        currentUserId = null;
        window._smartico_user_id = null;

        localStorage.removeItem('smartico_skin_v3');
        localStorage.removeItem('smartico_control');

        lastSuspendState = null;

        window.dataLayer.push({
            event: 'smartico_logout'
        });
    }

    function syncLoginState() {
        const token = localStorage.getItem('token');
        if (token) {
            loginUser();
        } else {
            logoutUser();
        }
    }

    /* ---------------- SKIN ---------------- */

    function applySkinViaSegment() {
        if (!currentUserId) return;
        if (window._smartico.__skinApplied) return;

        if (!window._smartico?.api?.checkSegmentMatch) return;

        window._smartico.api.checkSegmentMatch(SEGMENT_ID).then(match => {
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

    /* ---------------- URL / SPA ---------------- */

    function handleUrlChange() {
        if (!window._smartico?.dp) return;

        const hash = window.location.hash;
        if (!hash || !hash.startsWith('#smartico_dl=')) return;

        const value = hash.replace('#smartico_dl=', '');
        if (!value) return;

        window._smartico.dp(value);
        history.replaceState(null, document.title, location.pathname + location.search);
    }

    ['pushState', 'replaceState'].forEach(method => {
        const original = history[method];
        history[method] = function () {
            const res = original.apply(this, arguments);
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
