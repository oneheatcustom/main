(function () {
  var style = document.createElement("style");
  style.textContent = `
    .smartico-raffle-banner {
      display: flex;
      align-items: center;
      background: rgba(0, 0, 0, 0.9);
      border-radius: 4px;
      padding: 6px 12px;
      margin: 2px 0;
      cursor: pointer;
      font-family: 'Parimatch Sans', sans-serif;
      width: fit-content;
      min-width: 220px;
      border: 1px solid #F8FF13;
      z-index: 100;
      position: relative;
    }
    .smartico-raffle-icon {
      width: 22px;
      height: 22px;
      margin-right: 10px;
      background-image: url('https://static4.smr.vc/73269dcf4653fd28cc7fa2-freepik__3d-icon-of-a-mechanical-digital-acorn-in-cyberpunk__40860copy11.webp'); 
      background-size: contain;
      background-repeat: no-repeat;
      background-position: center;
    }
    .smartico-raffle-label {
      font-size: 13px;
      font-weight: 700;
      color: #ffffff;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      white-space: nowrap;
    }
    .smartico-raffle-value {
      color: #ffffff; 
      margin-left: 6px;
      font-weight: 700;
    }
  `;
  document.head.appendChild(style);
  function isTargetGame() {
    return window.location.pathname.includes('/slots/game/3oaks');
  }
  function renderRaffleInfo(count) {
    const is3Oaks = isTargetGame();
    var existing = document.querySelector('.smartico-raffle-banner');
    if (!is3Oaks) {
      if (existing) existing.remove();
      return;
    }
    var anchor = document.querySelector('[data-id="46612684-2660-49b4-a9b5-61bb21b44bb8"]');
    if (!anchor) return;
    if (existing) {
      var val = existing.querySelector('.smartico-raffle-value');
      if (val && val.innerText != count) val.innerText = count;
      return;
    }
    var banner = document.createElement("div");
    banner.className = "smartico-raffle-banner";
    banner.innerHTML = `
      <div class="smartico-raffle-icon"></div>
      <div class="smartico-raffle-label">
        Lottery tickets: <span class="smartico-raffle-value">${count}</span>
      </div>
    `;
    banner.onclick = function() {
      var url = "dp:gf_section&id=1137";
      if (window._smartico && window._smartico.dp) {
        window._smartico.dp(url);
      } else {
        window.location.hash = "smartico_dl=" + url;
      }
    };
    anchor.parentNode.insertBefore(banner, anchor.nextSibling);
  }
function updateData() {
    if (!isTargetGame()) {
      var existing = document.querySelector('.smartico-raffle-banner');
      if (existing) existing.remove();
      return;
    }
    if (window._smartico && window._smartico.api && window._smartico.api.getRaffles) {
      window._smartico.api.getRaffles().then(function (raffles) {
        if (raffles && raffles.length > 0) {
        
          var lotteryGroup = raffles.find(r => r.name.includes("3 Oaks"));
          
          if (lotteryGroup && lotteryGroup.draws) {
           
            var grandLottery = lotteryGroup.draws.find(d => d.name.includes("Grand"));
            
            if (grandLottery) {
              renderRaffleInfo(grandLottery.my_tickets_count || 0);
            }
          }
        }
      });
    }
  }
  setInterval(updateData, 1500);
  updateData();
})();
