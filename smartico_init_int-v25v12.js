(function () {
    const SMARTICO_SRC = 'https://d1om8bhvvd0l9e.cloudfront.net/s8.js';
    const PROJECT_KEY = 'b9c2f276-be35-4b8c-873a-3237486db424-4';
    const BRAND_KEY = '16b5e781';
    const SKIN_NAME = 'v3_grove_india_15_new';
    const SEGMENT_ID = 35936;

    let smarticoReady = false;
    let currentUserId = null;
    let lastSuspendState = null;

    /* ---------------- HELPERS ---------------- */
    function setLanguage() { window._smartico_language = (document.documentElement.lang || 'EN').toUpperCase(); }
    function isRestrictedPage() { 
        const path = location.pathname.replace(/\/+$/, '').toLowerCase();
        return /^\/([a-z]{2}(?:-[a-z]{2})?\/)?(deposit|withdraw)$/.test(path); 
    }

    /* ---------------- LIGHT CONTROL FLAG ---------------- */
    let isControlSyncing = false;
    function syncSmarticoControlLight() {
        if (localStorage.getItem('smartico_control') !== null) return;
        if (isControlSyncing) return;

        isControlSyncing = true;
        let attempts = 0;

        (function waitForProfile() {
            attempts++;

            const api = window._smartico?.api;
            const profileFunc = api?.getUserProfile;

            if (profileFunc && typeof profileFunc === 'function') {
                try {
                    const result = profileFunc();
                    if (result && typeof result.then === 'function') {
                        result.then(profile => {
                            if (profile?.ach_gamification_in_control_group !== undefined) {
                                localStorage.setItem('smartico_control', String(profile.ach_gamification_in_control_group));
                                console.log('[Smartico] control flag saved (light, SPA, async)');
                            }
                            isControlSyncing = false;
                        }).catch(e => {
                            console.warn('[Smartico] Error fetching control flag (async)', e);
                            isControlSyncing = false;
                        });
                    } else {
                        const profile = result;
                        if (profile?.ach_gamification_in_control_group !== undefined) {
                            localStorage.setItem('smartico_control', String(profile.ach_gamification_in_control_group));
                            console.log('[Smartico] control flag saved (light, SPA, sync)');
                        }
                        isControlSyncing = false;
                    }
                } catch (e) {
                    console.warn('[Smartico] Error fetching control flag', e);
                    isControlSyncing = false;
                }
                return;
            }

            if (attempts < 50) setTimeout(waitForProfile, 100);
            else {
                console.warn('[Smartico] API not ready, control flag not set after waiting');
                isControlSyncing = false;
            }
        })();
    }

    /* ---------------- LIGHT SKIN ---------------- */
    let isSkinApplying = false;
    function applySkinViaSegmentLight() {
        if (window._smartico?.__skinApplied) return;
        if (localStorage.getItem('smartico_skin_v3') === 'true') return;
        if (isSkinApplying) return;

        isSkinApplying = true;
        let attempts = 0;

        (function waitForAPI() {
            attempts++;
            const apiReady = window._smartico?.api?.checkSegmentMatch;
            if (apiReady) {
                window._smartico.api.checkSegmentMatch(SEGMENT_ID)
                    .then(inSegment => {
                        if (inSegment === true) {
                            window._smartico.setSkin(SKIN_NAME);
                            localStorage.setItem('smartico_skin_v3', 'true');
                            window._smartico.__skinApplied = true;
                            console.log('[Smartico] Skin applied (light, SPA)');
                        }
                        isSkinApplying = false;
                    })
                    .catch(e => {
                        console.warn('[Smartico] Error applying skin', e);
                        isSkinApplying = false;
                    });
                return;
            }
            if (attempts < 50) setTimeout(waitForAPI, 100);
            else {
                console.warn('[Smartico] API not ready, skin not applied after waiting');
                isSkinApplying = false;
            }
        })();
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
        };
        document.head.appendChild(script);
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
            syncSmarticoControlLight();   // лёгкая версия control flag
            applySkinViaSegmentLight();   // лёгкая версия skin
        });
    });

    /* ---------------- BOOT ---------------- */
    setLanguage();
    initSmartico();
})();
