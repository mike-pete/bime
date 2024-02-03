import typescript from "@rollup/plugin-typescript"

export default {
  input: "src/bime.ts",
  output: [
    {
      file: "./dist/bime.js",
      format: "es",
    },
  ],
  plugins: [typescript()],
}
