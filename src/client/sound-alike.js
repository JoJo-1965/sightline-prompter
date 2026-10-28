// Sound-alike matching for voice scrolling (Settings > Voice > Your words >
// "Match words that sound alike"): a rough phonetic key, in the spirit of
// Metaphone, tuned for British speech (an "r" before a consonant or at the
// end isn't sounded). Words with the same key sound alike: "marsha" and
// "Moshe" are both "MX"; "Siobhan" and "shivawn" don't, which is what the
// word list is for.

const VOWELS = "aeiouy";
const isVowel = c => !!c && VOWELS.includes( c );

export function soundKey( word ) {
	let w = String( word ).toLowerCase().replace( /[^a-z]/g, "" );
	if ( !w ) return "";
	// Silent or shifted starts.
	w = w.replace( /^(kn|gn|pn|wr|ps)/, m => m[1] ).replace( /^x/, "s" ).replace( /^wh/, "w" );
	w = w
		.replace( /tch/g, "ch" )
		.replace( /sch/g, "sk" )
		.replace( /ph/g, "f" )
		.replace( /ck/g, "k" )
		.replace( /dg(?=[eiy])/g, "j" )
		.replace( /gh(?![aeiouy])/g, "" ) // "light", "though"
		.replace( /ti(?=[ao])/g, "sh" ) // "nation"
		.replace( /c(?=[eiy])/g, "s" )
		.replace( /q/g, "k" )
		.replace( /x/g, "ks" )
		.replace( /z/g, "s" )
		.replace( /v/g, "f" );
	let key = isVowel( w[0] ) ? "A" : "";
	for ( let i = 0; i < w.length; i++ ) {
		const c = w[i];
		const next = w[i + 1] ?? "";
		if ( isVowel( c ) ) continue;
		let sound;
		if ( c === "s" && next === "h" ) {
			sound = "X";
			i++;
		} else if ( c === "c" && next === "h" ) {
			sound = "X";
			i++;
		} else if ( c === "t" && next === "h" ) {
			sound = "0";
			i++;
		} else if ( c === "h" || c === "w" ) {
			continue; // only sounded before a vowel, and then barely
		} else if ( c === "r" && !isVowel( next ) ) {
			continue; // non-rhotic: "marsha", "water"
		} else if ( c === "c" ) {
			sound = "K";
		} else if ( c === "g" ) {
			sound = "eiy".includes( next ) ? "J" : "K";
		} else if ( c === "b" && i === w.length - 1 && w[i - 1] === "m" ) {
			continue; // "thumb"
		} else if ( c === "d" ) {
			sound = "T";
		} else {
			sound = c.toUpperCase();
		}
		if ( key.at( -1 ) !== sound ) key += sound;
	}
	return key;
}
