// Fixed shell of the app. Starts the interface bundle of the chosen channel (the stored one, or
// the one shipped with the app) and fetches a newer one from UPDATE_URL in the background.
// A bundle is { build, version, channel, html, css, js }.
//
// This file cannot update itself – it deliberately stays small and keeps running independently of
// the interface, so a broken bundle can be replaced by the next one.
//
// Storage keys are shared with app/core/storage.js and app/core/channel.js (prefix 'app_',
// values as JSON): 'app_channel' and 'app_bundle_<channel>'.
(function(){
  var UPDATE_URL = 'https://igpkkkogtcsuyabxhthv.supabase.co/storage/v1/object/public/app';
  var CHECK_EVERY = 30 * 60 * 1000;

  function valid(b){
    return b && typeof b.build === 'number' && typeof b.html === 'string' &&
      typeof b.css === 'string' && typeof b.js === 'string';
  }
  function read(key){
    try{ return JSON.parse(localStorage.getItem(key)); }catch(e){ return null; }
  }

  var channel = read('app_channel') === 'development' ? 'development' : 'release';
  var bundleKey = 'app_bundle_' + channel;

  // Build numbers only compare within one channel. The shipped bundle wins over the stored one
  // only if it belongs to the chosen channel and is newer; if nothing is stored for the chosen
  // channel yet, the shipped bundle runs as a fallback, whatever channel it was built for.
  var shipped = window.__APP_BUNDLE__;
  var stored = read(bundleKey);
  var active = shipped;
  if(valid(stored) && (shipped.channel !== channel || stored.build > shipped.build)) active = stored;

  window.__APP_INFO__ = { version: active.version, build: active.build, channel: active.channel, updateUrl: UPDATE_URL };
  var style = document.createElement('style');
  style.textContent = active.css;
  document.head.appendChild(style);
  document.body.insertAdjacentHTML('afterbegin', active.html);
  var script = document.createElement('script');
  script.textContent = active.js;
  document.body.appendChild(script);

  var newest = active.channel === channel ? active.build : 0;
  var lastCheck = 0;

  function getJson(name, tag){
    return fetch(UPDATE_URL + '/' + channel + '/' + name + '?v=' + tag, { cache: 'no-store' })
      .then(function(r){ return r.ok ? r.json() : null; });
  }

  function check(){
    if(!UPDATE_URL || Date.now() - lastCheck < CHECK_EVERY) return;
    lastCheck = Date.now();
    getJson('version.json', lastCheck)
      .then(function(v){ return v && v.build > newest ? getJson('bundle.json', v.build) : null; })
      .then(function(b){
        if(!valid(b) || !(b.build > newest)) return;
        localStorage.setItem(bundleKey, JSON.stringify(b));
        newest = b.build;
        offer();
      })
      .catch(function(){});
  }

  // The new bundle applies from the next start; the notice allows switching right away.
  function offer(){
    if(document.getElementById('appUpdate')) return;
    var bar = document.createElement('button');
    bar.id = 'appUpdate';
    bar.textContent = 'Neue Version geladen – tippen zum Aktualisieren';
    bar.style.cssText = 'position:fixed;left:16px;right:16px;bottom:calc(84px + env(safe-area-inset-bottom));' +
      'z-index:100;margin:0 auto;max-width:420px;padding:12px 14px;border:none;border-radius:12px;' +
      'background:#4FBF9F;color:#14181A;font:600 14px system-ui,sans-serif;cursor:pointer;' +
      'box-shadow:0 6px 24px rgba(0,0,0,.45)';
    bar.onclick = function(){ location.reload(); };
    document.body.appendChild(bar);
  }

  check();
  document.addEventListener('visibilitychange', function(){
    if(document.visibilityState === 'visible') check();
  });

  // Web variant only: start without a connection. Not inside the Android app or from a local file.
  if('serviceWorker' in navigator && /^https?:$/.test(location.protocol) && !window.Capacitor){
    navigator.serviceWorker.register('sw.js').catch(function(){});
  }
})();
