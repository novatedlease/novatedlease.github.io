---
title: BYO / Self-Managed Novated Lease — Employer Checker
description: Check whether your employer allows BYO (self-managed) novated lease finance. A community-maintained database of confirmed employer policies.
hide:
  - navigation
  - toc
---

# BYO / Self-Managed Novated Lease — Employer Checker

<style>
.byo-explainer {
  margin: 16px 0 24px 0;
  padding: 14px 16px;
  border: 1px solid rgba(0, 100, 200, 0.25);
  border-left: 4px solid #2b6cb0;
  border-radius: 8px;
  background: rgba(43, 108, 176, 0.05);
  font-size: 0.92em;
  line-height: 1.6;
}

.byo-search-wrap {
  margin: 20px 0 16px 0;
}

#byo-search-input {
  width: 100%;
  padding: 12px 16px;
  font-size: 1em;
  font-family: inherit;
  border: 2px solid rgba(0, 0, 0, 0.2);
  border-radius: 10px;
  outline: none;
  box-sizing: border-box;
  transition: border-color 0.2s, box-shadow 0.2s;
  background: white;
  color: inherit;
}

#byo-search-input:focus {
  border-color: #2b6cb0;
  box-shadow: 0 0 0 3px rgba(43, 108, 176, 0.12);
}

#byo-search-input::placeholder {
  color: rgba(0,0,0,0.38);
}

.byo-result-card {
  margin: 12px 0;
  padding: 16px 18px;
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: 10px;
  background: white;
}

.byo-result-card__name {
  font-size: 1.05em;
  font-weight: 700;
  margin-bottom: 4px;
}

.byo-result-card__group {
  font-size: 0.82em;
  color: rgba(0, 0, 0, 0.48);
  margin-bottom: 10px;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.byo-badge {
  display: inline-block;
  padding: 5px 12px;
  border-radius: 20px;
  font-size: 0.88em;
  font-weight: 600;
  margin-bottom: 4px;
}

.byo-badge--possible {
  background: #e6f4ed;
  color: #1a5c36;
  border: 1px solid rgba(26, 92, 54, 0.2);
}

.byo-badge--partial {
  background: #fef7e0;
  color: #7a4f00;
  border: 1px solid rgba(122, 79, 0, 0.2);
}

.byo-badge--not-available {
  background: #fde9e9;
  color: #8c1c1c;
  border: 1px solid rgba(140, 28, 28, 0.2);
}

.byo-result-card__notes {
  margin-top: 10px;
  font-size: 0.88em;
  color: rgba(0, 0, 0, 0.62);
  line-height: 1.55;
}

.byo-no-results {
  margin: 16px 0;
  padding: 24px 20px;
  border: 1px dashed rgba(0, 0, 0, 0.18);
  border-radius: 10px;
  background: rgba(0, 0, 0, 0.02);
  text-align: center;
}

.byo-no-results__icon {
  font-size: 2em;
  margin-bottom: 8px;
  line-height: 1;
}

.byo-no-results__title {
  font-weight: 700;
  font-size: 1.05em;
  margin-bottom: 10px;
}

.byo-no-results__body {
  font-size: 0.9em;
  color: rgba(0, 0, 0, 0.62);
  line-height: 1.65;
  max-width: 540px;
  margin: 0 auto;
}

.byo-providers-wrap {
  margin: 32px 0 20px 0;
  padding: 18px;
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.7);
}

.byo-providers-wrap__title {
  font-weight: 700;
  font-size: 1.0em;
  margin-bottom: 8px;
}

.byo-providers-wrap__disclaimer {
  font-size: 0.82em;
  color: rgba(0, 0, 0, 0.52);
  margin-bottom: 14px;
  line-height: 1.55;
  font-style: italic;
}

.byo-providers-wrap__grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

@media (max-width: 600px) {
  .byo-providers-wrap__grid {
    grid-template-columns: 1fr;
  }
}

