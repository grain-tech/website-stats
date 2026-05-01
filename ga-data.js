// ga-data.js — Fetches live GA4 data for the Missing Recipes dashboard
(function() {
  // ─── CONFIG ───
  // Find your GA4 property ID: GA4 Admin > Property Settings > Property ID
  const PROPERTY_ID = '';  // e.g. '123456789'
  const START_DATE = '2026-04-17';
  const PAGE_PATH = '/missing-recipes';
  const API = 'https://analyticsdata.googleapis.com/v1beta/properties';

  // Recipe display config
  const RECIPE_META = {
    'The PB&J':           { color: '#FECC07', img: 'assets/dishes/pbj.jpg' },
    'Loaded Antipasti Focaccia': { color: '#F8D86F', img: 'assets/dishes/antipasti.jpg' },
    'Confit Salmon Cubes and Pumpkin': { color: '#31AA88', img: 'assets/dishes/salmon.jpg' },
    'Wok-Fried Lotus Root and Black Fungus': { color: '#8CD9C3', img: 'assets/dishes/lotus.jpg' },
    'Sober San Bei Chicken': { color: '#E0DCD7', img: 'assets/dishes/sanbei.jpg' },
  };
  const RECIPE_COLORS = ['#FECC07','#F8D86F','#31AA88','#8CD9C3','#E0DCD7'];
  const REFERRER_COLORS = ['var(--yellow)','var(--yellow)','var(--yellow)','#e8dbb0','#e5e2dd'];
  const FUNNEL_COLORS = ['#d5cfc5','#ddd5b8','#e2d9a8','#e8dd98','#f2c744'];
  const DEVICE_COLORS = { mobile:'var(--yellow)', desktop:'var(--grey-line)', tablet:'#e8dbb0' };

  function pageFilter() {
    return { filter: { fieldName:'pagePath', stringFilter:{ matchType:'BEGINS_WITH', value:PAGE_PATH } } };
  }

  function eventFilter(eventName) {
    return { andGroup:{ expressions:[
      { filter:{ fieldName:'pagePath', stringFilter:{ matchType:'BEGINS_WITH', value:PAGE_PATH } } },
      { filter:{ fieldName:'eventName', stringFilter:{ value:eventName } } },
    ] } };
  }

  async function runReport(token, body) {
    const res = await fetch(API + '/' + PROPERTY_ID + ':runReport', {
      method: 'POST',
      headers: { 'Authorization':'Bearer '+token, 'Content-Type':'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) { console.error('GA API '+res.status); return null; }
    return res.json();
  }

  // "20260417" → "17 Apr"
  function fmtDate(d) {
    var dt = new Date(d.slice(0,4)+'-'+d.slice(4,6)+'-'+d.slice(6,8));
    return dt.getDate()+' '+dt.toLocaleString('en-GB',{month:'short'});
  }

  // Generate YYYYMMDD strings from START_DATE to today
  function dateRange() {
    var dates=[], s=new Date(START_DATE), end=new Date();
    for (var d=new Date(s); d<=end; d.setDate(d.getDate()+1)) {
      dates.push(d.toISOString().slice(0,10).replace(/-/g,''));
    }
    return dates;
  }

  function metricVal(report, idx) {
    if (!report||!report.rows||!report.rows[0]) return 0;
    return parseFloat(report.rows[0].metricValues[idx].value)||0;
  }

  function buildDateMap(report) {
    var map={};
    if (!report||!report.rows) return map;
    report.rows.forEach(function(r){ map[r.dimensionValues[0].value]=parseInt(r.metricValues[0].value)||0; });
    return map;
  }

  window.fetchGAData = async function(accessToken) {
    if (!PROPERTY_ID) {
      console.warn('ga-data.js: Set PROPERTY_ID to enable live data');
      return null;
    }

    var dr = [{ startDate:START_DATE, endDate:'today' }];

    var results = await Promise.all([
      // 0: Overview KPIs
      runReport(accessToken, {
        dateRanges:dr,
        metrics:[
          {name:'screenPageViews'}, {name:'activeUsers'}, {name:'sessions'},
          {name:'averageSessionDuration'}, {name:'eventCount'},
        ],
        dimensionFilter:pageFilter(),
      }),
      // 1: Daily page views
      runReport(accessToken, {
        dateRanges:dr, dimensions:[{name:'date'}], metrics:[{name:'screenPageViews'}],
        dimensionFilter:pageFilter(), orderBys:[{dimension:{dimensionName:'date'}}],
      }),
      // 2: Daily guesses
      runReport(accessToken, {
        dateRanges:dr, dimensions:[{name:'date'}], metrics:[{name:'eventCount'}],
        dimensionFilter:eventFilter('recipe_guess'), orderBys:[{dimension:{dimensionName:'date'}}],
      }),
      // 3: Daily matches
      runReport(accessToken, {
        dateRanges:dr, dimensions:[{name:'date'}], metrics:[{name:'eventCount'}],
        dimensionFilter:eventFilter('recipe_match'), orderBys:[{dimension:{dimensionName:'date'}}],
      }),
      // 4: Devices
      runReport(accessToken, {
        dateRanges:dr, dimensions:[{name:'deviceCategory'}], metrics:[{name:'sessions'}],
        dimensionFilter:pageFilter(), orderBys:[{metric:{metricName:'sessions'},desc:true}],
      }),
      // 5: Traffic sources
      runReport(accessToken, {
        dateRanges:dr, dimensions:[{name:'sessionSource'}], metrics:[{name:'sessions'}],
        dimensionFilter:pageFilter(), orderBys:[{metric:{metricName:'sessions'},desc:true}], limit:5,
      }),
      // 6: All events (for funnel)
      runReport(accessToken, {
        dateRanges:dr, dimensions:[{name:'eventName'}], metrics:[{name:'eventCount'}],
        dimensionFilter:pageFilter(),
      }),
      // 7: Recipe match breakdown (requires custom dimension registration)
      runReport(accessToken, {
        dateRanges:dr, dimensions:[{name:'customEvent:recipe_name'}], metrics:[{name:'eventCount'}],
        dimensionFilter:eventFilter('recipe_match'),
        orderBys:[{metric:{metricName:'eventCount'},desc:true}],
      }),
      // 8: Failed inputs (requires custom dimension registration)
      runReport(accessToken, {
        dateRanges:dr, dimensions:[{name:'customEvent:input_text'}], metrics:[{name:'eventCount'}],
        dimensionFilter:eventFilter('recipe_failed'),
        orderBys:[{metric:{metricName:'eventCount'},desc:true}], limit:10,
      }),
      // 9: Outbound clicks
      runReport(accessToken, {
        dateRanges:dr, dimensions:[{name:'linkUrl'}], metrics:[{name:'eventCount'}],
        dimensionFilter:{ andGroup:{ expressions:[
          { filter:{ fieldName:'pagePath', stringFilter:{ matchType:'BEGINS_WITH', value:PAGE_PATH } } },
          { filter:{ fieldName:'eventName', stringFilter:{ value:'click' } } },
        ] } },
        orderBys:[{metric:{metricName:'eventCount'},desc:true}], limit:5,
      }),
    ]);

    var overview=results[0], dailyViews=results[1], dailyGuesses=results[2],
        dailyMatches=results[3], devices=results[4], sources=results[5],
        events=results[6], recipes=results[7], failed=results[8], outbound=results[9];

    var data = {};
    var startLabel = fmtDate(START_DATE.replace(/-/g,''));

    // KPIs
    var pv = Math.round(metricVal(overview,0));
    var avgSec = metricVal(overview,3);
    var avgM = Math.floor(avgSec/60), avgS = Math.round(avgSec%60);
    data.KPI = [
      {label:'Page Views',   value:pv,                              suffix:'', change:'Since '+startLabel, dir:'up'},
      {label:'Active Users', value:Math.round(metricVal(overview,1)),suffix:'', change:'Since '+startLabel, dir:'up'},
      {label:'Sessions',     value:Math.round(metricVal(overview,2)),suffix:'', change:'Since '+startLabel, dir:'up'},
      {label:'Avg. Session', value:0, suffix:'', static:avgM+'m '+avgS+'s', change:'Since '+startLabel, dir:'up'},
      {label:'Events',       value:Math.round(metricVal(overview,4)),suffix:'', change:'Since '+startLabel, dir:'up'},
    ];

    // Daily arrays
    var allDates = dateRange();
    var vMap = buildDateMap(dailyViews);
    var gMap = buildDateMap(dailyGuesses);
    var mMap = buildDateMap(dailyMatches);
    data.DAY_LABELS  = allDates.map(fmtDate);
    data.DAILY_VIEWS = allDates.map(function(d){ return vMap[d]||0; });
    data.DAILY_SUBS  = allDates.map(function(d){ return gMap[d]||0; });
    data.DAILY_MATCH = allDates.map(function(d){ return mMap[d]||0; });

    // Event counts map (for funnel)
    var evMap = {};
    if (events&&events.rows) events.rows.forEach(function(r){
      evMap[r.dimensionValues[0].value] = parseInt(r.metricValues[0].value)||0;
    });

    // Devices
    data.DEVICES = [];
    if (devices&&devices.rows) {
      var devTotal = devices.rows.reduce(function(s,r){ return s+parseInt(r.metricValues[0].value); },0);
      devices.rows.forEach(function(r){
        var name=r.dimensionValues[0].value, count=parseInt(r.metricValues[0].value);
        data.DEVICES.push({
          name: name.charAt(0).toUpperCase()+name.slice(1),
          count: count,
          pct: Math.round(count/devTotal*100)+'%',
          color: DEVICE_COLORS[name]||'var(--grey-line)',
        });
      });
    }

    // Referrers
    data.REFERRERS = [];
    if (sources&&sources.rows) {
      sources.rows.forEach(function(r,i){
        data.REFERRERS.push({
          name: r.dimensionValues[0].value==='(direct)'?'direct':r.dimensionValues[0].value,
          count: parseInt(r.metricValues[0].value),
          color: REFERRER_COLORS[i]||'#e5e2dd',
        });
      });
    }

    // Outbound clicks
    data.OUTBOUND = [];
    if (outbound&&outbound.rows) {
      outbound.rows.forEach(function(r){
        var url=r.dimensionValues[0].value, count=parseInt(r.metricValues[0].value);
        data.OUTBOUND.push({
          label: url.indexOf('grain.com')>=0?'Book your buffet':url.replace(/^https?:\/\//,'').slice(0,40),
          url: url.replace(/^https?:\/\//,''),
          count: count,
        });
      });
    }
    if (evMap['copy_code']) {
      data.OUTBOUND.push({label:'Copy code clicks', url:'FOUNDIT10 clipboard', count:evMap['copy_code']});
    }

    // Funnel
    data.FUNNEL = [
      {label:'Page Views',       value:pv,                       color:FUNNEL_COLORS[0]},
      {label:'Typed a Guess',    value:evMap['recipe_guess']||0, color:FUNNEL_COLORS[1]},
      {label:'Matched Recipe',   value:evMap['recipe_match']||0, color:FUNNEL_COLORS[2]},
      {label:'Scrolled to Reward',value:evMap['scroll_to_reward']||0, color:FUNNEL_COLORS[3]},
      {label:'Copied Code',      value:evMap['copy_code']||0,   color:FUNNEL_COLORS[4]},
    ];

    // Recipe breakdown
    data.RECIPE_SPLIT = [];
    data.RECIPES_BAR = [];
    if (recipes&&recipes.rows) {
      recipes.rows.forEach(function(r,i){
        var name=r.dimensionValues[0].value, count=parseInt(r.metricValues[0].value);
        var meta = RECIPE_META[name]||{ color:RECIPE_COLORS[i%RECIPE_COLORS.length], img:'' };
        data.RECIPE_SPLIT.push({name:name, count:count, color:meta.color, img:meta.img});
        data.RECIPES_BAR.push({name:name, count:count, color:meta.color});
      });
    }

    // Failed inputs
    data.FAILED = [];
    if (failed&&failed.rows) {
      failed.rows.forEach(function(r){
        data.FAILED.push({
          input: r.dimensionValues[0].value,
          count: parseInt(r.metricValues[0].value),
        });
      });
    }

    return data;
  };
})();
