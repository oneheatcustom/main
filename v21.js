(function () {
    const SMARTICO_SRC = 'https://d1om8bhvvd0l9e.cloudfront.net/s8.js';
    const PROJECT_KEY = 'b9c2f276-be35-4b8c-873a-3237486db424-4';
    const BRAND_KEY = '16b5e781';

    const SKIN_NAME = 'v3_grove_india_15_new';
    const SEGMENT_ID = 35936;

    let lastKnownToken = null;
    let lastSuspendState = null;
    let currentUserId = null; // текущий авторизованный userID

    /* ---------------- helpers ---------------- */
    function setLanguage() {
        window._smartico_language = (document.documentElement.lang || 'EN').toUpperCase();
    }

    function isRestrictedPage() {
        const path = window.location.pathname.replace(/\/+$/, '').toLowerCase();
        return /^\/([a-z]{2}(?:-[a-z]{2})?\/)?(deposit|withdraw)$/.test(path);
    }

    /* ---------------- user ID ---------------- */
    function getCurrentUserIdFromDataLayer() {
        if (!Array.isArray(window.dataLayer)) return null;
        for (let i = window.dataLayer.length - 1; i >= 0; i--) {
            const item = window.dataLayer[i];
            if (item && item.userID != null) return item.userID;
        }
        return null;
    }

    /* ---------------- Smartico login/logout ---------------- */
    function loginSmartico(userId) {
        if (!userId || userId === currentUserId) return; // уже залогинен на этого юзера
        currentUserId = userId;
        window._smartico_user_id = userId;
        window._smartico?.setUserId?.(userId);
        postLoginSetup(); // skin + control + suspension
        console.log('[Smartico] logged in:', userId);
        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push({ event: 'smartico_login', userID: userId });
    }

    function logoutSmartico() {
        if (!currentUserId) return; // уже разлогинен
        console.log('[Smartico] logged out:', currentUserId);
        currentUserId = null;
        window._smartico_user_id = null;
        window._smartico?.setUserId?.(null);
        window._smartico?.suspendPopups?.(true);
        window._smartico?.suspendInbox?.(true);
        window._smartico?.suspendMiniGames?.(true);

        localStorage.removeItem('smartico_skin_v3');
        localStorage.removeItem('smartico_control');

        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push({ event: 'smartico_logout' });
    }

    /* ---------------- suspension ---------------- */
    function updateSmarticoSuspension() {
        if (!window._smartico || !currentUserId) return;

        const shouldSuspend = isRestrictedPage();
        if (shouldSuspend === lastSuspendState) return;
        lastSuspendState = shouldSuspend;

        window._smartico.suspendPopups?.(shouldSuspend);
        window._smartico.suspendInbox?.(shouldSuspend);
        window._smartico.suspendMiniGames?.(shouldSuspend);
    }

    /* ---------------- skin logic ---------------- */
    function applySkinViaSegment() {
        if (!currentUserId || window._smartico?.__skinApplied) return;

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
            if (attempts < maxAttempts) setTimeout(wait, 100);
        })();
    }

    /* ---------------- control flag ---------------- */
    function syncSmarticoControl() {
        if (!currentUserId) return;

        const currentControl = localStorage.getItem('smartico_control');
        if (currentControl !== null) return; // уже есть значение

        try {
            const profile = window._smartico?.api.getUserProfile?.();
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

    /* ---------------- post login setup ---------------- */
    function postLoginSetup() {
        initSkinLogic();
        syncSmarticoControl();
        updateSmarticoSuspension();
        handleUrlChange();
    }

    /* ---------------- deep link ---------------- */
    function handleUrlChange() {
        const hash = window.location.hash;
        if (!hash || !hash.startsWith('#smartico_dl=')) return;
        if (!window._smartico?.dp) return;

        const value = hash.replace('#smartico_dl=', '');
        if (!value) return;

        window._smartico.dp(value);
        history.replaceState(null, document.title, window.location.pathname + window.location.search);
    }

    /* ---------------- bootstrap ---------------- */
    setLanguage();

    // SPA-safe: слушаем изменение токена
    function handleAuthChange() {
        const token = localStorage.getItem('token');
        if (!token) {
            logoutSmartico();
        } else {
            const userId = getCurrentUserIdFromDataLayer();
            loginSmartico(userId);
        }
    }

    handleAuthChange(); // сразу при загрузке

    window.addEventListener('storage', (e) => {
        if (e.key === 'token') handleAuthChange();
    });

    // SPA navigation
    ['hashchange', 'popstate', 'pushState', 'replaceState'].forEach(event => {
        window.addEventListener(event, () => {
            if (currentUserId) postLoginSetup();
        });
    });

    // обертка pushState/replaceState
    ['pushState', 'replaceState'].forEach(function (method) {
        const original = history[method];
        history[method] = function () {
            const result = original.apply(this, arguments);
            window.dispatchEvent(new Event(method));
            return result;
        };
    });

    // загрузка скрипта Smartico
    if (!window._smartico) {
        const script = document.createElement('script');
        script.src = SMARTICO_SRC;
        script.async = true;
        script.onload = function () {
            if (!window._smartico?.init) return;
            window._smartico.init(PROJECT_KEY, { brand_key: BRAND_KEY });
            console.log('[Smartico] initialized');
        };
        document.head.appendChild(script);
    }
})();
