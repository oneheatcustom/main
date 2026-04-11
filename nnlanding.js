(function () {
  var query = window.location.search;
  var url = window.location.href;

  var nn = query.match(/nnBonus=([^&$]+)/);
  var b = query.match(/bonus=([^&$]+)/);

  var value = (nn && nn[1]) || (b && b[1]) || 'organic';

  value = decodeURIComponent(value);

  if (!value || value === 'null' || value === 'undefined') {
    value = 'organic';
  }

  try {
    localStorage.setItem('custom_nnbonus', value);
  } catch (e) {}

  var shouldPush =
    url.includes('phone-confirmation') &&
    /(?:\?|&|\$)landing=/.test(url);

  if (shouldPush) {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event: 'landing_registration_success'
    });
  }
})();
