(function () {
  var query = window.location.search;
  var url = window.location.href;

  var nn = query.match(/nnBonus=([^&$]+)/);
  var b = query.match(/bonus=([^&$]+)/);

  var hasBonusParam = nn || b;

  if (hasBonusParam) {
    var value = (nn && nn[1]) || (b && b[1]);

    value = decodeURIComponent(value);

    if (!value || value === 'null' || value === 'undefined') {
      value = 'organic';
    }

    try {
      localStorage.setItem('custom_nnbonus', value);
    } catch (e) {}
  }

  var hasLanding = /(?:\?|&|\$)landing=/.test(url);
  var isPhoneConfirmation = url.includes('phone-confirmation');

  if (isPhoneConfirmation && hasLanding) {
    localStorage.setItem("isNewRegistration", true);

    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event: 'landing_registration_success'
    });
  }
  if (!isPhoneConfirmation && hasLanding) {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event: 'landing_login_success'
    });
  }
})();
