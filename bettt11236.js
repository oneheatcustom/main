(function () {
    const SMARTICO_SRC = 'https://d1om8bhvvd0l9e.cloudfront.net/s8.js';
    const PROJECT_KEY = 'b9c2f276-be35-4b8c-873a-3237486db424-4';
    const BRAND_KEY = '16b5e781';

    const SKIN_NAME = 'v3_grove_india_15_new';
    const SEGMENT_ID = 35936;

    let lastKnownToken = null;
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

    /* ---------------- user sync ---------------- */

    function syncSmarticoUser(force) {
        const token = localStorage.getItem('token');
        if (!force && token === lastKnownToken) return;

        lastKnownToken = token;

        if (!token) {
            window._smartico_user_id = null;
            window._smartico?.setUserId?.(null);

            localStorage.removeItem('smartico_skin_v3');
            localStorage.removeItem('smartico_control');
            window._smartico.__skinApplied = false;
            lastSuspendState = null;
            return;
        }

        const userId = getPlayerIdFromDataLayer();
        if (userId != null) {
            window._smartico_user_id = userId;
            window._smartico?.setUserId?.(userId);
        }
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

    /* ---------------- skin logic ---------------- */

    function applySkinViaSegment() {
        const token = localStorage.getItem('token');
        if (!token) return; // только авторизованный

        if (window._smartico.__skinApplied) return;

        window._smartico.api.checkSegmentMatch(SEGMENT_ID).then(function (inSegment) {
            if (inSegment === true) {
                window._smartico.setSkin(SKIN_NAME);
                localStorage.setItem('smartico_skin_v3', true);
                window._smartico.__skinApplied = true;
                console.log('[Smartico] Skin applied via segment', SEGMENT_ID);
            }
        });
    }

    function initSkinLogic() {
        let attempts = 0;
        const maxAttempts = 50;

        (function wait() {
            attempts++;

            if (
                window._smartico &&
                window._smartico.api &&
                typeof window._smartico.api.checkSegmentMatch === 'function' &&
                typeof window._smartico.setSkin === 'function'
            ) {
                applySkinViaSegment();
                return;
            }

            if (attempts < maxAttempts) {
                setTimeout(wait, 100);
            }
        })();
    }

    /* ---------------- control flag logic ---------------- */

    function syncSmarticoControl() {
        const token = localStorage.getItem('token');
        if (!token) return; // только авторизованный

        try {
            const profile = window._smartico.api.getUserProfile();
            if (profile && profile.ach_gamification_in_control_group !== undefined) {
                localStorage.setItem(
                    'smartico_control',
                    String(profile.ach_gamification_in_control_group)
                );
                console.log('[Smartico] Control flag saved:', profile.ach_gamification_in_control_group);
            }
        } catch (e) {
            console.warn('[Smartico] Failed to get control flag', e);
        }
    }

    function initSmarticoFlags() {
        let attempts = 0;
        const maxAttempts = 50;

        (function wait() {
            attempts++;

            const token = localStorage.getItem('token');
            if (!token) {
                if (attempts < maxAttempts) setTimeout(wait, 100);
                return;
            }

            if (
                window._smartico &&
                window._smartico.api &&
                typeof window._smartico.api.getUserProfile === 'function'
            ) {
                syncSmarticoControl();
                return;
            }

            if (attempts < maxAttempts) {
                setTimeout(wait, 100);
            }
        })();
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

    /* ---------------- bootstrap ---------------- */

    setLanguage();
    syncSmarticoUser(true);

    if (!window._smartico) {
        const script = document.createElement('script');
        script.src = SMARTICO_SRC;
        script.async = true;

        script.onload = function () {
            if (!window._smartico?.init) return;

            window._smartico.init(PROJECT_KEY, { brand_key: BRAND_KEY });

            syncSmarticoUser(true);
            updateSmarticoSuspension();

            initSkinLogic();      // skin через сегмент
            initSmarticoFlags();   // control flag через API

            setTimeout(handleUrlChange, 0);

            window.dataLayer = window.dataLayer || [];
            window.dataLayer.push({ event: 'smartico_initialized' });
        };

        document.head.appendChild(script);
    }

    /* ---------------- SPA listeners ---------------- */

    window.addEventListener('hashchange', function () {
        handleUrlChange();
        updateSmarticoSuspension();
    });

    window.addEventListener('popstate', function () {
        handleUrlChange();
        updateSmarticoSuspension();
    });

    ['pushState', 'replaceState'].forEach(function (method) {
        const original = history[method];
        history[method] = function () {
            const result = original.apply(this, arguments);
            window.dispatchEvent(new Event(method));
            return result;
        };
    });

    window.addEventListener('pushState', function () {
        handleUrlChange();
        updateSmarticoSuspension();
    });
    window.addEventListener('replaceState', function () {
        handleUrlChange();
        updateSmarticoSuspension();
    });

    window.addEventListener('storage', function (event) {
        if (event.key === 'token') {
            syncSmarticoUser(true);
            updateSmarticoSuspension();
        }
    });

    (function () {
        const originalSetItem = localStorage.setItem;
        const originalRemoveItem = localStorage.removeItem;

        localStorage.setItem = function (key, value) {
            originalSetItem.apply(this, arguments);
            if (key === 'token') {
                syncSmarticoUser(true);
                updateSmarticoSuspension();
            }
        };

        localStorage.removeItem = function (key) {
            originalRemoveItem.apply(this, arguments);
            if (key === 'token') {
                syncSmarticoUser(true);
                updateSmarticoSuspension();
            }
        };
    })();
})();
