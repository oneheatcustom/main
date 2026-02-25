(function () {
    const SMARTICO_SRC = 'https://d1om8bhvvd0l9e.cloudfront.net/s8.js';
    const PROJECT_KEY = 'b9c2f276-be35-4b8c-873a-3237486db424-4';
    const BRAND_KEY = '16b5e781';

    const SKIN_NAME = 'v3_grove_india_15_new';
    const SEGMENT_ID = 35936;

    let lastSuspendState = null;
    let lastKnownToken = null;

    /* ---------------- helpers ---------------- */

    function getPlayerIdFromDataLayer() {
        if (!Array.isArray(window.dataLayer)) return null;
        for (let i = window.dataLayer.length - 1; i >= 0; i--) {
            const item = window.dataLayer[i];
            if (item && item.userID != null) return item.userID;
        }
        return null;
    }

    function pushDL(event, data) {
        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push(Object.assign({ event }, data || {}));
    }

    function setLanguage() {
        window._smartico_language =
            (document.documentElement.lang || 'EN').toUpperCase();
    }

    function isRestrictedPage() {
        const path = window.location.pathname.replace(/\/+$/, '').toLowerCase();
        return /^\/([a-z]{2}(?:-[a-z]{2})?\/)?(deposit|withdraw)$/.test(path);
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

    /* ---------------- skin & control ---------------- */

    function applySkinViaSegment() {
        if (!localStorage.getItem('token')) return;
        if (window._smartico?.__skinApplied) return;

        window._smartico.api.checkSegmentMatch(SEGMENT_ID).then(function (match) {
            if (match === true) {
                window._smartico.setSkin(SKIN_NAME);
                localStorage.setItem('smartico_skin_v3', 'true');
                window._smartico.__skinApplied = true;
                console.log('[Smartico] Skin applied');
            }
        });
    }

    function syncSmarticoControl() {
        if (!localStorage.getItem('token')) return;
        const profile = window._smartico?.api.getUserProfile?.();
        if (profile && profile.ach_gamification_in_control_group !== undefined) {
            localStorage.setItem(
                'smartico_control',
                String(profile.ach_gamification_in_control_group)
            );
        }
    }

    /* ---------------- deep link ---------------- */

    function handleUrlChange() {
        const hash = window.location.hash;
        if (!hash || !hash.startsWith('#smartico_dl=')) return;
        if (!window._smartico?.dp) return;

        window._smartico.dp(hash.replace('#smartico_dl=', ''));

        history.replaceState(
            null,
            document.title,
            window.location.pathname + window.location.search
        );
    }

    /* ---------------- SPA login / logout ---------------- */

    function reinitSmartico(userId) {
        if (!userId) return;
        if (window.__smarticoReinitInProgress) return;

        window.__smarticoReinitInProgress = true;

        console.log('[Smartico] Re-init with userId:', userId);

        try { window._smartico?.destroy?.(); } catch(e){}
        try { delete window._smartico; } catch(e){}

        window._smartico_user_id = userId;

        const s = document.createElement('script');
        s.src = SMARTICO_SRC;
        s.async = true;

        s.onload = function () {
            if (!window._smartico?.init) return;

            window._smartico.init(PROJECT_KEY, { brand_key: BRAND_KEY });

            // Skin / control
            applySkinViaSegment();
            syncSmarticoControl();

            pushDL('smartico_login', { userId });
            console.log('[Smartico] Re-init completed');
        };

        document.head.appendChild(s);
    }

    function detectSpaLogin() {
        const token = localStorage.getItem('token');
        const userId = getPlayerIdFromDataLayer();
        if (!token || !userId) return;

        if (window._smartico && !window.__smarticoReinited) {
            window.__smarticoReinited = true;
            reinitSmartico(userId);
        }
    }

    function smarticoLogout() {
        console.log('[Smartico] Logout');

        try { window._smartico?.destroy?.(); } catch(e){}
        try { delete window._smartico; } catch(e){}

        window._smartico_user_id = null;

        localStorage.removeItem('smartico_skin_v3');
        localStorage.removeItem('smartico_control');

        window.__smarticoReinited = false;
        window.__smarticoReinitInProgress = false;

        pushDL('smartico_logout');
    }

    /* ---------------- localStorage override ---------------- */

    (function () {
        const originalSetItem = localStorage.setItem;
        const originalRemoveItem = localStorage.removeItem;

        localStorage.setItem = function (k, v) {
            originalSetItem.apply(this, arguments);
            if (k === 'token') detectSpaLogin();
        };

        localStorage.removeItem = function (k) {
            originalRemoveItem.apply(this, arguments);
            if (k === 'token') smarticoLogout();
        };
    })();

    /* ---------------- init ---------------- */

    setLanguage();

    if (!window._smartico) {
        const s = document.createElement('script');
        s.src = SMARTICO_SRC;
        s.async = true;

        s.onload = function () {
            window._smartico.init(PROJECT_KEY, { brand_key: BRAND_KEY });

            updateSmarticoSuspension();
            applySkinViaSegment();
            syncSmarticoControl();
            handleUrlChange();

            // SPA listeners
            ['hashchange', 'popstate', 'pushState', 'replaceState']
                .forEach(e => window.addEventListener(e, () => {
                    handleUrlChange();
                    updateSmarticoSuspension();
                    detectSpaLogin();
                }));

            pushDL('smartico_initialized');
        };

        document.head.appendChild(s);
    }

    /* ---------------- SPA history hooks ---------------- */

    ['pushState', 'replaceState'].forEach(function (method) {
        const original = history[method];
        history[method] = function () {
            const res = original.apply(this, arguments);
            window.dispatchEvent(new Event(method));
            return res;
        };
    });
})();
