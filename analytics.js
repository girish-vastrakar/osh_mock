/* Anonymous usage stats for the app owner. Sends no name or personal details.
   Off until ENDPOINT is set to the owner's Google Apps Script web app URL. */
(() => {
  'use strict';
  const ENDPOINT = ''; // Google Apps Script web app URL ("…/exec"). Empty = nothing is sent.
  const QKEY = 'osh.stats.queue', DKEY = 'osh.stats.device', OKEY = 'osh.stats.optout';

  const get = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const set = (k, v) => { try { v === null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch (e) { } };
  const rid = () => (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2, 10));

  function deviceId() { let d = get(DKEY); if (!d) { d = rid(); set(DKEY, d); } return d; }

  function platform() {
    const ua = navigator.userAgent || '';
    const os = /Android/i.test(ua) ? 'Android' : /iPhone|iPad|iPod/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1) ? 'iOS'
      : /Windows/i.test(ua) ? 'Windows' : /Macintosh|Mac OS X/i.test(ua) ? 'macOS' : /CrOS/.test(ua) ? 'ChromeOS' : /Linux/i.test(ua) ? 'Linux' : 'Other';
    const browser = /Edg\//.test(ua) ? 'Edge' : /SamsungBrowser/.test(ua) ? 'Samsung Internet' : /OPR\/|Opera/.test(ua) ? 'Opera'
      : /Firefox|FxiOS/.test(ua) ? 'Firefox' : /Chrome|CriOS/.test(ua) ? 'Chrome' : /Safari/.test(ua) ? 'Safari' : 'Other';
    const type = /iPad|Tablet/i.test(ua) || (/Android/i.test(ua) && !/Mobile/i.test(ua)) ? 'tablet' : /Mobi|iPhone|Android/i.test(ua) ? 'mobile' : 'desktop';
    const installed = (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
    return { os, browser, device_type: type, installed: installed ? 'app' : 'browser', screen: `${screen.width}x${screen.height}`, lang: navigator.language || '' };
  }

  const enabled = () => !!ENDPOINT && get(OKEY) !== '1';
  const queue = () => { try { return JSON.parse(get(QKEY)) || []; } catch (e) { return []; } };

  let sending = false;
  function flush() {
    if (!enabled() || sending || !navigator.onLine) return;
    const q = queue(); if (!q.length) return;
    sending = true;
    const batch = q.slice(0, 50);
    fetch(ENDPOINT, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ rows: batch }), keepalive: true })
      .then(() => { set(QKEY, JSON.stringify(queue().slice(batch.length))); sending = false; if (queue().length) flush(); })
      .catch(() => { sending = false; });
  }

  function track(event, data) {
    if (!enabled()) return;
    const row = Object.assign({ ts: new Date().toISOString(), event, device_id: deviceId(), app_version: window.OSH_VERSION || '' }, platform(), data || {});
    const q = queue(); q.push(row); set(QKEY, JSON.stringify(q.slice(-500)));
    flush();
  }

  window.oshStats = {
    track, flush,
    available: () => !!ENDPOINT,
    optedOut: () => get(OKEY) === '1',
    setOptOut: v => { set(OKEY, v ? '1' : null); if (v) set(QKEY, null); }
  };
  window.addEventListener('online', flush);
})();
