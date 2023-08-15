import typescript from '@rollup/plugin-typescript';

export default {
  input: 'src/bime.ts',
  output: {
    dir: 'dist',
    format: 'es'
  },
  plugins: [typescript()]
};