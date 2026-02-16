(function () {
    const SMARTICO_SRC = 'https://d1om8bhvvd0l9e.cloudfront.net/s8.js';
    const PROJECT_KEY = 'b9c2f276-be35-4b8c-873a-3237486db424-4';
    const BRAND_KEY = '16b5e781';

    let lastKnownToken = null;
    let smarticoControl = null; // props.ach_gamification_in_control_group
    let widgetObserver = null;

    /* =========================
       HELPERS
    ========================== */

    function getPlayerIdFromDataLayer() {
        if (!Array.isArray(window.dataLayer)) return null;
        for (let i = window.dataLayer.length - 1; i >= 0; i--) {
            const item = window.dataLayer[i];
            if (item?.userID != null) return item.userID;
        }
        return null;
    }

    function setLanguage() {
        window._smartico_language =
            (document.documentElement.lang || 'EN').toUpperCase();
    }

    function isLoggedIn() {
        return !!localStorage.getItem('token');
    }

    /* =========================
       WIDGET VISIBILITY LOGIC
    ========================== */

    function shouldShowWidget() {
        return isLoggedIn() && smarticoControl === false;
    }

    function updateWidgetVisibility() {
        const widget = document.getElementById('smartico-custom-widget');
        if (!widget) return;

        widget.style.display = shouldShowWidget() ? 'flex' : 'none';
    }

    /* =========================
       AUTH SYNC
    ========================== */

    function syncSmarticoUser(force = false) {
        const token = localStorage.getItem('token');
        if (!force && token === lastKnownToken) return;

        lastKnownToken = token;

        if (!token) {
            window._smartico_user_id = null;
            window._smartico?.setUserId?.(null);

            localStorage.removeItem('smartico_skin');
            localStorage.removeItem('smartico_control');

            console.log('[Smartico] User logged out');

            updateWidgetVisibility();
            return;
        }

        const userId = getPlayerIdFromDataLayer();
        if (userId != null) {
            window._smartico_user_id = userId;
            window._smartico?.setUserId?.(userId);
            console.log('[Smartico] User logged in:', userId);
        }

        updateWidgetVisibility();
    }

    /* =========================
       SMARTICO INIT
    ========================== */

    setLanguage();
    syncSmarticoUser(true);

    if (!window._smartico) {
        const script = document.createElement('script');
        script.src = SMARTICO_SRC;
        script.async = true;

        script.onload = function () {
            if (!window._smartico?.init) {
                console.error('[Smartico] SDK not available');
                return;
            }

            window._smartico.init(PROJECT_KEY, { brand_key: BRAND_KEY });

            syncSmarticoUser(true);

            window.dataLayer = window.dataLayer || [];
            window.dataLayer.push({ event: 'smartico_initialized' });

            bindSmarticoEvents();
            handleUrlChange();
            initSmarticoWidget();
        };

        script.onerror = () =>
            console.error('[Smartico] SDK load failed');

        document.head.appendChild(script);
    }

    /* =========================
       SMARTICO EVENTS
    ========================== */

    function bindSmarticoEvents() {
        if (!window._smartico?.on) return;
        if (window._smartico.__eventsBound) return;

        window._smartico.__eventsBound = true;

        function handleProps(props) {

            if (props.ach_gamification_in_control_group !== undefined) {
                smarticoControl = props.ach_gamification_in_control_group;

                localStorage.setItem(
                    'smartico_control',
                    String(smarticoControl)
                );

                updateWidgetVisibility();
            }

            if (props.ach_level_current != null &&
                Number(props.ach_level_current) === 15 &&
                !window._smartico.__skin15Applied
            ) {
                window._smartico.__skin15Applied = true;

                window._smartico.setSkin?.('v3_growe_india_15');
                localStorage.setItem('smartico_skin', 'v3_growe_india_15');

                console.log('[Smartico] Skin 15 applied');
            }
        }

        window._smartico.on('props_change', handleProps);

        if (window._smartico.getUserProps) {
            const currentProps = window._smartico.getUserProps();
            if (currentProps) handleProps(currentProps);
        }
    }

    /* =========================
       SMARTICO HASH TRIGGER
    ========================== */

    function handleUrlChange() {
        const hash = window.location.hash.slice(1);
        if (!hash.startsWith('smartico_dl=')) return;

        const value = hash.replace('smartico_dl=', '');

        if (value && window._smartico?.dp) {
            window._smartico.dp(value);
            window.history.replaceState(
                null,
                document.title,
                window.location.pathname + window.location.search
            );
        }
    }

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

    window.addEventListener('storage', e => {
        if (e.key === 'token') syncSmarticoUser(true);
    });

    setInterval(syncSmarticoUser, 1000);

    /* =========================
       SMARTICO CUSTOM WIDGET
    ========================== */

    function initSmarticoWidget() {
        const TARGET_SELECTOR = '[data-id="2301ef1d-59f8-479d-8122-c8bd541e8775"]';
        const WIDGET_ID = 'smartico-custom-widget';

        function isMyAccountPage() {
            const segments = window.location.pathname
                .replace(/\/+$/, '')
                .split('/')
                .filter(Boolean);

            return (
                (segments.length === 1 && segments[0] === 'my-account') ||
                (segments.length === 2 && segments[1] === 'my-account')
            );
        }

        function createWidget() {
            if (document.getElementById(WIDGET_ID)) return null;

            const button = document.createElement('button');
            button.id = WIDGET_ID;
            button.type = 'button';

            button.style.cssText = `
                display:flex;
                align-items:center;
                width:calc(100% - 20px);
                padding:10px;
                border:none;
                border-radius:12px;
                background-color:var(--background-secondary);
                background-image:url('https://static4.smr.vc/0c08e0b73b684b87bcdcca-DailyLootbox-68860.png');
                background-size:100% 100%;
                background-repeat:no-repeat;
                cursor:pointer;
                overflow:hidden;
            `;

            button.innerHTML = `
                <img src="/content/uploads/Loyalty_Hub_7cd5f6751e.png"
                     width="40" height="40"
                     style="margin-right:16px;">
                <h3 style="margin:0;color:#fff;font-weight:600;">
                    Loyalty Hub
                </h3>
            `;

            button.addEventListener('click', function () {
                window._smartico?.dp?.('dp:gf');
            });

            return button;
        }

        function tryInsert() {
            if (!isMyAccountPage()) return;

            const target = document.querySelector(TARGET_SELECTOR);
            if (!target) return;

            const widget = createWidget();
            if (!widget) return;

            target.after(widget);
            updateWidgetVisibility();
        }

        function startObserver() {
            if (widgetObserver) widgetObserver.disconnect();
            widgetObserver = new MutationObserver(tryInsert);
            widgetObserver.observe(document.body, { childList: true, subtree: true });
            tryInsert();
        }

        function handleRouteChange() {
            if (isMyAccountPage()) startObserver();
            else widgetObserver?.disconnect();
        }

        const originalPushState = history.pushState;
        const originalReplaceState = history.replaceState;

        history.pushState = function () {
            originalPushState.apply(this, arguments);
            setTimeout(handleRouteChange, 50);
        };

        history.replaceState = function () {
            originalReplaceState.apply(this, arguments);
            setTimeout(handleRouteChange, 50);
        };

        window.addEventListener('popstate', handleRouteChange);

        handleRouteChange();
    }

})();
