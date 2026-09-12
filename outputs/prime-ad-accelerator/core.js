(function (root) {
  'use strict';
  // Deliberately English-only and anchored: ordinary dialogue mentioning ads
  // must never enable acceleration. Missing/unknown labels fail closed.
  function isAdLabel(text) {
    const normalized = text.replace(/\s+/g, ' ').trim();
    return /^(?:ads?|advertisements?)(?:\s+\d+\s+of\s+\d+)?\s*[:·|–—-]?\s*(?:\(?\d{1,2}:[0-5]\d\)?|\d{1,3}\s*(?:s|sec|seconds))(?:\s*(?:remaining|left))?$/i.test(normalized);
  }

  const SPEEDS = [2, 4, 8, 10, 20];

  class Accelerator {
    constructor() {
      this.active = null;
      this.candidate = null;
      this.blocked = false;
      this.adEvidence=null;this.blockedEvidence=null;this.blockedPrimeReset=null;this.rearm=null;this.retries=0;
      this.status = 'Waiting for an ad';
    }
    speedStatus() {
      const {speed, requestedSpeed} = this.active;
      return `Ad detected · ${speed}×` + (speed !== requestedSpeed ? ` (${requestedSpeed}× unavailable)` : '');
    }
    restore() {
      if (!this.active) return;
      const { video, original, speed } = this.active;
      this.active = null;
      // Preserve changes made by Prime or the viewer during the break.
      if (video.playbackRate === speed) {
        try { video.playbackRate = original; } catch (_) { /* Detached player. */ }
      }
    }
    stop(reason) {
      this.restore();
      this.candidate = null;
      this.status = reason;
    }
    update({ video, ad, enabled, now, speed = 10, live = false, adInfo = null, site = null }) {
      if (!SPEEDS.includes(speed)) { this.stop("Invalid speed setting"); return; }
      if (live || video?.duration === Infinity) { this.stop("Live playback is excluded"); return; }
      if (this.active && this.active.requestedSpeed !== speed) this.stop("Applying speed setting");
      const previousEvidence=this.adEvidence;
      this.adEvidence=adInfo;
      if (!ad) {this.blocked=false;this.blockedEvidence=null;this.blockedPrimeReset=null;this.rearm=null;this.retries=0;}
      if(this.blocked&&ad&&enabled&&video&&!video.paused&&adInfo&&this.blockedEvidence&&this.retries<3){
        const old=this.blockedEvidence;
        const newOrdinal=Number.isFinite(adInfo.ordinal)&&adInfo.total===old.total&&adInfo.ordinal>old.ordinal;
        const newCountdown=Number.isFinite(adInfo.remaining)&&Number.isFinite(old.remaining)&&adInfo.remaining>old.remaining+2;
        // Some qualified players expose each ad in a distinct, separately
        // identified media element without an accessible ordinal/countdown.
        const newMedia=adInfo.kind==='separate-media'&&old.kind==='separate-media'&&adInfo.media!==old.media;
        // Prime currently exposes a pod-level "content resumes in" countdown:
        // it decreases continuously across creatives instead of resetting or
        // exposing an ordinal. When Prime itself restores the exact original
        // rate while that trusted ad signal and media progression continue,
        // treat it as a bounded next-creative candidate rather than content.
        const primeContinuation=site==='prime'&&this.blockedPrimeReset?.video===video&&
          Number.isFinite(adInfo.remaining)&&Number.isFinite(this.blockedPrimeReset.remaining)&&
          adInfo.remaining<this.blockedPrimeReset.remaining&&video.currentTime>this.blockedPrimeReset.time;
        if(!this.rearm&&(newOrdinal||newCountdown||newMedia||primeContinuation))this.rearm={video,info:adInfo,time:video.currentTime,now,primeContinuation};
        const r=this.rearm;
        const progressing=r&&(r.primeContinuation?
          Number.isFinite(adInfo.remaining)&&adInfo.remaining<r.info.remaining:
          r.info.kind==='separate-media'?
          adInfo.kind==='separate-media'&&adInfo.media===r.info.media&&video.currentTime>r.time:
          adInfo.ordinal===r.info.ordinal&&adInfo.remaining<r.info.remaining);
        if(r&&r.video===video&&progressing&&video.currentTime>r.time&&now-r.now>=250){this.blocked=false;this.blockedPrimeReset=null;this.rearm=null;this.candidate=null;this.retries++;}
      }
      if (!enabled || !video || !ad || video.paused || video.ended) {
        this.stop(!enabled ? 'Off' : !video ? 'No visible player' : video.paused ? 'Paused' : 'Waiting for an ad');
        return;
      }
      if (this.active) {
        const a = this.active;
        const maxAdvance = Math.max(0, (now - a.lastWall) / 1000) * a.speed + 3;
        const jumped = video.currentTime < a.lastTime - 1 || video.currentTime - a.lastTime > maxAdvance;
        if (a.video !== video || now - a.started > 120000 || jumped || video.playbackRate !== a.speed) {
          const primeRateReset=site==='prime'&&a.video===video&&!jumped&&now-a.started<=120000&&video.playbackRate===a.original;
          this.stop('Speed restored; waiting for the next clear ad break');
          this.blocked = true;
          this.blockedEvidence=previousEvidence||adInfo;this.rearm=null;
          this.blockedPrimeReset=primeRateReset&&Number.isFinite(adInfo?.remaining)?{video,time:video.currentTime,remaining:adInfo.remaining,now}:null;
          return;
        }
        a.lastTime = video.currentTime;
        a.lastWall = now;
        this.status = this.speedStatus();
        return;
      }
      if (this.blocked) return;
      if (!this.candidate || this.candidate.video !== video) {
        this.candidate = { video, since: now };
        this.status = 'Checking ad label';
        return;
      }
      if (now - this.candidate.since < 200) return;
      const original = video.playbackRate;
      if (!Number.isFinite(original) || original <= 0 || original >= speed) {
        this.status = 'Keeping your playback speed';
        return;
      }
      this.active = { video, original, speed, requestedSpeed: speed, started: now, lastWall: now, lastTime: video.currentTime };
      try {
        try { video.playbackRate = speed; }
        catch (error) {
          if (speed !== 20 || original >= 16) throw error;
          this.active.speed = 16;
          video.playbackRate = 16;
        }
        const applied = video.playbackRate;
        if (!Number.isFinite(applied) || applied <= original || applied > speed) {
          throw new Error('Player did not accept speed');
        }
        this.active.speed = applied;
        this.status = this.speedStatus();
      } catch (_) {
        this.stop('Player rejected speed change');
        this.blocked = true;
      }
    }
  }
  const api = { isAdLabel, Accelerator };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.PrimeAdAcceleratorCore = api;
})(typeof globalThis === 'undefined' ? this : globalThis);