.byo-provider-card {
  display: block;
  padding: 14px 16px;
  border: 1px solid rgba(0, 0, 0, 0.15);
  border-radius: 8px;
  background: white;
  text-decoration: none !important;
  border-bottom: none !important;
  color: inherit !important;
  transition: box-shadow 0.15s, border-color 0.15s;
}

.byo-provider-card:hover {
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.09);
  border-color: rgba(43, 108, 176, 0.4);
}

.byo-provider-card__name {
  font-weight: 700;
  font-size: 1.0em;
  margin-bottom: 4px;
}

.byo-provider-card__desc {
  font-size: 0.85em;
  color: rgba(0, 0, 0, 0.62);
  margin-bottom: 6px;
  line-height: 1.4;
}

.byo-provider-card__community {
  font-size: 0.82em;
  color: rgba(0, 0, 0, 0.55);
  margin-bottom: 6px;
  line-height: 1.4;
}

.byo-provider-card__url {
  font-size: 0.82em;
  color: #2b6cb0;
}

.byo-contribute-box {
  margin: 20px 0;
  padding: 14px 16px;
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.6);
  font-size: 0.9em;
  line-height: 1.6;
}

.byo-db-count {
  font-size: 0.82em;
  color: rgba(0,0,0,0.45);
  margin-bottom: 4px;
}
</style>

**Many employers technically permit BYO (self-managed) novated leases** — where you arrange your own financier rather than using the one bundled by your employer's salary packaging provider.

This option is frequently obscured or actively discouraged by incumbent salary packaging companies, whose revenue includes a margin on bundled finance. In some cases, when asked directly, consultants have been known to deflect or misrepresent whether this option exists.

This page is a community-maintained record of confirmed employer policies.

<div class="byo-explainer">
  <strong>What is BYO / self-managed finance?</strong> In a standard novated lease, the packaging company arranges the financing — typically at a rate that includes their margin. With a BYO or self-managed structure, you source your own finance (usually at a lower market rate), and the salary packaging company handles only the payroll deductions and FBT administration. This can meaningfully reduce the effective interest cost over the life of the lease.
</div>

<div id="byo-checker-root">
  <div class="byo-search-wrap">
    <input type="text" id="byo-search-input" placeholder="Type your employer name (e.g. South Metro Health, Monash Health, NDIA…)" autocomplete="off" spellcheck="false">
  </div>
  <div class="byo-db-count" id="byo-db-count"></div>
  <div id="byo-results-area"></div>
</div>

<div id="byo-providers-section"></div>

<div class="byo-contribute-box">
  <strong>Know of another employer?</strong> If you have first-hand knowledge that your employer permits — or explicitly disallows — BYO finance for novated leases, <a href="/about/contact/">contact me</a> with details and I'll add it to the database.
</div>

