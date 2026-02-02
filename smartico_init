(function () {
    const SMARTICO_SRC = 'https://d1om8bhvvd0l9e.cloudfront.net/s8.js';
    const PROJECT_KEY = 'b9c2f276-be35-4b8c-873a-3237486db424-4';
    const BRAND_KEY = '16b5e781';

    function getPlayerIdFromDataLayer() {
        if (!Array.isArray(window.dataLayer)) return null;

        for (var i = window.dataLayer.length - 1; i >= 0; i--) {
            var userId = window.dataLayer[i].userID;
            if (userId && userId !== 'undefined') {
                return userId;
            }
        }
        return null;
    }

    function setLanguage() {
        window._smartico_language =
            (document.documentElement.lang || 'EN').toUpperCase();
    }

    window._smartico_user_id = getPlayerIdFromDataLayer();
    setLanguage();

    if (window._smartico) return;

    var script = document.createElement('script');
    script.src = SMARTICO_SRC;
    script.async = true;

    script.onerror = function () {
        console.error('[Smartico] SDK load failed');
    };

    script.onload = function () {
        if (!window._smartico || !_smartico.init) return;

        _smartico.init(PROJECT_KEY, {
            brand_key: BRAND_KEY
        });

        /* 🔥 DATA LAYER PUSH */
        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push({
            event: 'smartico_initialized'
        });

        bindSmarticoEvents();
    };

    document.head.appendChild(script);

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

            if (props.ach_level_current === 15 && !_smartico.__skin15Applied) {
                _smartico.__skin15Applied = true;
                _smartico.setSkin('v3_growe_india_15');
            }
        });
    }
})();
