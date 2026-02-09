(function(w, d){
  if (w.__redditChecked) return;
  w.__redditChecked = true;

  function getParam(name) {
    var r = new RegExp('[?&]' + name + '=([^&#]*)').exec(location.search);
    return r ? decodeURIComponent(r[1]) : null;
  }

  function setCookie(name, value, days) {
    if (!value) return;
    var expires = "";
    if (days) {
      var date = new Date();
      date.setTime(date.getTime() + (days*24*60*60*1000));
      expires = "; expires=" + date.toUTCString();
    }

    var domainParts = location.hostname.split('.');
    var domain = domainParts.length > 1 ? '.' + domainParts.slice(-2).join('.') : location.hostname;

    document.cookie = name + "=" + value + expires + "; path=/; domain=" + domain;
  }

  function getCookie(name) {
    var match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    return match ? match[2] : null;
  }

  var redditId = getParam('raddit_id') || getCookie('raddit_id');

  if (redditId !== 'a2_ie30vgoc3goy') return;

  // Сохраняем cookie на корневой домен
  setCookie('raddit_id', redditId, 7);

  if (!w.__redditPixelInited) {
    w.__redditPixelInited = true;

    !function(w,d){
      if(!w.rdt){
        var p=w.rdt=function(){
          p.sendEvent ? p.sendEvent.apply(p,arguments) : p.callQueue.push(arguments);
        };
        p.callQueue=[];
        var s=d.createElement("script");
        s.src="https://www.redditstatic.com/ads/pixel.js";
        s.async=true;
        var e=d.getElementsByTagName("script")[0];
        e.parentNode.insertBefore(s,e);
      }
    }(w,d);

    rdt('init', redditId);
    rdt('track','PageVisit');
  }

})(window, document);