<script>
(function () {
  var EMPLOYERS = [
    {
      name: "South Metropolitan Health Service",
      aliases: ["SMHS", "South Metro Health", "South Metro", "South Metropolitan Health", "WA Health", "Fiona Stanley", "Fremantle Hospital"],
      group: "WA Health",
      status: "possible",
      notes: ""
    },
    {
      name: "East Metropolitan Health Service",
      aliases: ["EMHS", "East Metro Health", "East Metro", "East Metropolitan Health", "WA Health", "Royal Perth Hospital", "RPH", "Bentley Hospital", "Armadale Hospital"],
      group: "WA Health",
      status: "possible",
      notes: ""
    },
    {
      name: "North Metropolitan Health Service",
      aliases: ["NMHS", "North Metro Health", "North Metro", "North Metropolitan Health", "WA Health", "King Edward Memorial Hospital", "KEMH", "Sir Charles Gairdner Hospital", "SCGH", "Osborne Park Hospital", "Graylands"],
      group: "WA Health",
      status: "possible",
      notes: ""
    },
    {
      name: "Department of Education WA",
      aliases: ["DoE WA", "WA Education", "WA Dept of Education", "WA Department of Education", "WA schools", "Education WA", "WA public schools"],
      group: "WA Government",
      status: "possible",
      notes: ""
    },
    {
      name: "WA Government",
      aliases: ["Western Australia", "WA Public Service", "WA State Government", "Western Australian Government", "WA Gov", "Western Australian Public Sector", "WAPOL", "WA Police"],
      group: "WA Government",
      status: "possible",
      notes: "Applies broadly across the WA public sector. Individual agency arrangements may vary — confirm with your specific agency's HR or payroll team."
    },
    {
      name: "SA Government",
      aliases: ["South Australia", "SA Public Service", "SA State Government", "South Australian Government", "SA Gov", "South Australian Public Sector", "SAAS", "SA Ambulance"],
      group: "SA Government",
      status: "possible",
      notes: "Applies broadly across the SA public sector. Individual agency arrangements may vary — confirm with your specific agency's HR or payroll team."
    },
    {
      name: "Monash Health",
      aliases: ["Monash Medical Centre", "MMC", "Southern Health", "Monash Medical", "Monash Hospital", "Dandenong Hospital", "Casey Hospital"],
      group: "Victoria",
      status: "possible",
      notes: ""
    },
    {
      name: "Department of Defence",
      aliases: ["DoD", "Defence", "ADF", "Australian Defence Force", "Defence APS", "Dept of Defence", "Dept Defence", "Australian Army", "Royal Australian Navy", "Royal Australian Air Force", "RAAF", "RAN"],
      group: "Australian Federal Government",
      status: "possible",
      notes: ""
    },
    {
      name: "National Disability Insurance Agency",
      aliases: ["NDIA", "NDIS Agency", "National Disability Insurance Scheme Agency", "NDIS"],
      group: "Australian Federal Government",
      status: "possible",
      notes: ""
    },
    {
      name: "Australian Federal Government",
      aliases: ["APS", "Commonwealth Government", "Federal Government", "Australian Government", "Commonwealth", "Australian Public Service", "Canberra"],
      group: "Australian Federal Government",
      status: "partial",
      notes: "Available in some Commonwealth agencies — not universal across the APS. Confirmed for Department of Defence and NDIA (listed separately above). Check with your specific agency's HR."
    }
  ];

  function normalize(s) {
    return s.toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function scoreMatch(employer, rawQuery) {
    var q = normalize(rawQuery);
    if (q.length < 2) return 0;
    var qWords = q.split(' ').filter(function (w) { return w.length >= 2; });
    if (qWords.length === 0) return 0;

    var score = 0;
    var candidates = [employer.name].concat(employer.aliases);

    for (var i = 0; i < candidates.length; i++) {
      var c = normalize(candidates[i]);
      var s = 0;

      if (c === q) {
        s = 100;
      } else if (c.indexOf(q) === 0) {
        s = 72;
      } else if (c.indexOf(q) !== -1) {
        s = 50;
      }

      // Word-level matching
      var cWords = c.split(' ');
      var matchCount = 0;
      for (var j = 0; j < qWords.length; j++) {
        for (var k = 0; k < cWords.length; k++) {
          if (cWords[k].indexOf(qWords[j]) === 0) {
            matchCount++;
            break;
          }
        }
      }
      if (matchCount === qWords.length) {
        s = Math.max(s, 58 + matchCount * 8);
      } else if (matchCount > 0) {
        s = Math.max(s, 12 + matchCount * 7);
      }

      score = Math.max(score, s);
    }
    return score;
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function renderResultCard(e) {
    var statusMap = {
      possible: { label: 'BYO Finance: Available', icon: '✅', cls: 'byo-badge--possible' },
      partial:  { label: 'BYO Finance: Partially available', icon: '⚠️', cls: 'byo-badge--partial' },
      not_available: { label: 'BYO Finance: Not permitted', icon: '❌', cls: 'byo-badge--not-available' }
    };
    var st = statusMap[e.status] || statusMap.partial;
    return '<div class="byo-result-card">' +
      '<div class="byo-result-card__name">' + escapeHtml(e.name) + '</div>' +
      (e.group ? '<div class="byo-result-card__group">' + escapeHtml(e.group) + '</div>' : '') +
      '<div class="byo-badge ' + st.cls + '">' + st.icon + ' ' + st.label + '</div>' +
      (e.notes ? '<div class="byo-result-card__notes">' + escapeHtml(e.notes) + '</div>' : '') +
      '</div>';
  }

  function renderResults(results, query) {
    var container = document.getElementById('byo-results-area');
    if (!container) return;
    if (results === null) {
      container.innerHTML = '';
      return;
    }
    if (results.length === 0) {
      container.innerHTML =
        '<div class="byo-no-results">' +
        '<div class="byo-no-results__icon">🔍</div>' +
        '<div class="byo-no-results__title">Not in our database</div>' +
        '<div class="byo-no-results__body">' +
        'No record found for <strong>' + escapeHtml(query) + '</strong>.<br><br>' +
        'This does not mean BYO finance is unavailable — it simply hasn\'t been reported to us yet. ' +
        'Many employers technically permit it without advertising it.<br><br>' +
        'If you have first-hand knowledge about this employer\'s policy, ' +
        '<a href="/about/contact/">let us know</a> and we\'ll add it.' +
        '</div></div>';
      return;
    }
    container.innerHTML = results.map(function (e) { return renderResultCard(e); }).join('');
  }

  function renderProviders() {
    var providers = [
      {
        name: 'MillarX',
        url: 'https://millarx.com.au',
        desc: 'Specialises in self-managed / BYO novated leases',
        communityHtml: 'Moderator of <a href="https://www.reddit.com/r/NovatedLeasingAU/" target="_blank" rel="noopener">r/NovatedLeasingAU</a>'
      },
      {
        name: 'Lease of Mind',
        url: 'https://leaseofmind.com.au',
        desc: 'Specialises in self-managed / BYO novated leases',
        communityHtml: 'Admin of the <a href="https://www.facebook.com/groups/602788952082399" target="_blank" rel="noopener">Novated Lease Q&amp;A Australia</a> Facebook group'
      }
    ];
    if (Math.random() < 0.5) providers.reverse();

    var section = document.getElementById('byo-providers-section');
    if (!section) return;
    section.innerHTML =
      '<div class="byo-providers-wrap">' +
      '<div class="byo-providers-wrap__title">Providers that specialise in self-managed novated leases</div>' +
      '<div class="byo-providers-wrap__disclaimer">' +
      'These are not the only companies that offer BYO / self-managed novated leases, but both are well represented in Australian personal finance communities, have been consistently helpful in their respective online forums, and have actively contributed to this employer database. ' +
      'I have no affiliation with either provider and receive no referral fees, commissions, or other compensation for including these links. They are listed in randomised order.' +
      '</div>' +
      '<div class="byo-providers-wrap__grid">' +
      providers.map(function (p) {
        return '<a class="byo-provider-card" href="' + escapeHtml(p.url) + '" target="_blank" rel="noopener">' +
          '<div class="byo-provider-card__name">' + escapeHtml(p.name) + '</div>' +
          '<div class="byo-provider-card__desc">' + escapeHtml(p.desc) + '</div>' +
          (p.communityHtml ? '<div class="byo-provider-card__community">' + p.communityHtml + '</div>' : '') +
          '<div class="byo-provider-card__url">' + escapeHtml(p.url.replace('https://', '')) + '</div>' +
          '</a>';
      }).join('') +
      '</div></div>';
  }

  // Show db count
  var countEl = document.getElementById('byo-db-count');
  if (countEl) {
    countEl.textContent = EMPLOYERS.length + ' employers in the database';
  }

  // Init providers
  renderProviders();

  // Search handler
  var input = document.getElementById('byo-search-input');
  if (input) {
    input.addEventListener('input', function () {
      var q = this.value.trim();
      if (q.length < 2) {
        renderResults(null, q);
        return;
      }
      var results = EMPLOYERS
        .map(function (e) { return { e: e, score: scoreMatch(e, q) }; })
        .filter(function (x) { return x.score > 0; })
        .sort(function (a, b) { return b.score - a.score; })
        .map(function (x) { return x.e; });
      renderResults(results, q);
    });
  }
})();
</script>
