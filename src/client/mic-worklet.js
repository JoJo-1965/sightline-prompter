/* global AudioWorkletProcessor, registerProcessor */
// Collects microphone audio into 100 ms blocks for the on-device recogniser.
// The audio context runs at 16 kHz, so a block is 1600 samples.

const BLOCK = 1600;

class MicBlocks extends AudioWorkletProcessor {
	constructor() {
		super();
		this.block = new Float32Array( BLOCK );
		this.filled = 0;
	}

	process( inputs ) {
		const input = inputs[0]?.[0];
		if ( !input ) return true;
		let i = 0;
		while ( i < input.length ) {
			const take = Math.min( BLOCK - this.filled, input.length - i );
			this.block.set( input.subarray( i, i + take ), this.filled );
			this.filled += take;
			i += take;
			if ( this.filled === BLOCK ) {
				this.port.postMessage( this.block );
				this.block = new Float32Array( BLOCK );
				this.filled = 0;
			}
		}
		return true;
	}
}

registerProcessor( "mic-blocks", MicBlocks );
