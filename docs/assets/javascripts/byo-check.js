(function () {
  var EMPLOYERS = [
    {
      name: "WA Health",
      aliases: ["Western Australia Health", "Health WA", "Department of Health WA", "WA Department of Health"],
      group: "WA Health",
      status: "possible",
      notes: "Listed as BYO-eligible by MillarX (Sept 2026). Covers the WA health service providers listed separately here (SMHS, EMHS, NMHS, CAHS, WACHS)."
    },
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
      name: "Child and Adolescent Health Service",
      aliases: ["CAHS", "Perth Children's Hospital", "PCH", "CAMHS", "Child and Adolescent Mental Health Services", "Child and Adolescent Mental Health", "Princess Margaret Hospital", "PMH", "Community Child Health", "Neonatology WA"],
      group: "WA Health",
      status: "possible",
      notes: ""
    },
    {
      name: "WA Country Health Service",
      aliases: ["WACHS", "WA Country Health", "Country Health WA", "Broome Regional Hospital", "Kalgoorlie Health Campus", "Albany Health Campus", "Geraldton Hospital", "Bunbury Hospital", "Midwest Health", "Kimberley Health", "Goldfields Health", "Pilbara Health", "South West Health", "Wheatbelt Health", "Great Southern Health"],
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
      aliases: ["Western Australia", "WA Public Service", "WA State Government", "Western Australian Government", "WA Gov", "Western Australian Public Sector"],
      group: "WA Government",
      status: "possible",
      notes: "Applies broadly across the WA public sector. Individual agency arrangements may vary — confirm with your specific agency's HR or payroll team."
    },
    {
      name: "SA Government",
      aliases: ["South Australia", "SA Public Service", "SA State Government", "South Australian Government", "SA Gov", "South Australian Public Sector", "SAAS", "SA Ambulance"],
      group: "SA Government",
      status: "possible",
      notes: "Applies broadly across the SA public sector. Individual agency arrangements may vary — confirm with your specific agency's HR or payroll team. SA Government compliance rules require any BYO lease to be set up on a 2-month deferred finance method — this is part of the agreement with their salary packaging provider (Smart Salary) to ensure payroll deductions are established within the agreed timeframe."
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
      aliases: ["ATO", "Tax Office", "Australian Tax Office"],
      group: "Australian Federal Government",
      status: "possible",
      notes: ""
    },
    {
      name: "Services Australia",
      aliases: ["Centrelink", "Medicare", "Child Support", "Department of Human Services", "Human Services", "Services Aus"],
      group: "Australian Federal Government",
      status: "possible",
      notes: ""
    },
    {
      name: "Australian Bureau of Statistics",
      aliases: ["ABS", "Statistics Bureau"],
      group: "Australian Federal Government",
      status: "possible",
      notes: ""
    },
    {
      name: "Australian Federal Government",
      aliases: ["APS", "Commonwealth Government", "Federal Government", "Australian Government", "Commonwealth", "Australian Public Service", "Canberra"],
      group: "Australian Federal Government",
      status: "partial",
      notes: "Available in many Commonwealth agencies \u2014 not universal across the APS. Confirmed for Department of Defence, NDIA, Services Australia, ATO, and ABS, and MillarX lists a further 30-odd agencies (each listed separately here). Check with your specific agency's HR."
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
      notes: "Reported here as not permitted, but MillarX (Sept 2026) lists this employer as BYO-eligible. Policies change \u2014 confirm with your payroll or salary packaging team before assuming either way."
    },
    {
      name: "Royal Melbourne Hospital",
      aliases: ["RMH", "Melbourne Health", "The Royal Melbourne"],
      group: "Victoria",
      status: "not_available",
      notes: "Reported here as not permitted, but MillarX (Sept 2026) lists this employer as BYO-eligible. Policies change \u2014 confirm with your payroll or salary packaging team before assuming either way."
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
      name: "Cabrini Health",
      aliases: ["Cabrini", "Cabrini Hospital", "Cabrini Malvern", "Cabrini Brighton"],
      group: "Victoria",
      status: "possible",
      notes: ""
    },
    {
      name: "Barwon Health",
      aliases: ["University Hospital Geelong", "Geelong Hospital", "The Geelong Hospital", "UHG", "McKellar Centre", "Andrew Love Cancer Centre", "Barwon Health North"],
      group: "Victoria",
      status: "not_available",
      notes: "Reported here as not permitted, but MillarX (Sept 2026) lists this employer as BYO-eligible. Policies change \u2014 confirm with your payroll or salary packaging team before assuming either way."
    },
    {
      name: "Goulburn Valley Health",
      aliases: ["GV Health", "Goulburn Valley Base Hospital", "Shepparton Hospital"],
      group: "Victoria",
      status: "possible",
      notes: ""
    },
    {
      name: "NSW Health",
      aliases: ["New South Wales Health", "NSW Health Service", "Health NSW", "Adolescent and Young Adult Hospice Manly", "Albury Wodonga Health [Albury Campus]", "Armidale Hospital", "Auburn Hospital", "Ballina District Hospital", "Balmain Hospital", "Balranald Multi Purpose Service", "Bankstown Lidcombe Hospital", "Baradine Multi Purpose Service", "Barham Hospital", "Barraba Multi Purpose Service", "Batemans Bay Hospital", "Bathurst Base Hospital", "Batlow/Adelong Multi Purpose Service", "Bellinger River District Hospital", "Belmont Hospital", "Berrigan Multi Purpose Service", "Bingara Multi Purpose Service", "Blacktown Hospital", "Blayney Multi Purpose Service", "Blue Mountains Hospital", "Boggabri Multi Purpose Service", "Bombala Multi Purpose Service", "Bonalbo Hospital", "Boorowa Multi Purpose Service", "Bourke Multi Purpose Service", "Bourke Street Health Service", "Bowral Hospital", "Braeside Hospital", "Braidwood Multi Purpose Service", "Brewarrina Multi Purpose Service", "Broken Hill Hospital", "Bulahdelah Hospital", "Bulli Hospital", "Byron Bay Hospital", "Byron Central Hospital", "Calvary Health Care - Sydney", "Calvary Mater Newcastle", "Camden Hospital", "Campbelltown Hospital", "Canowindra Soldiers Memorial Hospital", "Canterbury Hospital", "Casino and District Memorial Hospital", "Cessnock Hospital", "Cobar Health Service", "Coffs Harbour Hospital", "Coledale Hospital", "Collarenebri Multi Purpose Service", "Concord Repatriation Hospital", "Condobolin Health Service", "Coolah Multi Purpose Service", "Coolamon-Ganmain Multi Purpose Service", "Cooma Hospital and Health Service", "Coonabarabran Health Service", "Coonamble Multi Purpose Service", "Cootamundra Hospital", "Coraki Hospital", "Coral Tree Family Centre", "Corowa Health Service", "Cowra Health Service", "Crookwell District Hospital", "Cudal Health Service", "Culcairn Multi Purpose Service", "Cumberland Hospital", "David Berry Hospital", "Delegate Multi Purpose Service", "Deniliquin Hospital", "Denman Multi Purpose Service", "Dorrigo Multi Purpose Service", "Dubbo Hospital", "Dunedoo Multi Purpose Service", "Dungog Hospital", "Eugowra Memorial Multipurpose Service", "Fairfield Hospital", "Finley Hospital", "Gilgandra Multi Purpose Service", "Glen Innes Hospital", "Gloucester Soldiers' Memorial Hospital", "Goodooga Health Service", "Gosford Hospital", "Goulburn Base Hospital", "Gower Wilson Multi Purpose Service", "Grafton Base Hospital", "Greenwich Hospital", "Grenfell Multi Purpose Service", "Griffith Base Hospital", "Gulargambone Multi Purpose Service", "Gulgong Multi Purpose Service", "Gundagai Hospital", "Gunnedah Hospital", "Guyra Multi Purpose Service", "Hawkesbury Hospital", "Hay Hospital", "Henty Multi Purpose Service", "Hillston Hospital", "Holbrook Hospital", "Hornsby Ku-ring-gai Hospital", "Inverell Hospital", "Ivanhoe Hospital", "Jerilderie Multi Purpose Service", "John Hunter Hospital", "Junee Multi Purpose Service", "Justice Health & Forensic Mental Health", "Justice Health Services", "Karitane", "Kempsey District Hospital", "Kenmore Hospital", "Kiama Hospital", "Kurri Kurri Hospital", "Kyogle Multi Purpose Service", "Lachlan Health Service - Forbes", "Lachlan Health Service - Parkes", "Lake Cargelligo Multi Purpose Service", "Leeton Hospital", "Lightning Ridge Multi Purpose Service", "Lismore Base Hospital", "Lithgow Hospital", "Liverpool Hospital", "Lockhart Hospital", "Long Jetty Health Care Centre", "Lourdes Hospital Dubbo", "Macksville District Hospital", "Maclean District Hospital", "Macquarie Hospital", "Maitland Hospital", "Manilla Hospital", "Manly Hospital", "Manning Hospital", "Menindee Health Service", "Mercy Care Hospital - Albury", "Mercy Care Hospital - Young", "Merriwa Multi Purpose Service", "Milton Ulladulla Hospital", "Molong Health Service", "Mona Vale Hospital", "Moree Hospital", "Morisset Hospital", "Moruya Hospital", "Mount Druitt Hospital", "Mudgee Health Service", "Mullumbimby Hospital", "Murrumburrah-Harden Hospital", "Murwillumbah District Hospital", "Muswellbrook Hospital", "Narrabri Hospital", "Narrandera Hospital", "Narromine Health Service", "Nepean Hospital", "Neringah Hospital", "Nimbin Multi Purpose Service", "Northern Beaches Hospital", "Nyngan Multi Purpose Service", "Oberon Multi Purpose Service", "Orange Health Service", "Pambula Hospital", "Peak Hill Multipurpose Service", "Port Kembla Hospital", "Port Macquarie Base Hospital", "Portland Tabulam Health Centre", "Prince of Wales Hospital", "Queanbeyan Hospital", "Quirindi Hospital", "Riverlands Drug and Alcohol Centre", "Royal Hospital for Women", "Royal North Shore Hospital", "Royal Prince Alfred Hospital", "Royal Prince Alfred Institute of Rheumatology & Orthopaedics", "Royal Rehabilitation Hospital", "Ryde Hospital", "Rylstone Multi Purpose Service", "Sacred Heart Health Service", "Scott Memorial Hospital, Scone", "Shellharbour Hospital", "Shoalhaven Hospital", "Singleton Hospital", "South East Regional Hospital", "Springwood Hospital", "St George Hospital NSW", "St Joseph's Hospital", "Sutherland Hospital", "Sydney Children's Hospital", "Sydney Dental Hospital", "Sydney Hospital / Sydney Eye Hospital", "Tamworth Hospital", "Temora Hospital", "Tenterfield Hospital", "The Children's Hospital at Westmead", "The Tweed Hospital", "Thomas Walker Hospital", "Tibooburra Health Service", "Tingha Multi Purpose Service", "Tocumwal Hospital", "Tomaree Community Hospital", "Tottenham Multipurpose Service", "Trangie Multi Purpose Service", "Tresillian Care Centres", "Tresillian Family Care Centre, Kingswood", "Trundle Multi Purpose Health Service", "Tullamore Multi Purpose Health Service", "Tumbarumba Multi Purpose Service", "Tumut Hospital", "Urana Multi Purpose Service", "Urbenville Multi Purpose Service", "Vegetable Creek Multi Purpose Service Emmaville", "Wagga Wagga Hospital", "Walcha Multi Purpose Service", "Walgett Multipurpose Service", "War Memorial Hospital", "Warialda Multi Purpose Service", "Warren Multi Purpose Service", "Wauchope District Memorial Hospital", "Wee Waa Hospital", "Wellington Health Service", "Wentworth Hospital", "Werris Creek Hospital", "Westmead Hospital", "White Cliffs Health Service", "Wilcannia Multi Purpose Service", "Wilson Memorial Community Hospital, Murrurundi", "Wingham Hospital", "Wollongong Hospital", "Woy Woy Hospital", "Wyalong Hospital", "Wyong Hospital", "Yass District Hospital", "Young Hospital"],
      group: "NSW Government",
      status: "not_available",
      notes: "Reported here as not permitted, but MillarX (Sept 2026) lists this employer as BYO-eligible. Policies change \u2014 confirm with your payroll or salary packaging team before assuming either way."
    },
    {
      name: "St Vincent's Health Australia",
      aliases: ["St Vincent's Hospital", "St Vincent's Health Network", "St Vincent's Public Hospital", "St Vincent's Private Hospital", "SVHA", "St Vincent's Hospital Sydney", "St Vincent's Hospital Darlinghurst", "St Vincent's Hospital Melbourne", "St Vincent's Hospital Fitzroy"],
      group: "Healthcare",
      status: "possible",
      notes: "Smart Salary is the exclusive/panel salary packaging provider, but a self-managed (BYO) novated lease is permitted. Applies across all St Vincent's Public and Private sites nationally."
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
      notes: "Reported here as not permitted, but MillarX (Sept 2026) lists this employer as BYO-eligible. Policies change \u2014 confirm with your payroll or salary packaging team before assuming either way."
    },
    {
      name: "Rio Tinto",
      aliases: ["Rio Tinto Group", "Rio Tinto Australia"],
      group: "Mining & Resources",
      status: "not_available",
      notes: ""
    },
    {
      name: "BHP",
      aliases: ["BHP Billiton", "BHP Group"],
      group: "Mining & Resources",
      status: "not_available",
      notes: ""
    },
    {
      name: "Fortescue",
      aliases: ["Fortescue Metals Group", "FMG", "Fortescue Future Industries"],
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
      notes: "Panel of providers available. MillarX (Sept 2026) lists this employer as BYO-eligible, which conflicts with the panel-only report \u2014 confirm with your HR or payroll team."
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
    },
    {
      name: "Thales Group",
      aliases: ["Thales Australia", "Thales Group Australia", "Thales"],
      group: "Defence & Technology",
      status: "not_available",
      notes: ""
    },
    {
      name: "Queensland Government",
      aliases: ["QLD Government", "Qld Government", "Queensland Public Service", "QLD Govt", "Queensland State Government", "Queensland Public Sector"],
      group: "Queensland Government",
      status: "not_available",
      notes: "Reported here as not permitted, but MillarX (Sept 2026) lists this employer as BYO-eligible. Policies change \u2014 confirm with your payroll or salary packaging team before assuming either way."
    },
    {
      name: "Tasmanian Government",
      aliases: ["TAS Government", "Tas Government", "Tasmanian State Service", "TAS Govt", "Tasmania Government", "Tasmanian Public Service", "Tasmanian Public Sector"],
      group: "Tasmanian Government",
      status: "not_available",
      notes: "Reported here as not permitted, but MillarX (Sept 2026) lists this employer as BYO-eligible. Policies change \u2014 confirm with your payroll or salary packaging team before assuming either way."
    },
    {
      name: "NSW Department of Education",
      aliases: ["NSW DoE", "DoE NSW", "Department of Education NSW", "NSW Education Department", "NSW Public Schools", "NSW Schools", "Education NSW"],
      group: "NSW Education",
      status: "not_available",
      notes: "Self-managed novated leases permitted only through Smartleasing or National Australia Bank \u2014 other providers are not accepted. MillarX (Sept 2026) also lists this employer as BYO-eligible."
    },
    {
      name: "Zoetis Australia",
      aliases: ["Zoetis", "Zoetis Inc Australia", "Zoetis Australia Research and Manufacturing"],
      group: "Pharmaceutical",
      status: "not_available",
      notes: "Salary packaging is contracted to an undisclosed exclusive provider — BYO finance is not available."
    },
    {
      name: "RACGP",
      aliases: ["Royal Australian College of General Practitioners", "Royal Australian College of GPs", "Australian College of General Practitioners"],
      group: "Healthcare",
      status: "not_available",
      notes: "Exclusive salary packaging provider (undisclosed) — BYO finance is not available."
    },
    {
      name: "EGIS Group",
      aliases: ["EGIS", "Egis", "Egis Group Australia", "Egis Australia", "Egis Pty Ltd"],
      group: "Engineering & Consulting",
      status: "not_available",
      notes: "Exclusive salary packaging provider (undisclosed) — BYO finance is not available."
    },
    {
      name: "Melbourne Archdiocese Catholic Schools",
      aliases: ["MACS", "Melbourne Catholic Schools", "Catholic Education Melbourne", "Archdiocese of Melbourne schools", "Catholic Education Office Melbourne", "CEM", "Melbourne Archdiocesan Catholic Schools"],
      group: "Victorian Education",
      status: "possible",
      notes: ""
    },
    {
      name: "Department of Education Victoria",
      aliases: ["DET Victoria", "DoE Victoria", "Victorian Department of Education", "VIC Department of Education", "Victoria Education", "Victorian Schools", "VIC Schools", "Victorian public schools"],
      group: "Victorian Education",
      status: "possible",
      notes: ""
    },
    {
      name: "Eastern Health",
      aliases: ["EH", "Box Hill Hospital", "BHH", "Maroondah Hospital", "MH", "Angliss Hospital", "AH", "The Angliss", "Upper Ferntree Gully Hospital", "Healesville & District Hospital", "Healesville and District Hospital", "HDH", "Wantirna Health", "WH", "Yarra Ranges Health", "YRH", "Peter James Centre", "PJC", "Turning Point"],
      group: "Victoria",
      status: "possible",
      notes: ""
    },
    {
      name: "Allianz",
      aliases: ["Allianz Australia", "Allianz Insurance"],
      group: "Insurance",
      status: "not_available",
      notes: ""
    },
    {
      name: "Yarra Valley Water",
      aliases: ["YVW"],
      group: "Victoria",
      status: "possible",
      notes: ""
    },
    {
      name: "Australian Signals Directorate",
      aliases: ["ASD", "Signals Directorate"],
      group: "Australian Federal Government",
      status: "possible",
      notes: ""
    },
    {
      name: "EBOS Group",
      aliases: ["EBOS", "EBOS Healthcare", "Symbion"],
      group: "Healthcare",
      status: "possible",
      notes: ""
    },
    {
      name: "Department of Foreign Affairs and Trade",
      aliases: ["DFAT", "Foreign Affairs and Trade"],
      group: "Australian Federal Government",
      status: "possible",
      notes: ""
    },
    {
      name: "MBB Group",
      aliases: ["MBB"],
      group: "Engineering & Consulting",
      status: "possible",
      notes: ""
    },
    {
      name: "Attorney-General's Department",
      aliases: ["AGD", "Attorney Generals Department", "Attorney-General"],
      group: "Australian Federal Government",
      status: "possible",
      notes: "Listed as BYO-eligible by MillarX (Sept 2026)."
    },
    {
      name: "Australian Border Force",
      aliases: ["ABF", "Border Force"],
      group: "Australian Federal Government",
      status: "possible",
      notes: "Listed as BYO-eligible by MillarX (Sept 2026)."
    },
    {
      name: "Australian Competition and Consumer Commission",
      aliases: ["ACCC"],
      group: "Australian Federal Government",
      status: "possible",
      notes: "Listed as BYO-eligible by MillarX (Sept 2026)."
    },
    {
      name: "Australian Criminal Intelligence Commission",
      aliases: ["ACIC"],
      group: "Australian Federal Government",
      status: "possible",
      notes: "Listed as BYO-eligible by MillarX (Sept 2026)."
    },
    {
      name: "Australian Digital Health Agency",
      aliases: ["ADHA"],
      group: "Australian Federal Government",
      status: "possible",
      notes: "Listed as BYO-eligible by MillarX (Sept 2026)."
    },
    {
      name: "Australian Electoral Commission",
      aliases: ["AEC"],
      group: "Australian Federal Government",
      status: "possible",
      notes: "Listed as BYO-eligible by MillarX (Sept 2026)."
    },
    {
      name: "Australian Federal Police",
      aliases: ["AFP", "Federal Police"],
      group: "Australian Federal Government",
      status: "possible",
      notes: "Listed as BYO-eligible by MillarX (Sept 2026)."
    },
    {
      name: "Australian National Audit Office",
      aliases: ["ANAO", "Audit Office"],
      group: "Australian Federal Government",
      status: "possible",
      notes: "Listed as BYO-eligible by MillarX (Sept 2026)."
    },
    {
      name: "Australian Prudential Regulation Authority",
      aliases: ["APRA"],
      group: "Australian Federal Government",
      status: "possible",
      notes: "Listed as BYO-eligible by MillarX (Sept 2026)."
    },
    {
      name: "Australian Securities and Investments Commission",
      aliases: ["ASIC"],
      group: "Australian Federal Government",
      status: "possible",
      notes: "Listed as BYO-eligible by MillarX (Sept 2026)."
    },
    {
      name: "Australian Trade and Investment Commission",
      aliases: ["Austrade"],
      group: "Australian Federal Government",
      status: "possible",
      notes: "Listed as BYO-eligible by MillarX (Sept 2026)."
    },
    {
      name: "Australian Transaction Reports and Analysis Centre",
      aliases: ["AUSTRAC"],
      group: "Australian Federal Government",
      status: "possible",
      notes: "Listed as BYO-eligible by MillarX (Sept 2026)."
    },
    {
      name: "Bureau of Meteorology",
      aliases: ["BOM", "Weather Bureau"],
      group: "Australian Federal Government",
      status: "possible",
      notes: "Listed as BYO-eligible by MillarX (Sept 2026)."
    },
    {
      name: "Comcare",
      aliases: [],
      group: "Australian Federal Government",
      status: "possible",
      notes: "Listed as BYO-eligible by MillarX (Sept 2026)."
    },
    {
      name: "CSIRO",
      aliases: ["Commonwealth Scientific and Industrial Research Organisation"],
      group: "Australian Federal Government",
      status: "possible",
      notes: "Listed as BYO-eligible by MillarX (Sept 2026)."
    },
    {
      name: "Defence Housing Australia",
      aliases: ["DHA", "Defence Housing"],
      group: "Australian Federal Government",
      status: "possible",
      notes: "Listed as BYO-eligible by MillarX (Sept 2026)."
    },
    {
      name: "Department of Climate Change, Energy, the Environment and Water",
      aliases: ["DCCEEW", "Dept of Climate Change", "Environment Department"],
      group: "Australian Federal Government",
      status: "possible",
      notes: "Listed as BYO-eligible by MillarX (Sept 2026)."
    },
    {
      name: "Department of Education (Federal)",
      aliases: ["Federal Department of Education", "Commonwealth Department of Education", "Australian Government Department of Education"],
      group: "Australian Federal Government",
      status: "possible",
      notes: "Listed as BYO-eligible by MillarX (Sept 2026)."
    },
    {
      name: "Department of Employment and Workplace Relations",
      aliases: ["DEWR", "Dept of Employment", "Workplace Relations"],
      group: "Australian Federal Government",
      status: "possible",
      notes: "Listed as BYO-eligible by MillarX (Sept 2026)."
    },
    {
      name: "Department of Finance",
      aliases: ["Finance Department", "Dept of Finance"],
      group: "Australian Federal Government",
      status: "possible",
      notes: "Listed as BYO-eligible by MillarX (Sept 2026)."
    },
    {
      name: "Department of Health and Aged Care",
      aliases: ["DHAC", "Health and Aged Care", "Federal Health", "Department of Health, Disability and Ageing"],
      group: "Australian Federal Government",
      status: "possible",
      notes: "Listed as BYO-eligible by MillarX (Sept 2026)."
    },
    {
      name: "Department of Home Affairs",
      aliases: ["Home Affairs", "Dept of Home Affairs"],
      group: "Australian Federal Government",
      status: "possible",
      notes: "Listed as BYO-eligible by MillarX (Sept 2026)."
    },
    {
      name: "Department of Industry, Science and Resources",
      aliases: ["DISR", "Dept of Industry"],
      group: "Australian Federal Government",
      status: "possible",
      notes: "Listed as BYO-eligible by MillarX (Sept 2026)."
    },
    {
      name: "Department of Infrastructure, Transport, Regional Development, Communications and the Arts",
      aliases: ["DITRDCA", "Dept of Infrastructure", "Infrastructure Department"],
      group: "Australian Federal Government",
      status: "possible",
      notes: "Listed as BYO-eligible by MillarX (Sept 2026)."
    },
    {
      name: "Department of Social Services",
      aliases: ["DSS", "Social Services", "Dept of Social Services"],
      group: "Australian Federal Government",
      status: "possible",
      notes: "Listed as BYO-eligible by MillarX (Sept 2026)."
    },
    {
      name: "Department of the Prime Minister and Cabinet",
      aliases: ["PM&C", "PMC", "DPMC", "Prime Minister and Cabinet"],
      group: "Australian Federal Government",
      status: "possible",
      notes: "Listed as BYO-eligible by MillarX (Sept 2026)."
    },
    {
      name: "Department of the Treasury",
      aliases: ["Treasury", "The Treasury", "Federal Treasury", "Australian Treasury"],
      group: "Australian Federal Government",
      status: "possible",
      notes: "Listed as BYO-eligible by MillarX (Sept 2026)."
    },
    {
      name: "Department of Veterans' Affairs",
      aliases: ["DVA", "Veterans Affairs", "Dept of Veterans Affairs"],
      group: "Australian Federal Government",
      status: "possible",
      notes: "Listed as BYO-eligible by MillarX (Sept 2026)."
    },
    {
      name: "Geoscience Australia",
      aliases: ["Geoscience"],
      group: "Australian Federal Government",
      status: "possible",
      notes: "Listed as BYO-eligible by MillarX (Sept 2026)."
    },
    {
      name: "IP Australia",
      aliases: ["Intellectual Property Australia", "Patent Office"],
      group: "Australian Federal Government",
      status: "possible",
      notes: "Listed as BYO-eligible by MillarX (Sept 2026)."
    },
    {
      name: "National Indigenous Australians Agency",
      aliases: ["NIAA"],
      group: "Australian Federal Government",
      status: "possible",
      notes: "Listed as BYO-eligible by MillarX (Sept 2026)."
    },
    {
      name: "Reserve Bank of Australia",
      aliases: ["RBA", "Reserve Bank"],
      group: "Australian Federal Government",
      status: "possible",
      notes: "Listed as BYO-eligible by MillarX (Sept 2026)."
    },
    {
      name: "ACT Government",
      aliases: ["Australian Capital Territory Government", "ACT Public Service", "ACTPS"],
      group: "ACT Government",
      status: "possible",
      notes: "Listed as BYO-eligible by MillarX (Sept 2026). Applies broadly across the ACT public sector \u2014 confirm with your specific directorate's HR or payroll team."
    },
    {
      name: "Canberra Health Services",
      aliases: ["ACT Health", "CHS", "Canberra Hospital"],
      group: "ACT Government",
      status: "possible",
      notes: "Listed as BYO-eligible by MillarX (Sept 2026)."
    },
    {
      name: "Northern Territory Government",
      aliases: ["NT Government", "Territory Government", "NTG", "NT Public Sector"],
      group: "NT Government",
      status: "possible",
      notes: "Listed as BYO-eligible by MillarX (Sept 2026). Applies broadly across the NT public sector \u2014 confirm with your specific agency's HR or payroll team."
    },
    {
      name: "NT Health",
      aliases: ["Northern Territory Health", "Department of Health NT", "Royal Darwin Hospital", "Alice Springs Hospital"],
      group: "NT Government",
      status: "possible",
      notes: "Listed as BYO-eligible by MillarX (Sept 2026)."
    },
    {
      name: "Northern Territory Police",
      aliases: ["NT Police", "NTPF"],
      group: "NT Government",
      status: "possible",
      notes: "Listed as BYO-eligible by MillarX (Sept 2026)."
    },
    {
      name: "NSW Government",
      aliases: ["New South Wales Government", "State of NSW", "NSW Public Service", "NSW Public Sector"],
      group: "NSW Government",
      status: "possible",
      notes: "Listed as BYO-eligible by MillarX (Sept 2026). Agency arrangements vary widely in NSW \u2014 several NSW agencies listed separately here have been reported as not permitting BYO. Confirm with your specific agency's HR or payroll team."
    },
    {
      name: "NSW Police Force",
      aliases: ["NSW Police", "New South Wales Police", "NSWPF"],
      group: "NSW Government",
      status: "possible",
      notes: "Listed as BYO-eligible by MillarX (Sept 2026)."
    },
    {
      name: "Transport for NSW",
      aliases: ["TfNSW", "Transport NSW"],
      group: "NSW Government",
      status: "possible",
      notes: "Listed as BYO-eligible by MillarX (Sept 2026)."
    },
    {
      name: "Victorian Government",
      aliases: ["Vic Government", "State Government of Victoria", "State of Victoria", "VPS", "Victorian Public Service"],
      group: "Victoria Government",
      status: "possible",
      notes: "Listed as BYO-eligible by MillarX (Sept 2026). Applies broadly across the Victorian public sector \u2014 individual departments and agencies may vary. Confirm with your specific agency's HR or payroll team."
    },
    {
      name: "Department of Families, Fairness and Housing",
      aliases: ["DFFH", "Families Fairness and Housing"],
      group: "Victoria Government",
      status: "possible",
      notes: "Listed as BYO-eligible by MillarX (Sept 2026)."
    },
    {
      name: "Department of Health (Victoria)",
      aliases: ["Victorian Department of Health", "DH Victoria", "Vic Health Department"],
      group: "Victoria Government",
      status: "possible",
      notes: "Listed as BYO-eligible by MillarX (Sept 2026)."
    },
    {
      name: "Department of Transport and Planning",
      aliases: ["DTP Victoria", "DTP", "Transport and Planning Victoria"],
      group: "Victoria Government",
      status: "possible",
      notes: "Listed as BYO-eligible by MillarX (Sept 2026)."
    },
    {
      name: "Austin Health",
      aliases: ["Austin Hospital", "Heidelberg Repatriation Hospital", "Royal Talbot"],
      group: "Victoria",
      status: "possible",
      notes: "Listed as BYO-eligible by MillarX (Sept 2026)."
    },
    {
      name: "Northern Health",
      aliases: ["Northern Hospital", "Northern Hospital Epping", "Bundoora Centre"],
      group: "Victoria",
      status: "possible",
      notes: "Listed as BYO-eligible by MillarX (Sept 2026)."
    },
    {
      name: "Peninsula Health",
      aliases: ["Frankston Hospital", "Rosebud Hospital"],
      group: "Victoria",
      status: "possible",
      notes: "Listed as BYO-eligible by MillarX (Sept 2026)."
    },
    {
      name: "Marymede Catholic College",
      aliases: ["Marymede", "Marymede College"],
      group: "Victorian Education",
      status: "possible",
      notes: "Listed as BYO-eligible by MillarX (Sept 2026)."
    },
    {
      name: "Department of Education (Queensland)",
      aliases: ["Education Queensland", "Queensland Department of Education", "QLD Education", "Qld Education", "Queensland state schools"],
      group: "Queensland Government",
      status: "possible",
      notes: "Listed as BYO-eligible by MillarX (Sept 2026). Note: Queensland Government more broadly has been reported here as not permitting BYO \u2014 confirm with your school's payroll or HR team."
    },
    {
      name: "Queensland Police Service",
      aliases: ["QPS", "Queensland Police", "QLD Police"],
      group: "Queensland Government",
      status: "possible",
      notes: "Listed as BYO-eligible by MillarX (Sept 2026). Note: Queensland Government more broadly has been reported here as not permitting BYO \u2014 confirm with your payroll or HR team."
    },
    {
      name: "Department for Education (South Australia)",
      aliases: ["SA Education", "Department for Education SA", "SA Dept for Education", "SA public schools"],
      group: "SA Government",
      status: "possible",
      notes: "Listed as BYO-eligible by MillarX (Sept 2026)."
    },
    {
      name: "SA Health",
      aliases: ["South Australia Health", "Royal Adelaide Hospital", "RAH", "Flinders Medical Centre", "Lyell McEwin Hospital", "Women's and Children's Hospital Adelaide"],
      group: "SA Government",
      status: "possible",
      notes: "Listed as BYO-eligible by MillarX (Sept 2026). See the SA Government entry for the 2-month deferred finance requirement."
    },
    {
      name: "South Australia Police",
      aliases: ["SAPOL", "SA Police"],
      group: "SA Government",
      status: "possible",
      notes: "Listed as BYO-eligible by MillarX (Sept 2026)."
    },
    {
      name: "Department for Education, Children and Young People",
      aliases: ["DECYP", "Tasmanian Department of Education", "Tas Education"],
      group: "Tasmanian Government",
      status: "possible",
      notes: "Listed as BYO-eligible by MillarX (Sept 2026). Note: Tasmanian Government more broadly has been reported here as not permitting BYO \u2014 confirm with your payroll or HR team."
    },
    {
      name: "Department of Health (Tasmania)",
      aliases: ["Tasmanian Health", "Tas Health", "Royal Hobart Hospital", "Launceston General Hospital"],
      group: "Tasmanian Government",
      status: "possible",
      notes: "Listed as BYO-eligible by MillarX (Sept 2026). Note: Tasmanian Government more broadly has been reported here as not permitting BYO \u2014 confirm with your payroll or HR team."
    },
    {
      name: "Tasmania Police",
      aliases: ["Tas Police", "Tasmanian Police"],
      group: "Tasmanian Government",
      status: "possible",
      notes: "Listed as BYO-eligible by MillarX (Sept 2026). Note: Tasmanian Government more broadly has been reported here as not permitting BYO \u2014 confirm with your payroll or HR team."
    },
    {
      name: "Western Australia Police Force",
      aliases: ["WA Police", "WA Police Force", "WAPOL"],
      group: "WA Government",
      status: "possible",
      notes: "Listed as BYO-eligible by MillarX (Sept 2026)."
    },
    {
      name: "Catholic Education Victoria",
      aliases: ["Catholic Education Vic", "Catholic Education Victoria", "MACS", "Melbourne Archdiocese Catholic Schools", "Catholic Education Melbourne", "CEM", "CECV", "Catholic Education Commission of Victoria", "Victorian Catholic schools"],
      group: "Victorian Education",
      status: "possible",
      notes: ""
    },
    {
      name: "Department of Education (Commonwealth)",
      aliases: ["Department of Education", "Federal Department of Education", "Australian Government Department of Education", "Commonwealth Department of Education", "DoE"],
      group: "Australian Federal Government",
      status: "possible",
      notes: "Reported as BYO-eligible (Sept 2026) \u2014 most likely the federal department. State education departments are listed separately; confirm with your HR."
    },
    {
      name: "Department of State Development, Infrastructure and Planning (QLD)",
      aliases: ["DSDIP", "State Development QLD", "Queensland Department of State Development", "Department of State Development", "State Development, Infrastructure and Planning", "Dept of State Development"],
      group: "Queensland Government",
      status: "possible",
      notes: ""
    },
    {
      name: "Lindsay Australia",
      aliases: ["Lindsay Transport", "Lindsay Rural", "Lindsay Fresh Logistics", "Lindsay Brothers"],
      group: "Transport & Logistics",
      status: "possible",
      notes: ""
    },
    {
      name: "SA Police",
      aliases: ["SAPOL", "South Australia Police", "South Australian Police", "SA Police Department"],
      group: "SA Government",
      status: "possible",
      notes: ""
    },
    {
      name: "Stannards",
      aliases: ["Stannards Accountants and Advisors", "Stannards Accountants", "Stannards Advisors"],
      group: "Professional Services",
      status: "possible",
      notes: ""
    },
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
          '<a class="byo-provider-card__url" href="' + escapeHtml(p.url) + '" target="_blank" rel="noopener" onclick="if(typeof gtag===\'function\'){gtag(\'event\',\'click\',{event_category:\'byo_provider\',event_label:\'' + escapeHtml(p.name) + '\'})}">' + escapeHtml(p.url.replace('https://', '')) + ' ↗</a>' +
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

  // Template copy button
  var copyBtn = document.getElementById('byo-template-copy-btn');
  var templateEl = document.getElementById('byo-template-text');
  if (copyBtn && templateEl) {
    copyBtn.addEventListener('click', function () {
      var text = templateEl.innerText || templateEl.textContent;
      var done = function () {
        var original = 'Copy text';
        copyBtn.textContent = 'Copied!';
        copyBtn.classList.add('is-copied');
        setTimeout(function () {
          copyBtn.textContent = original;
          copyBtn.classList.remove('is-copied');
        }, 2000);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done, function () {
          fallbackCopy(text, done);
        });
      } else {
        fallbackCopy(text, done);
      }
    });
  }

  function fallbackCopy(text, done) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    try {
      document.execCommand('copy');
      done();
    } catch (e) {
      // ignore — user can still select text manually
    }
    document.body.removeChild(ta);
  }
})();
