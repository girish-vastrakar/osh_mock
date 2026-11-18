/* Anonymous usage stats for the app owner. Sends no name or personal details.
   Rows (and delete requests on reset or opt-out) are posted to a public ntfy.sh topic. The repo's
   collect-stats GitHub Action pulls them every few minutes into data.csv on the 'data' branch. */
(() => {
  'use strict';
  const ENDPOINT = 'https://ntfy.sh/osh-mock-stats-1b65fc50dab5c24e'; // public message relay; a GitHub Action in the repo collects messages into data.csv (data branch)
  const QKEY = 'osh.stats.queue', XKEY = 'osh.stats.deletes', DKEY = 'osh.stats.device', OKEY = 'osh.stats.optout';

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

  const deletes = () => { try { return JSON.parse(get(XKEY)) || []; } catch (e) { return []; } };
  const post = body => fetch(ENDPOINT, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(body), keepalive: true });

  let sending = false;
  function flush() {
    if (!ENDPOINT || sending || !navigator.onLine) return;
    const x = deletes();
    if (x.length) { // deletion requests go first and are sent even when stats are off
      sending = true;
      post({ delete: x[0] }).then(() => { set(XKEY, JSON.stringify(deletes().slice(1))); sending = false; flush(); }).catch(() => { sending = false; });
      return;
    }
    if (!enabled()) return;
    const q = queue(); if (!q.length) return;
    sending = true;
    let batch = [], size = 0; // ntfy messages are limited to 4 KB, so send rows in small batches
    for (const r of q) { const n = JSON.stringify(r).length + 2; if (batch.length && size + n > 3500) break; batch.push(r); size += n; }
    post({ rows: batch })
      .then(() => { set(QKEY, JSON.stringify(queue().slice(batch.length))); sending = false; if (queue().length) flush(); })
      .catch(() => { sending = false; });
  }

  // Remove this device's rows (or one learner's rows) from the owner's data file.
  function forget(learnerId) {
    if (!ENDPOINT) return;
    const q = queue().filter(r => learnerId && r.learner_id !== learnerId); set(QKEY, JSON.stringify(q));
    const x = deletes(); x.push(learnerId ? { device_id: deviceId(), learner_id: learnerId } : { device_id: deviceId() });
    set(XKEY, JSON.stringify(x)); flush();
  }

  function track(event, data) {
    if (!enabled()) return;
    const row = Object.assign({ ts: new Date().toISOString(), event, device_id: deviceId(), app_version: window.OSH_VERSION || '' }, platform(), data || {});
    const q = queue(); q.push(row); set(QKEY, JSON.stringify(q.slice(-500)));
    flush();
  }

  window.oshStats = {
    track, flush, forget,
    available: () => !!ENDPOINT,
    optedOut: () => get(OKEY) === '1',
    setOptOut: v => { set(OKEY, v ? '1' : null); if (v) forget(null); }
  };
  window.addEventListener('online', flush);
  flush();
})();
