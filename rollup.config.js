import typescript from '@rollup/plugin-typescript'
import terser from '@rollup/plugin-terser';

export default {
	input: 'src/bime.ts',
	output: [
		{
			file: './dist/bime.js',
			format: 'es',
		},
		{
			format: 'es',
			file: './dist/bime.min.js',
			plugins: [terser()],
		},
	],
	plugins: [typescript()],
}
