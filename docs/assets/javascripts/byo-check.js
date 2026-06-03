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
      name: "Australian Taxation Office",
      aliases: ["ATO", "Tax Office"],
      group: "Australian Federal Government",
      status: "possible",
      notes: ""
    },
    {
      name: "Services Australia",
      aliases: ["Centrelink", "Medicare", "Child Support", "Services Aus"],
      group: "Australian Federal Government",
      status: "possible",
      notes: ""
    },
    {
      name: "Australian Federal Government",
      aliases: ["APS", "Commonwealth Government", "Federal Government", "Australian Government", "Commonwealth", "Australian Public Service", "Canberra"],
      group: "Australian Federal Government",
      status: "partial",
      notes: "Available in some Commonwealth agencies — not universal across the APS. Confirmed for Department of Defence, NDIA, Services Australia, and ATO (listed separately above). Check with your specific agency's HR."
    },
    {
      name: "Sydney Trains",
      aliases: ["Sydney Trains NSW", "Transport for NSW trains"],
      group: "NSW Government",
      status: "possible",
      notes: ""
    },
    {
      name: "Victoria Police",
      aliases: ["Vic Pol", "VicPol", "Victoria Police Force"],
      group: "Victoria",
      status: "not_available",
      notes: ""
    },
    {
      name: "Royal Melbourne Hospital",
      aliases: ["RMH", "Melbourne Health", "The Royal Melbourne"],
      group: "Victoria",
      status: "not_available",
      notes: ""
    },
    {
      name: "Bayside Health",
      aliases: ["Alfred Hospital", "The Alfred", "Alfred Health"],
      group: "Victoria",
      status: "possible",
      notes: "Previously known as Alfred Health / The Alfred Hospital."
    },
    {
      name: "Royal Children's Hospital",
      aliases: ["RCH", "The Royal Children's Hospital Melbourne", "Melbourne Children's Hospital"],
      group: "Victoria",
      status: "possible",
      notes: ""
    },
    {
      name: "Royal Victorian Eye and Ear Hospital",
      aliases: ["RVEEH", "Eye and Ear Hospital", "Victorian Eye and Ear"],
      group: "Victoria",
      status: "not_available",
      notes: ""
    },
    {
      name: "Bendigo Health",
      aliases: ["Bendigo Hospital", "Bendigo Base Hospital", "Anne Caudle Centre", "John Bomford Centre"],
      group: "Victoria",
      status: "possible",
      notes: "Salary packaging via Maxxia. Important lender restriction: Westpac will not allow Maxxia to make payments from Maxxia's own account — Westpac insists the employer make payments directly, which is incompatible with how Maxxia operates. Avoid Westpac as your BYO lender at this employer."
    },
    {
      name: "Western Health",
      aliases: ["Footscray Hospital", "Sunshine Hospital", "Williamstown Hospital", "Sunbury Day Hospital", "Western Health Victoria"],
      group: "Victoria",
      status: "possible",
      notes: ""
    },
    {
      name: "Barwon Health",
      aliases: ["University Hospital Geelong", "Geelong Hospital", "The Geelong Hospital", "UHG", "McKellar Centre", "Andrew Love Cancer Centre", "Barwon Health North"],
      group: "Victoria",
      status: "not_available",
      notes: ""
    },
    {
      name: "NSW Health",
      aliases: ["New South Wales Health", "NSW Health Service", "Health NSW", "Adolescent and Young Adult Hospice Manly", "Albury Wodonga Health [Albury Campus]", "Armidale Hospital", "Auburn Hospital", "Ballina District Hospital", "Balmain Hospital", "Balranald Multi Purpose Service", "Bankstown Lidcombe Hospital", "Baradine Multi Purpose Service", "Barham Hospital", "Barraba Multi Purpose Service", "Batemans Bay Hospital", "Bathurst Base Hospital", "Batlow/Adelong Multi Purpose Service", "Bellinger River District Hospital", "Belmont Hospital", "Berrigan Multi Purpose Service", "Bingara Multi Purpose Service", "Blacktown Hospital", "Blayney Multi Purpose Service", "Blue Mountains Hospital", "Boggabri Multi Purpose Service", "Bombala Multi Purpose Service", "Bonalbo Hospital", "Boorowa Multi Purpose Service", "Bourke Multi Purpose Service", "Bourke Street Health Service", "Bowral Hospital", "Braeside Hospital", "Braidwood Multi Purpose Service", "Brewarrina Multi Purpose Service", "Broken Hill Hospital", "Bulahdelah Hospital", "Bulli Hospital", "Byron Bay Hospital", "Byron Central Hospital", "Calvary Health Care - Sydney", "Calvary Mater Newcastle", "Camden Hospital", "Campbelltown Hospital", "Canowindra Soldiers Memorial Hospital", "Canterbury Hospital", "Casino and District Memorial Hospital", "Cessnock Hospital", "Cobar Health Service", "Coffs Harbour Hospital", "Coledale Hospital", "Collarenebri Multi Purpose Service", "Concord Repatriation Hospital", "Condobolin Health Service", "Coolah Multi Purpose Service", "Coolamon-Ganmain Multi Purpose Service", "Cooma Hospital and Health Service", "Coonabarabran Health Service", "Coonamble Multi Purpose Service", "Cootamundra Hospital", "Coraki Hospital", "Coral Tree Family Centre", "Corowa Health Service", "Cowra Health Service", "Crookwell District Hospital", "Cudal Health Service", "Culcairn Multi Purpose Service", "Cumberland Hospital", "David Berry Hospital", "Delegate Multi Purpose Service", "Deniliquin Hospital", "Denman Multi Purpose Service", "Dorrigo Multi Purpose Service", "Dubbo Hospital", "Dunedoo Multi Purpose Service", "Dungog Hospital", "Eugowra Memorial Multipurpose Service", "Fairfield Hospital", "Finley Hospital", "Gilgandra Multi Purpose Service", "Glen Innes Hospital", "Gloucester Soldiers' Memorial Hospital", "Goodooga Health Service", "Gosford Hospital", "Goulburn Base Hospital", "Gower Wilson Multi Purpose Service", "Grafton Base Hospital", "Greenwich Hospital", "Grenfell Multi Purpose Service", "Griffith Base Hospital", "Gulargambone Multi Purpose Service", "Gulgong Multi Purpose Service", "Gundagai Hospital", "Gunnedah Hospital", "Guyra Multi Purpose Service", "Hawkesbury Hospital", "Hay Hospital", "Henty Multi Purpose Service", "Hillston Hospital", "Holbrook Hospital", "Hornsby Ku-ring-gai Hospital", "Inverell Hospital", "Ivanhoe Hospital", "Jerilderie Multi Purpose Service", "John Hunter Hospital", "Junee Multi Purpose Service", "Justice Health & Forensic Mental Health", "Justice Health Services", "Karitane", "Kempsey District Hospital", "Kenmore Hospital", "Kiama Hospital", "Kurri Kurri Hospital", "Kyogle Multi Purpose Service", "Lachlan Health Service - Forbes", "Lachlan Health Service - Parkes", "Lake Cargelligo Multi Purpose Service", "Leeton Hospital", "Lightning Ridge Multi Purpose Service", "Lismore Base Hospital", "Lithgow Hospital", "Liverpool Hospital", "Lockhart Hospital", "Long Jetty Health Care Centre", "Lourdes Hospital Dubbo", "Macksville District Hospital", "Maclean District Hospital", "Macquarie Hospital", "Maitland Hospital", "Manilla Hospital", "Manly Hospital", "Manning Hospital", "Menindee Health Service", "Mercy Care Hospital - Albury", "Mercy Care Hospital - Young", "Merriwa Multi Purpose Service", "Milton Ulladulla Hospital", "Molong Health Service", "Mona Vale Hospital", "Moree Hospital", "Morisset Hospital", "Moruya Hospital", "Mount Druitt Hospital", "Mudgee Health Service", "Mullumbimby Hospital", "Murrumburrah-Harden Hospital", "Murwillumbah District Hospital", "Muswellbrook Hospital", "Narrabri Hospital", "Narrandera Hospital", "Narromine Health Service", "Nepean Hospital", "Neringah Hospital", "Nimbin Multi Purpose Service", "Northern Beaches Hospital", "Nyngan Multi Purpose Service", "Oberon Multi Purpose Service", "Orange Health Service", "Pambula Hospital", "Peak Hill Multipurpose Service", "Port Kembla Hospital", "Port Macquarie Base Hospital", "Portland Tabulam Health Centre", "Prince of Wales Hospital", "Queanbeyan Hospital", "Quirindi Hospital", "Riverlands Drug and Alcohol Centre", "Royal Hospital for Women", "Royal North Shore Hospital", "Royal Prince Alfred Hospital", "Royal Prince Alfred Institute of Rheumatology & Orthopaedics", "Royal Rehabilitation Hospital", "Ryde Hospital", "Rylstone Multi Purpose Service", "Sacred Heart Health Service", "Scott Memorial Hospital, Scone", "Shellharbour Hospital", "Shoalhaven Hospital", "Singleton Hospital", "South East Regional Hospital", "Springwood Hospital", "St George Hospital NSW", "St Joseph's Hospital", "St Vincent's Health Network", "St Vincent's Hospital [Darlinghurst]", "Sutherland Hospital", "Sydney Children's Hospital", "Sydney Dental Hospital", "Sydney Hospital / Sydney Eye Hospital", "Tamworth Hospital", "Temora Hospital", "Tenterfield Hospital", "The Children's Hospital at Westmead", "The Tweed Hospital", "Thomas Walker Hospital", "Tibooburra Health Service", "Tingha Multi Purpose Service", "Tocumwal Hospital", "Tomaree Community Hospital", "Tottenham Multipurpose Service", "Trangie Multi Purpose Service", "Tresillian Care Centres", "Tresillian Family Care Centre, Kingswood", "Trundle Multi Purpose Health Service", "Tullamore Multi Purpose Health Service", "Tumbarumba Multi Purpose Service", "Tumut Hospital", "Urana Multi Purpose Service", "Urbenville Multi Purpose Service", "Vegetable Creek Multi Purpose Service Emmaville", "Wagga Wagga Hospital", "Walcha Multi Purpose Service", "Walgett Multipurpose Service", "War Memorial Hospital", "Warialda Multi Purpose Service", "Warren Multi Purpose Service", "Wauchope District Memorial Hospital", "Wee Waa Hospital", "Wellington Health Service", "Wentworth Hospital", "Werris Creek Hospital", "Westmead Hospital", "White Cliffs Health Service", "Wilcannia Multi Purpose Service", "Wilson Memorial Community Hospital, Murrurundi", "Wingham Hospital", "Wollongong Hospital", "Woy Woy Hospital", "Wyalong Hospital", "Wyong Hospital", "Yass District Hospital", "Young Hospital"],
      group: "NSW Government",
      status: "not_available",
      notes: ""
    },
    {
      name: "Ambulance Victoria",
      aliases: ["Ambulance VIC", "AV", "Victorian Ambulance"],
      group: "Victoria",
      status: "not_available",
      notes: ""
    },
    {
      name: "Metro Trains Melbourne",
      aliases: ["Metro Trains", "Metro Melbourne", "Melbourne Metro", "MTM"],
      group: "Victoria",
      status: "not_available",
      notes: ""
    },
    {
      name: "V/Line",
      aliases: ["VLine", "V Line", "V-Line", "V/Line Victoria"],
      group: "Victoria",
      status: "not_available",
      notes: ""
    },
    {
      name: "Queensland Health",
      aliases: ["QH", "Queensland Government Health",
        "Atherton Hospital", "Babinda Hospital", "Cairns Hospital", "Innisfail Hospital", "Mareeba Hospital", "Mossman Hospital", "Tully Hospital",
        "Biloela Hospital", "Blackwater Hospital", "Capricorn Coast Hospital", "Yeppoon Hospital", "Emerald Hospital", "Gladstone Hospital", "Mount Morgan Hospital", "Moura Hospital", "Rockhampton Hospital", "Springsure Hospital", "Woorabinda Hospital",
        "Barcaldine Hospital", "Blackall Hospital", "Longreach Hospital", "Winton Hospital",
        "Queensland Children's Hospital", "QCH",
        "Cherbourg Hospital", "Chinchilla Hospital", "Dalby Hospital", "Goondiwindi Hospital", "Kingaroy Hospital", "Miles Hospital", "Murgon Hospital", "Nanango Hospital", "Oakey Hospital", "Stanthorpe Hospital", "Tara Hospital", "Taroom Hospital", "Toowoomba Hospital", "Warwick Hospital",
        "Gold Coast University Hospital", "GCUH", "Robina Hospital",
        "Bowen Hospital", "Clermont Hospital", "Dysart Hospital", "Mackay Base Hospital", "Moranbah Hospital", "Proserpine Hospital", "Sarina Hospital",
        "Caboolture Hospital", "Kilcoy Hospital", "Redcliffe Hospital", "Royal Brisbane and Women's Hospital", "RBWH", "The Prince Charles Hospital", "TPCH", "STARS",
        "Beaudesert Hospital", "Logan Hospital", "Princess Alexandra Hospital", "PAH", "Queen Elizabeth II Jubilee Hospital", "QEII Hospital", "Redland Hospital",
        "Cloncurry Hospital", "Doomadgee Hospital", "Julia Creek Hospital", "Mornington Island Hospital", "Mount Isa Hospital", "Normanton Hospital",
        "Charleville Hospital", "Cunnamulla Hospital", "Roma Hospital", "St George Hospital QLD", "Quilpie Hospital",
        "Caloundra Hospital", "Gympie Hospital", "Maleny Soldiers Memorial Hospital", "Nambour General Hospital", "Sunshine Coast University Hospital", "SCUH",
        "Bamaga Hospital", "Cooktown Hospital", "Thursday Island Hospital", "Weipa Hospital",
        "Ayr Hospital", "Charters Towers Hospital", "Ingham Hospital", "Townsville University Hospital", "TUH",
        "Boonah Hospital", "Esk Hospital", "Gatton Hospital", "Ipswich Hospital", "Laidley Hospital",
        "Bundaberg Hospital", "Childers Hospital", "Gayndah Hospital", "Gin Gin Hospital", "Hervey Bay Hospital", "Maryborough Hospital", "Monto Hospital",
        "Metro North Health", "Metro South Health", "Cairns and Hinterland Hospital and Health Service", "Gold Coast Hospital and Health Service",
        "Darling Downs Hospital and Health Service", "Sunshine Coast Hospital and Health Service", "Townsville Hospital and Health Service",
        "West Moreton Hospital and Health Service", "Wide Bay Hospital and Health Service", "Children's Health Queensland"
      ],
      group: "Queensland Government",
      status: "not_available",
      notes: ""
    },
    {
      name: "Rio Tinto",
      aliases: ["Rio Tinto Group", "Rio Tinto Australia"],
      group: "Mining & Resources",
      status: "not_available",
      notes: ""
    },
    {
      name: "Epworth HealthCare",
      aliases: ["Epworth", "Epworth Richmond", "Epworth Eastern", "Epworth Hawthorn", "Epworth Brighton", "Epworth Camberwell", "Epworth Geelong", "Epworth Cliveden", "Epworth Freemasons", "Epworth Freemasons Clarendon Street", "Epworth Freemasons Victoria Parade", "Epworth Specialist Centre Berwick", "Epworth Specialist Centre Lilydale"],
      group: "Victoria",
      status: "possible",
      notes: ""
    },
    {
      name: "RACV",
      aliases: ["Royal Automobile Club of Victoria"],
      group: "Victoria",
      status: "possible",
      notes: ""
    },
    {
      name: "Brisbane City Council",
      aliases: ["BCC", "Brisbane Council", "Brisbane City", "City of Brisbane"],
      group: "Queensland Local Government",
      status: "not_available",
      notes: "Panel of providers available."
    },
    {
      name: "Logan City Council",
      aliases: ["Logan Council", "Logan City", "Logan", "City of Logan"],
      group: "Queensland Local Government",
      status: "not_available",
      notes: "Panel of providers available."
    },
    {
      name: "Moreton Bay Regional Council",
      aliases: ["MBRC", "Moreton Bay Council", "Moreton Bay"],
      group: "Queensland Local Government",
      status: "not_available",
      notes: "Panel of providers available."
    },
    {
      name: "Woolworths Group",
      aliases: ["Woolworths", "Woolies", "WOW", "Woolworths Supermarkets", "BIG W", "Big W"],
      group: "Retail",
      status: "not_available",
      notes: ""
    },
    {
      name: "Crown Resorts",
      aliases: ["Crown Casino", "Crown Melbourne", "Crown Perth", "Crown Sydney", "Crown Limited"],
      group: "Hospitality",
      status: "not_available",
      notes: ""
    },
    {
      name: "Department of Agriculture, Fisheries and Forestry",
      aliases: ["DAFF", "Dept of Agriculture", "Dept Agriculture", "Australian Department of Agriculture", "Agriculture Fisheries and Forestry", "Dept of Agriculture Fisheries and Forestry"],
      group: "Australian Federal Government",
      status: "not_available",
      notes: "Panel of providers available."
    },
    {
      name: "Sydney Catholic Schools",
      aliases: ["Sydney Catholic Education", "Catholic Education Diocese of Sydney", "SCS", "Archdiocese of Sydney schools", "Catholic Education Office Sydney", "CEO Sydney"],
      group: "NSW Education",
      status: "not_available",
      notes: "Panel of providers available."
    },
    {
      name: "Department of Energy, Environment and Climate Action",
      aliases: ["DEECA", "Dept of Energy Vic", "Department of Energy Victoria", "Victorian Department of Energy", "Energy Environment Climate Action Victoria"],
      group: "Victoria Government",
      status: "not_available",
      notes: "Panel of providers available."
    },
    {
      name: "Queensland Rail",
      aliases: ["QR", "QLD Rail", "Qld Rail", "Queensland Railways"],
      group: "Queensland Government",
      status: "not_available",
      notes: "Panel of providers available."
    },
    {
      name: "City of Adelaide",
      aliases: ["Adelaide City Council", "Adelaide Council", "CoA", "ACC"],
      group: "SA Local Government",
      status: "not_available",
      notes: ""
    },
    {
      name: "Macquarie University",
      aliases: ["Macquarie Uni", "MQU", "MQ", "MQ University", "Macquarie Uni Sydney"],
      group: "NSW Universities",
      status: "not_available",
      notes: ""
    },
    {
      name: "SINCH",
      aliases: ["Sinch Australia", "Sinch AB", "CLX Communications", "MessageMedia"],
      group: "Technology",
      status: "not_available",
      notes: ""
    },
    {
      name: "NSW Department of Customer Service",
      aliases: ["DCS NSW", "Service NSW", "NSW DCS", "Department of Customer Service NSW"],
      group: "NSW Government",
      status: "not_available",
      notes: ""
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
        communityHtml: 'Ex-admin of <a href="https://www.reddit.com/r/NovatedLeasingAU/" target="_blank" rel="noopener">r/NovatedLeasingAU</a>'
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
        return '<div class="byo-provider-card">' +
          '<div class="byo-provider-card__name">' + escapeHtml(p.name) + '</div>' +
          '<div class="byo-provider-card__desc">' + escapeHtml(p.desc) + '</div>' +
          (p.communityHtml ? '<div class="byo-provider-card__community">' + p.communityHtml + '</div>' : '') +
          '<a class="byo-provider-card__url" href="' + escapeHtml(p.url) + '" target="_blank" rel="noopener">' + escapeHtml(p.url.replace('https://', '')) + ' ↗</a>' +
          '</div>';
      }).join('') +
      '</div></div>';
  }

  // db count suppressed intentionally

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
