(function (w, d) {
  if (w.__redditChecked) return;
  w.__redditChecked = true;

  function getParam(name) {
    var r = new RegExp('[?&]' + name + '=([^&#]*)').exec(location.search);
    return r ? decodeURIComponent(r[1]) : null;
  }

  var redditId = getParam('raddit_id');

  if (redditId !== 'a2_ie30vgoc3goy') return;

  if (w.__redditPixelInited) return;
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
  rdt('track', 'PageVisit');

})(window, document);
