// node scripts/word-fixes.test.mjs
import assert from "node:assert/strict";
import { createWordFixer, heardForms } from "../src/client/word-fixes.js";
import { createAligner } from "../src/client/aligner.js";
import { soundKey } from "../src/client/sound-alike.js";

const words = text => text.toLowerCase().replace( /[^\w\s]/g, "" ).split( /\s+/ ).filter( Boolean );
const fixes = [
	{ word: "Moshe", heard: [ "marsha", "Mosher" ] },
	{ word: "Sightline", heard: "site line, sight-line" },
	{ word: "Ellie", heard: [ "ely" ] } // not in the scripts below: ignored
];

// Synonyms for the words the script has.
const script = words( "Today Moshe joins us to talk about Sightline and the site plan" );
const fixer = createWordFixer( fixes, script );
assert.deepEqual( [ ...fixer.synonyms.get( "moshe" ) ], [ "marsha", "mosher" ] );
assert.deepEqual( [ ...fixer.synonyms.get( "sightline" ) ], [ "site_line" ] ); // "sight-line" is the word itself
assert.equal( fixer.synonyms.has( "ellie" ), false );

// A phrase heard is joined into one word; the words themselves are kept.
assert.deepEqual( fixer.join( [ "about", "site", "line", "and" ] ), [ "about", "site_line", "and" ] );
assert.deepEqual( fixer.join( [ "Marsha", "joins" ] ), [ "Marsha", "joins" ] );
// A script that says "site line" keeps it as two words.
assert.equal( createWordFixer( fixes, words( "the sightline on the site line" ) ).join( [ "site", "line" ] ).length, 2 );
// No fixes: words pass straight through.
const plain = [ "a", "b" ];
assert.equal( createWordFixer( [], script ).join( plain ), plain );

// The aligner follows a misheard name with its synonym, and not without.
const long = words( `Welcome back. In this module Moshe Abrahams explains how
	the network grew from a kitchen table to forty countries, and why Moshe
	still answers every letter himself. Later, Priya takes us through the numbers.` );
const heard = words( "why marsha still answers every letter himself" );
const follow = ( synonyms ) => {
	const aligner = createAligner( long, { synonyms } );
	aligner.setPosition( long.indexOf( "countries" ) );
	for ( const w of heard ) aligner.addRecognized( w );
	return aligner.step();
};
const { synonyms } = createWordFixer( fixes, long );
assert.equal( long[follow( synonyms )], "himself" );
// Still itself: in a script that says Marsha, "marsha" matches Marsha.
const both = words( "Moshe met Marsha at the station that morning" );
const a2 = createAligner( both, { synonyms: createWordFixer( fixes, both ).synonyms } );
for ( const w of words( "met marsha at the station" ) ) a2.addRecognized( w );
assert.equal( both[a2.step()], "station" );

// Sound-alike: no list needed for a name heard as a word that sounds like it.
assert.equal( soundKey( "Moshe" ), soundKey( "marsha" ) );
assert.equal( soundKey( "Abrahams" ), soundKey( "abrams" ) );
assert.notEqual( soundKey( "Moshe" ), soundKey( "Priya" ) );
const byEar = ( soundAlike, said ) => {
	const aligner = createAligner( long, { soundAlike } );
	aligner.setPosition( long.indexOf( "countries" ) );
	for ( const w of words( said ) ) aligner.addRecognized( w );
	return long[aligner.step()];
};
assert.equal( byEar( true, "why marsha still answers every letter himself" ), "himself" );
// Talk that isn't in the script doesn't move it, sound-alike or not.
assert.equal( byEar( true, "so anyway let me just grab a coffee before we carry on" ), "countries" );

assert.deepEqual( heardForms( "Site Line, sight-line,, , a b c d, marsha, Marsha" ), [ "site line", "sightline", "marsha" ] );
console.log( "word fixes tests pass" );
