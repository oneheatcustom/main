(function () {
    const SMARTICO_SRC = 'https://d1om8bhvvd0l9e.cloudfront.net/s8.js';
    const PROJECT_KEY = 'b9c2f276-be35-4b8c-873a-3237486db424-4';
    const BRAND_KEY = '16b5e781';

    let lastKnownToken = null;

    /* =========================
       HELPERS
    ========================== */

    function getPlayerIdFromDataLayer() {
        if (!Array.isArray(window.dataLayer)) return null;

        for (let i = window.dataLayer.length - 1; i >= 0; i--) {
            const layerItem = window.dataLayer[i];
            if (!layerItem) continue;

            const userId = layerItem.userID;
            if (userId != null) return userId;
        }

        return null;
    }

    function setLanguage() {
        window._smartico_language =
            (document.documentElement.lang || 'EN').toUpperCase();
    }

    /* =========================
       AUTH SYNC
    ========================== */

    function syncSmarticoUser(force = false) {
        const token = localStorage.getItem('token');

        if (!force && token === lastKnownToken) return;

        lastKnownToken = token;

        // ===== LOGOUT =====
        if (!token) {
            window._smartico_user_id = null;

            if (window._smartico && typeof window._smartico.setUserId === 'function') {
                window._smartico.setUserId(null);
            }

            console.log('[Smartico] User logged out');
            return;
        }

        // ===== LOGIN =====
        const userId = getPlayerIdFromDataLayer();

        if (userId != null) {
            window._smartico_user_id = userId;

            if (window._smartico && typeof window._smartico.setUserId === 'function') {
                window._smartico.setUserId(userId);
            }

            console.log('[Smartico] User logged in:', userId);
        }
    }

    /* =========================
       SMARTICO INIT
    ========================== */

    setLanguage();
    syncSmarticoUser(true);

    if (window._smartico) return;

    const script = document.createElement('script');
    script.src = SMARTICO_SRC;
    script.async = true;

    script.onerror = function () {
        console.error('[Smartico] SDK load failed');
    };

    script.onload = function () {
        if (!window._smartico || typeof window._smartico.init !== 'function') {
            console.error('[Smartico] SDK not available after load');
            return;
        }

        window._smartico.init(PROJECT_KEY, {
            brand_key: BRAND_KEY
        });

        syncSmarticoUser(true);

        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push({
            event: 'smartico_initialized'
        });

        bindSmarticoEvents();
        handleUrlChange();
    };

    document.head.appendChild(script);

    /* =========================
       SMARTICO EVENTS
    ========================== */

    function bindSmarticoEvents() {
        if (!window._smartico || typeof window._smartico.on !== 'function') return;
        if (window._smartico.__eventsBound) return;

        window._smartico.__eventsBound = true;

        window._smartico.on('props_change', function (props) {
            if (props.ach_gamification_in_control_group !== undefined) {
                localStorage.setItem(
                    'smartico_control',
                    String(props.ach_gamification_in_control_group)
                );
            }

            if (props.ach_level_current === 15 && !window._smartico.__skin15Applied) {
                window._smartico.__skin15Applied = true;
                window._smartico.setSkin('v3_growe_india_15');
            }
        });
    }

    /* =========================
       SMARTICO DL (hash trigger)
    ========================== */

    function handleUrlChange() {
        const hash = window.location.hash.slice(1);
        if (!hash.startsWith('smartico_dl=')) return;

        const value = hash.replace('smartico_dl=', '');

        if (value && window._smartico && typeof window._smartico.dp === 'function') {
            window._smartico.dp(value);

            window.history.replaceState(
                null,
                document.title,
                window.location.pathname + window.location.search
            );
        }
    }

    /* =========================
       SPA LISTENERS
    ========================== */

    window.addEventListener('hashchange', handleUrlChange);
    window.addEventListener('popstate', handleUrlChange);

    ['pushState', 'replaceState'].forEach(method => {
        const original = history[method];
        history[method] = function () {
            const result = original.apply(this, arguments);
            window.dispatchEvent(new Event(method));
            return result;
        };
    });

    window.addEventListener('pushState', handleUrlChange);
    window.addEventListener('replaceState', handleUrlChange);

    /* =========================
       TOKEN WATCHERS
    ========================== */

    // 1️⃣ Между вкладками
    window.addEventListener('storage', function (event) {
        if (event.key === 'token') {
            syncSmarticoUser(true);
        }
    });

    // 2️⃣ В текущей вкладке (лёгкий polling)
    setInterval(function () {
        syncSmarticoUser();
    }, 1000);

})();
