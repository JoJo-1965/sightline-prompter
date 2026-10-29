/* global AudioWorkletProcessor, registerProcessor */
// Measures the microphone in 100 ms blocks for level-meter.js: the sample
// peak, the mean square, and the mean square after K-weighting (the filter
// loudness in LUFS is measured through, ITU-R BS.1770). The filter
// coefficients come from the page, worked out for this sample rate.

class LevelBlocks extends AudioWorkletProcessor {
	constructor( { processorOptions } ) {
		super();
		const { shelf, highpass, blockSize } = processorOptions;
		this.f = [ shelf, highpass ];
		this.z = [ [ 0, 0 ], [ 0, 0 ] ]; // each stage's state (transposed direct form II)
		this.blockSize = blockSize;
		this.reset();
	}

	reset() {
		this.n = 0;
		this.peak = 0;
		this.sq = 0;
		this.k = 0;
	}

	process( inputs ) {
		const samples = inputs[0]?.[0];
		if ( !samples ) return true;
		const [ s1, s2 ] = this.f;
		const [ z1, z2 ] = this.z;
		for ( let i = 0; i < samples.length; i++ ) {
			const x = samples[i];
			const a = Math.abs( x );
			if ( a > this.peak ) this.peak = a;
			this.sq += x * x;
			const y1 = s1.b0 * x + z1[0];
			z1[0] = s1.b1 * x - s1.a1 * y1 + z1[1];
			z1[1] = s1.b2 * x - s1.a2 * y1;
			const y2 = s2.b0 * y1 + z2[0];
			z2[0] = s2.b1 * y1 - s2.a1 * y2 + z2[1];
			z2[1] = s2.b2 * y1 - s2.a2 * y2;
			this.k += y2 * y2;
			if ( ++this.n === this.blockSize ) {
				this.port.postMessage( { peak: this.peak, ms: this.sq / this.n, k: this.k / this.n } );
				this.reset();
			}
		}
		return true;
	}
}

registerProcessor( "level-blocks", LevelBlocks );
