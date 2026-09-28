// Fills live figures into the static SEO pages. The pages are complete
// without it; this only adds today's prices and reactor status.
(function () {
  function fmtPrice(value) {
    return Number.isFinite(value) && value > 0 ? "$" + value.toFixed(2) : "—";
  }
  function fmtPct(value) {
    if (!Number.isFinite(value)) return "—";
    return (value >= 0 ? "+" : "") + value.toFixed(2) + "%";
  }
  function escapeHtml(text) {
    return String(text).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  var tickerCells = document.querySelectorAll("[data-price]");
  if (tickerCells.length) {
    var tickers = Array.prototype.map.call(tickerCells, function (el) { return el.getAttribute("data-price"); });
    fetch("/api/market/quotes?tickers=" + encodeURIComponent(tickers.join(",")))
      .then(function (res) { return res.ok ? res.json() : null; })
      .then(function (payload) {
        var quotes = (payload && payload.quotes) || {};
        tickerCells.forEach(function (el) {
          var q = quotes[el.getAttribute("data-price")];
          if (!q) return;
          el.textContent = fmtPrice(q.price);
          var pctCell = el.parentElement.querySelector("[data-pct]");
          if (pctCell) {
            pctCell.textContent = fmtPct(q.pct);
            pctCell.className = "num " + (q.pct >= 0 ? "up" : "down");
          }
        });
        var stamp = document.querySelector("[data-updated]");
        if (stamp && payload && payload.fetchedAt) {
          stamp.textContent = "Prices updated " + new Date(payload.fetchedAt).toLocaleString();
        }
      })
      .catch(function () {});
  }

  var fleetTable = document.querySelector("[data-fleet]");
  if (fleetTable) {
    fetch("/api/news")
      .then(function (res) { return res.ok ? res.json() : null; })
      .then(function (payload) {
        var fleet = payload && payload.fleet;
        if (!fleet || !Array.isArray(fleet.units)) return;
        var units = fleet.units.slice().sort(function (a, b) { return a.power - b.power || a.unit.localeCompare(b.unit); });
        var offline = units.filter(function (u) { return u.power === 0; }).length;
        var reduced = units.filter(function (u) { return u.power > 0 && u.power < 100; }).length;
        var set = function (key, value) {
          var el = document.querySelector('[data-stat="' + key + '"]');
          if (el) el.textContent = value;
        };
        set("total", units.length);
        set("offline", offline);
        set("reduced", reduced);
        set("full", units.length - offline - reduced);
        var date = document.querySelector("[data-report-date]");
        if (date && fleet.reportDate) date.textContent = "NRC report for " + fleet.reportDate;
        fleetTable.querySelector("tbody").innerHTML = units.map(function (u) {
          var state = u.power === 0 ? '<span class="pill down">Offline</span>'
            : u.power < 100 ? '<span class="pill" style="color:var(--gold)">Reduced</span>'
            : '<span class="pill up">Full power</span>';
          return "<tr><td>" + escapeHtml(u.unit) + "</td>" +
            '<td class="num"><span class="bar"><i style="width:' + Math.max(0, Math.min(100, u.power)) + '%"></i></span>' + u.power + "%</td>" +
            "<td>" + state + "</td></tr>";
        }).join("");
      })
      .catch(function () {});
  }
})();
