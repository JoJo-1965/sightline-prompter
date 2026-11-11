import assert from "node:assert/strict";
import { createAligner } from "../src/client/aligner.js";

const tokens = text => text.toLowerCase().split( /\s+/ ).map( word => word.replace( /[^\w]/g, "" ) ).filter( Boolean );
const opening = tokens( "A short introduction We can make the session easier for people who need a little more time" );
const repeated = tokens( "We can make the session easier for people who need a little more time" );
const words = [ ...opening, ...Array.from( { length: 8 }, () => repeated ).flat() ];
const follower = createAligner( words );
follower.setPosition( 3 );
for ( const word of repeated ) { follower.addRecognized( word ); follower.step(); }
assert.equal( follower.currentPosition(), opening.length - 1, "A nearby, correctly spoken common phrase follows despite whole-script repetition" );

const forms = tokens( "An introduction I've reviewed the healthcare plan and someone will explain the next part carefully" );
const contractions = createAligner( forms );
contractions.setPosition( 2 );
for ( const word of tokens( "I have reviewed the health care plan and some one will explain the next part carefully" ) ) { contractions.addRecognized( word ); contractions.step(); }
assert.equal( contractions.currentPosition(), forms.length - 1, "Natural contraction and compound-word boundaries retain the script indexes" );

const distantWords = [ ...tokens( "A unique opening sentence keeps this position" ), ...Array( 80 ).fill( "padding" ), ...Array.from( { length: 8 }, () => repeated ).flat() ];
const distant = createAligner( distantWords );
distant.setPosition( 2 );
for ( const word of repeated ) { distant.addRecognized( word ); distant.step(); }
assert.equal( distant.currentPosition(), 2, "Repeated common speech cannot relocate to a distant matching paragraph" );

const outOfOrder = createAligner( words );
outOfOrder.setPosition( 3 );
for ( const word of tokens( "time little people session easier can we" ) ) { outOfOrder.addRecognized( word ); outOfOrder.step(); }
assert.equal( outOfOrder.currentPosition(), 3, "A bag of common words without ordered context cannot move the script" );

const unrelated = createAligner( words );
unrelated.setPosition( 3 );
for ( const word of tokens( "random appliance weather signal tomorrow unrelated noise" ) ) { unrelated.addRecognized( word ); unrelated.step(); }
assert.equal( unrelated.currentPosition(), 3 );
console.log( "Alignment continuity: common phrases, contractions/compounds and distant/out-of-order/unrelated guards pass" );

const repeatedTitle = tokens( "sectionalpha one action to take today " + "neutral ".repeat( 100 ) + "sectionbeta one action to take today amber lanterns illuminate the garden" );
const secondTitle = repeatedTitle.indexOf( "sectionbeta" );
const guarded = createAligner( repeatedTitle, { sectionStarts: [ 0, secondTitle ], soundAlike: true } );
for ( const chunk of [ "what", "one", "action to", "take", "from to", "day" ] ) {
 for ( const word of tokens( chunk ) ) guarded.addRecognized( word );
 guarded.step();
 assert.ok( guarded.currentPosition() < secondTitle, "A fragmented repeated heading cannot jump into the following section" );
}
guarded.relocate();
for ( const word of tokens( "amber lanterns illuminate the garden" ) ) guarded.addRecognized( word );
assert.ok( guarded.step() >= secondTitle, "Explicit Resync retains whole-script recovery" );
const flowing = createAligner( tokens( "we finish these opening words the next passage begins naturally" ), { sectionStarts: [ 0, 5 ] } );
flowing.setPosition( 3 );
for ( const word of tokens( "these opening words the next passage begins naturally" ) ) { flowing.addRecognized( word ); flowing.step(); }
assert.equal( flowing.currentPosition(), 9, "Ordered speech can cross a section boundary without a hard hold" );
console.log( "Repeated-heading guard, deliberate global Resync and continuous cross-section speech pass" );
