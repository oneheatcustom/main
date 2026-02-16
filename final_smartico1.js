(function () {
    const SMARTICO_SRC = 'https://d1om8bhvvd0l9e.cloudfront.net/s8.js';
    const PROJECT_KEY = 'b9c2f276-be35-4b8c-873a-3237486db424-4';
    const BRAND_KEY = '16b5e781';

    let lastKnownToken = null;
    let lastSuspendState = null;

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

    function syncSmarticoUser(force = false) {
        const token = localStorage.getItem('token');
        if (!force && token === lastKnownToken) return;

        lastKnownToken = token;

        if (!token) {
            window._smartico_user_id = null;
            window._smartico?.setUserId?.(null);

            localStorage.removeItem('smartico_skin');
            localStorage.removeItem('smartico_control');

            lastSuspendState = null;
            return;
        }

        const userId = getPlayerIdFromDataLayer();
        if (userId != null) {
            window._smartico_user_id = userId;
            window._smartico?.setUserId?.(userId);
        }
    }

    function isRestrictedPage() {
        const path = window.location.pathname
            .replace(/\/+$/, '')
            .toLowerCase();
        return /^\/([a-z]{2}(?:-[a-z]{2})?\/)?(deposit|withdraw)$/.test(path);
    }

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

    function bindSmarticoEvents() {
        if (!window._smartico?.on) return;
        if (window._smartico.__eventsBound) return;

        window._smartico.__eventsBound = true;

        function handleProps(props) {
            if (props.ach_gamification_in_control_group !== undefined) {
                localStorage.setItem(
                    'smartico_control',
                    String(props.ach_gamification_in_control_group)
                );
            }

            if (
                props.ach_level_current != null &&
                Number(props.ach_level_current) === 15 &&
                !window._smartico.__skin15Applied
            ) {
                window._smartico.__skin15Applied = true;
                if (window._smartico.setSkin) {
                    window._smartico.setSkin('v3_growe_india_15');
                    localStorage.setItem('smartico_skin', 'v3_growe_india_15');
                }
            }
        }

        window._smartico.on('props_change', handleProps);
        if (window._smartico.getUserProps) {
            const currentProps = window._smartico.getUserProps();
            if (currentProps) handleProps(currentProps);
        }
    }

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
            bindSmarticoEvents();
            updateSmarticoSuspension();

            // 🔹 Обрабатываем hash только после init
            setTimeout(handleUrlChange, 0);

            window.dataLayer = window.dataLayer || [];
            window.dataLayer.push({ event: 'smartico_initialized' });
        };

        document.head.appendChild(script);
    }

    // SPA & hash listeners
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
