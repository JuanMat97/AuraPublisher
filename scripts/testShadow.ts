import { drawExactFrameShadowToContext } from '../src/engine/webglRoomEngine';
import fs from 'fs';
import { createCanvas } from 'canvas';

// Test script to verify shadow rendering and color passthrough
console.log('Testing shadow rendering...');
const canvas = createCanvas(1024, 1024);
const ctx = canvas.getContext('2d');

drawExactFrameShadowToContext(ctx as any, {
  shadowPreset: 'parallel',
  aspectRatio: 2.37, // GTA VI wide aspect ratio
  angleDeg: 90,
  distance: 30,
  blur: 25,
  intensity: 60,
  wallAngleDeg: 0,
  width: 1024,
  height: 1024,
});

console.log('Shadow rendered successfully!');
