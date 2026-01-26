(function () {
    const SMARTICO_SRC = 'https://d1om8bhvvd0l9e.cloudfront.net/s8.js';
    const PROJECT_KEY = 'b9c2f276-be35-4b8c-873a-3237486db424-4';
    const BRAND_KEY = '66bddfd9';

    /* =========================
       Utils
    ========================== */

    function getPlayerIdFromDataLayer() {
        if (!Array.isArray(window.dataLayer)) return null;

        for (let i = window.dataLayer.length - 1; i >= 0; i--) {
            const userId = window.dataLayer[i]?.userID;
            if (userId && userId !== 'undefined') {
                return userId;
            }
        }
        return null;
    }

    function setLanguage() {
        window._smartico_language =
            document.documentElement.lang?.toUpperCase() || 'EN';
    }

    /* =========================
       Prepare globals BEFORE SDK
    ========================== */

    window._smartico_user_id = getPlayerIdFromDataLayer();
    setLanguage();

    /* =========================
       Load SDK
    ========================== */

    if (window._smartico) return;

    const script = document.createElement('script');
    script.src = SMARTICO_SRC;
    script.async = true;

    script.onerror = () => {
        console.error('[Smartico] SDK load failed');
    };

    script.onload = function () {
        if (!_smartico?.init) return;

        _smartico.init(PROJECT_KEY, {
            brand_key: BRAND_KEY
        });

        bindSmarticoEvents();
    };

    document.head.appendChild(script);

    /* =========================
       Events
    ========================== */

    function bindSmarticoEvents() {
        if (_smartico.__eventsBound) return;
        _smartico.__eventsBound = true;

        _smartico.on('props_change', function (props) {

            if (props.ach_gamification_in_control_group !== undefined) {
                localStorage.setItem(
                    'smartico_control',
                    String(props.ach_gamification_in_control_group)
                );
            }

            if (
                props.ach_level_current === 15 &&
                !_smartico.__skin15Applied
            ) {
                _smartico.__skin15Applied = true;
                _smartico.setSkin('v3_growe_india_15');
            }
        });
    }
})();
