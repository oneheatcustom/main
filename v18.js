(function () {
    const SMARTICO_SRC = 'https://d1om8bhvvd0l9e.cloudfront.net/s8.js';
    const PROJECT_KEY = 'b9c2f276-be35-4b8c-873a-3237486db424-4';
    const BRAND_KEY = '16b5e781';

    const SKIN_NAME = 'v3_grove_india_15_new';
    const SEGMENT_ID = 35936;

    let smarticoReady = false;
    let lastSuspendState = null;

    /* ---------------- helpers ---------------- */
    const sleep = ms => new Promise(res => setTimeout(res, ms));

    function setLanguage() {
        window._smartico_language = (document.documentElement.lang || 'EN').toUpperCase();
    }

    function isRestrictedPage() {
        const path = location.pathname.replace(/\/+$/, '').toLowerCase();
        return /^\/([a-z]{2}(?:-[a-z]{2})?\/)?(deposit|withdraw)$/.test(path);
    }

    /* ---------------- INIT ---------------- */
    function initSmartico() {
        return new Promise(resolve => {
            if (window._smartico) return resolve();
            const script = document.createElement('script');
            script.src = SMARTICO_SRC;
            script.async = true;
            script.onload = () => {
                window._smartico.init(PROJECT_KEY, { brand_key: BRAND_KEY });
                smarticoReady = true;
                window.dataLayer = window.dataLayer || [];
                window.dataLayer.push({ event: 'smartico_initialized' });
                resolve();
            };
            document.head.appendChild(script);
        });
    }

    /* ---------------- POST LOGIN SETUP ---------------- */
    async function postLoginSetup(userId) {
        if (!userId || !window._smartico) return;

        // 1️⃣ Skin via segment
        if (!window._smartico.__skinApplied) {
            try {
                const inSegment = await window._smartico.api.checkSegmentMatch(SEGMENT_ID);
                if (inSegment) {
                    window._smartico.setSkin(SKIN_NAME);
                    window._smartico.__skinApplied = true;
                    localStorage.setItem('smartico_skin_v3', 'true');
                    console.log('[Smartico] Skin applied via segment', SEGMENT_ID);
                }
            } catch (e) {
                console.warn('[Smartico] Skin apply failed', e);
            }
        }

        // 2️⃣ Control flag with retry
        if (!localStorage.getItem('smartico_control')) {
            let profile = null;
            for (let i = 0; i < 20; i++) {
                try {
                    profile = window._smartico.api.getUserProfile();
                    if (profile && profile.ach_gamification_in_control_group !== undefined) break;
                } catch (e) {}
                await sleep(100);
            }
            if (profile?.ach_gamification_in_control_group !== undefined) {
                localStorage.setItem(
                    'smartico_control',
                    String(profile.ach_gamification_in_control_group)
                );
                console.log('[Smartico] Control group saved:', profile.ach_gamification_in_control_group);
            } else console.warn('[Smartico] Control group not available after retries');
        }

        // 3️⃣ Suspension
        const shouldSuspend = isRestrictedPage();
        if (shouldSuspend !== lastSuspendState) {
            lastSuspendState = shouldSuspend;
            window._smartico.suspendPopups?.(shouldSuspend);
            window._smartico.suspendInbox?.(shouldSuspend);
            window._smartico.suspendMiniGames?.(shouldSuspend);
        }
    }

    /* ---------------- LOGIN / LOGOUT ---------------- */
    async function loginUser(userId) {
        if (!smarticoReady) await initSmartico();
        if (!userId) return;

        window._smartico_user_id = userId;
        window._smartico?.setUserId?.(userId);

        await postLoginSetup(userId);

        window.dataLayer.push({ event: 'smartico_login', userId });
        console.log('[Smartico] logged in:', userId);
    }

    async function logoutUser() {
        if (!smarticoReady) await initSmartico();

        try {
            window._smartico_user_id = null;
        } catch (e) {
            console.warn('[Smartico] Failed to reset user_id', e);
        }

        localStorage.removeItem('smartico_skin_v3');
        localStorage.removeItem('smartico_control');
        lastSuspendState = null;

        window.dataLayer.push({ event: 'smartico_logout' });
        console.log('[Smartico] logged out');
    }

    /* ---------------- SYNC ---------------- */
    async function syncLoginState() {
        const token = localStorage.getItem('token');
        if (token) {
            const userId = getLatestUserIdFromDataLayer();
            await loginUser(userId);
        } else {
            await logoutUser();
        }
    }

    /* ---------------- DataLayer override для SPA ---------------- */
    function getLatestUserIdFromDataLayer() {
        if (!Array.isArray(window.dataLayer)) return null;
        for (let i = window.dataLayer.length - 1; i >= 0; i--) {
            const item = window.dataLayer[i];
            if (item && (item.userID != null || item.userId != null)) return item.userID || item.userId;
        }
        return null;
    }

    (function overrideDataLayerPush() {
        if (!window.dataLayer) window.dataLayer = [];
        const originalPush = window.dataLayer.push.bind(window.dataLayer);

        window.dataLayer.push = function(obj) {
            if (obj?.userID || obj?.userId) {
                const newUserId = obj.userID || obj.userId;
                loginUser(newUserId); // SPA-safe, сразу postLoginSetup
            }
            return originalPush(obj);
        };
    })();

    /* ---------------- SPA / Deep link ---------------- */
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
        window.addEventListener(e, () => handleUrlChange());
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
    syncLoginState();
})();
