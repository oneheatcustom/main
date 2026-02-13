(function () {

  const TARGET_SELECTOR = '[data-id="2301ef1d-59f8-479d-8122-c8bd541e8775"]';
  const WIDGET_ID = 'smartico-custom-widget';
  const PATH_REGEX = /(^\/[a-z]{2})?\/my-account$/;

  let observer = null;

  function isCorrectPage() {
    return PATH_REGEX.test(window.location.pathname);
  }

  function waitForSmartico(callback) {

    if (window._smartico) {
      callback();
      return;
    }

    const smarticoObserver = new MutationObserver(() => {
      if (window._smartico) {
        smarticoObserver.disconnect();
        callback();
      }
    });

    smarticoObserver.observe(document.documentElement, {
      childList: true,
      subtree: true
    });
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
      margin:16px 10px;
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
           alt="smartico"
           style="margin-right:16px;">
      <h3 style="margin:0;color:#fff;font-weight:600;">
        Loyalty Hub
      </h3>
      <svg width="24" height="24" viewBox="0 0 24 24"
           fill="none"
           style="margin-left:auto;">
        <path d="M10.5 17.5C9.95 17.5 9.5 17.05 9.5 16.5C9.5 16.24 9.6 15.98 9.8 15.79C10.76 14.84 13.65 12 13.65 12C13.65 12 10.76 9.16 9.8 8.21C9.6 8.01 9.5 7.76 9.5 7.5C9.5 6.95 9.95 6.5 10.5 6.5C10.75 6.5 11.01 6.6 11.2 6.79C12.53 8.09 16.5 12 16.5 12C16.5 12 12.53 15.91 11.2 17.21C11.01 17.4 10.75 17.5 10.5 17.5Z"
              fill="#ffffff"/>
      </svg>
    `;

    // CLICK с fallback
    button.addEventListener('click', function () {

      waitForSmartico(function () {
        window._smartico?.dp('dp:gf');
      });

      window.analytics?.push({
        schema: 'iglu:com.psp/widget_platform_click/jsonschema/5-0-0',
        data: {
          click_type: 'open',
          entity: 'widget',
          widget_name: 'smartico_profile',
          widget_type: 'smartico_profile_my_account_widget_simplified',
          page_name: 'my_account',
          page_type: 'my_account',
          page_id: 'my_account'
        }
      });

    });

    return button;
  }

  function tryInsert() {

    if (!isCorrectPage()) return;

    const target = document.querySelector(TARGET_SELECTOR);
    if (!target) return;

    const widget = createWidget();
    if (!widget) return;

    target.after(widget);

    window.analytics?.push({
      schema: 'iglu:com.psp/widget_platform_view/jsonschema/5-0-0',
      data: {
        entity: 'widget',
        widget_name: 'smartico_profile',
        widget_type: 'smartico_profile_my_account_widget_simplified',
        page_name: 'my_account',
        page_type: 'my_account',
        page_id: 'my_account'
      }
    });
  }

  function startObserver() {

    if (observer) observer.disconnect();

    observer = new MutationObserver(tryInsert);

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    tryInsert();
  }

  function handleRouteChange() {
    if (isCorrectPage()) startObserver();
    else observer?.disconnect();
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

})();
