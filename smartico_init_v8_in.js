(function () {
    const SMARTICO_SRC = 'https://d1om8bhvvd0l9e.cloudfront.net/s8.js';
    const PROJECT_KEY = 'b9c2f276-be35-4b8c-873a-3237486db424-4';
    const BRAND_KEY = '16b5e781';
    const SKIN_NAME = 'v3_grove_india_15_new';
    const SEGMENT_ID = 35936;

    let _userId = null;
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

    function pushDL(event, data) {
        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push(Object.assign({ event }, data || {}));
    }

    /* ---------------- init ---------------- */

    function initSmartico() {
        if (window._smartico) return; // только один раз

        const script = document.createElement('script');
        script.src = SMARTICO_SRC;
        script.async = true;

        script.onload = function () {
            window._smartico.init(PROJECT_KEY, { brand_key: BRAND_KEY });

            // SPA login callback
            window._smartico.on('login', () => {
                console.log('[Smartico] SPA login callback');
                applySkinSegment();
                pushDL('smartico_login', { userId: _userId });
            });

            // SPA logout callback
            window._smartico.on('logout', () => {
                console.log('[Smartico] SPA logout callback');
                _userId = null;
                window._smartico_user_id = null;
                localStorage.removeItem('smartico_skin_v3');
                pushDL('smartico_logout');
            });

            pushDL('smartico_initialized');

            // сразу после init проверяем авторизацию
            const token = localStorage.getItem('token');
            const userId = getPlayerIdFromDataLayer();
            if (token && userId) {
                smarticoIdentify(userId);
                smarticoLogin();
            }
        };

        document.head.appendChild(script);
    }

    /* ---------------- SPA auth functions ---------------- */

    function smarticoIdentify(userId) {
        if (!window._smartico || !userId) return;
        _userId = userId;
        window._smartico_user_id = userId;
        window._smartico.identify(userId);
    }

    function smarticoLogin() {
        if (!window._smartico || !_userId) return;
        window._smartico.login();
        applySkinSegment();
    }

    function smarticoLogout() {
        if (!window._smartico) return;
        window._smartico.logout();
    }

    /* ---------------- skin ---------------- */

    function applySkinSegment() {
        const token = localStorage.getItem('token');
        if (!token || !window._smartico || window._smartico.__skinApplied) return;

        window._smartico.api.checkSegmentMatch(SEGMENT_ID).then(match => {
            if (match === true) {
                window._smartico.setSkin(SKIN_NAME);
                localStorage.setItem('smartico_skin_v3', 'true');
                window._smartico.__skinApplied = true;
                console.log('[Smartico] Skin applied via segment');
            }
        });
    }

    /* ---------------- suspension ---------------- */

    function updateSmarticoSuspension() {
        if (!window._smartico) return;
        const token = localStorage.getItem('token');
        if (!token) {
            lastSuspendState = null;
            return;
        }

        const shouldSuspend = isRestrictedPage();
        if (shouldSuspend === lastSuspendState) return;
        lastSuspendState = shouldSuspend;

        window._smartico.suspendPopups?.(shouldSuspend);
        window._smartico.suspendInbox?.(shouldSuspend);
        window._smartico.suspendMiniGames?.(shouldSuspend);
    }

    /* ---------------- deep link ---------------- */

    function handleUrlChange() {
        const hash = window.location.hash;
        if (!hash || !hash.startsWith('#smartico_dl=')) return;
        if (!window._smartico?.dp) return;

        const value = hash.replace('#smartico_dl=', '');
        if (!value) return;

        window._smartico.dp(value);

        history.replaceState(
            null,
            document.title,
            window.location.pathname + window.location.search
        );
    }

    /* ---------------- SPA listeners ---------------- */

    ['hashchange', 'popstate', 'pushState', 'replaceState'].forEach(event => {
        window.addEventListener(event, () => {
            handleUrlChange();
            updateSmarticoSuspension();
        });
    });

    ['pushState', 'replaceState'].forEach(method => {
        const original = history[method];
        history[method] = function () {
            const result = original.apply(this, arguments);
            window.dispatchEvent(new Event(method));
            return result;
        };
    });

    /* ---------------- storage listener ---------------- */

    window.addEventListener('storage', e => {
        if (e.key === 'token') {
            const token = localStorage.getItem('token');
            const userId = getPlayerIdFromDataLayer();
            if (token && userId) {
                smarticoIdentify(userId);
                smarticoLogin();
            } else {
                smarticoLogout();
            }
            updateSmarticoSuspension();
        }
    });

    (function () {
        const originalSetItem = localStorage.setItem;
        const originalRemoveItem = localStorage.removeItem;

        localStorage.setItem = function (key, value) {
            originalSetItem.apply(this, arguments);
            if (key === 'token') {
                const token = localStorage.getItem('token');
                const userId = getPlayerIdFromDataLayer();
                if (token && userId) {
                    smarticoIdentify(userId);
                    smarticoLogin();
                } else {
                    smarticoLogout();
                }
                updateSmarticoSuspension();
            }
        };

        localStorage.removeItem = function (key) {
            originalRemoveItem.apply(this, arguments);
            if (key === 'token') {
                smarticoLogout();
                updateSmarticoSuspension();
            }
        };
    })();

    /* ---------------- bootstrap ---------------- */

    setLanguage();
    initSmartico();
})();
