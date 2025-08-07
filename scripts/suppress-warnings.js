#!/usr/bin/env node

// This script filters out known warnings from the build output
import { createInterface } from 'readline'

const rl = createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false,
})

const warningsToSuppress = [
  'Module "stream" has been externalized',
  '/*#__PURE__*/',
  'contains an annotation that Rollup cannot interpret',
  'Use of eval in',
  'Some chunks are larger than 500 kB',
  '[plugin vite:resolve]',
  'node_modules/@walletconnect',
  'node_modules/@reown',
  'ox/_esm/core',
]

rl.on('line', (line) => {
  const shouldSuppress = warningsToSuppress.some((warning) => line.includes(warning))
  if (!shouldSuppress) {
    console.log(line)
  }
})
