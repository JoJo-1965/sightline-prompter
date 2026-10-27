// Steady auto-scroll: glide the script at a fixed words-per-minute rate.
// The pixel rate is derived from the rendered script (height per word), so it
// stays right when the font size or window width changes. With a local
// measure (setLocalPxPerWord), the rate follows the word spacing around the
// reading line, so dense paragraphs really pass at the set words per minute
// and gaps (headings, notes) pass more quickly.

import { buildWordIndex } from "./word-index.js";

let rafId = null;
let pos = 0;
let lastTs = 0;
let lastSetY = null;
let pxPerSecond = 0;
let rate = 0; // the smoothed pixels per second actually used
let avgPxPerWord = 0;
let wpm = 140;
let scriptEl = null;
let onEnd = null;
let localPxPerWord = null;

export const WPM_MIN = 60;
export const WPM_MAX = 300;
export const WPM_STEP = 5;

function measurePxPerWord() {
	const { ranges } = buildWordIndex( scriptEl );
	if ( ranges.length < 2 ) return 0;
	const first = ranges[0].getBoundingClientRect();
	const last = ranges[ranges.length - 1].getBoundingClientRect();
	return Math.max( 0, last.bottom - first.top ) / ranges.length;
}

export function recalculate() {
	if ( !scriptEl ) return;
	avgPxPerWord = measurePxPerWord();
	pxPerSecond = ( wpm / 60 ) * avgPxPerWord;
}

// fn() returns the pixels per word around the reading line, or null.
export function setLocalPxPerWord( fn ) {
	localPxPerWord = fn;
}

export function setWpm( value ) {
	if ( !Number.isFinite( value ) ) return wpm;
	wpm = Math.max( WPM_MIN, Math.min( WPM_MAX, Math.round( value ) ) );
	recalculate();
	return wpm;
}

export function getWpm() {
	return wpm;
}

export function isRunning() {
	return rafId !== null;
}

function targetRate() {
	const local = localPxPerWord?.();
	if ( !local || !avgPxPerWord ) return pxPerSecond;
	// Keep within sensible bounds so one odd gap can't make it race or crawl.
	const px = Math.min( avgPxPerWord * 4, Math.max( avgPxPerWord * 0.4, local ) );
	return ( wpm / 60 ) * px;
}

function tick( ts ) {
	const dt = lastTs ? Math.min( 0.1, ( ts - lastTs ) / 1000 ) : 0;
	lastTs = ts;
	// The reader scrolled or jumped to a section: carry on from there.
	if ( lastSetY !== null && Math.abs( window.scrollY - lastSetY ) > 2 ) {
		pos = window.scrollY;
	}
	// Ease towards the local rate so speed changes are smooth, not jumpy.
	rate += ( targetRate() - rate ) * Math.min( 1, dt * 2.5 );
	pos += rate * dt;
	const maxY = document.documentElement.scrollHeight - window.innerHeight;
	window.scrollTo( 0, pos );
	lastSetY = window.scrollY;
	if ( pos >= maxY ) {
		stopSteadyScroll();
		onEnd?.();
		return;
	}
	rafId = requestAnimationFrame( tick );
}

export function startSteadyScroll( { el, wordsPerMinute, onFinished } ) {
	stopSteadyScroll();
	scriptEl = el;
	onEnd = onFinished;
	setWpm( wordsPerMinute );
	rate = targetRate();
	pos = window.scrollY;
	lastSetY = null;
	lastTs = 0;
	rafId = requestAnimationFrame( tick );
}

export function stopSteadyScroll() {
	if ( rafId !== null ) {
		cancelAnimationFrame( rafId );
		rafId = null;
	}
}
