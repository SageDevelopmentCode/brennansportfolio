(() => {
  'use strict';

  const catalogMode = /\bmode=catalog\b/.test(location.search);
  const $ = (id) => document.getElementById(id);
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const TAU = Math.PI * 2;

  const canvas = $('game');
  const ctx = canvas.getContext('2d');
  const dialCanvas = $('dial');
  const dialCtx = dialCanvas.getContext('2d');
  let W = 0, H = 0, DPR = 1;
  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = Math.floor(W * DPR); canvas.height = Math.floor(H * DPR);
  }
  window.addEventListener('resize', resize);
  resize();

  // ================= DATA =================
  function defineStage(p) {
    return Object.assign({
      gravity: 18, grip: 1, surface: 'ground', fuelMul: 1, gapMul: 1, rampMul: 1,
      music: 'pastoral', decor: 'none', tufts: 0, ceiling: 0, tunnel: false,
      stars: false, sun: true, headlight: false, dark: 0, aurora: false, shift: false,
      fog: '', lava: false, stripes: '', season: false, snowcap: false, quant: 0,
      slowTrees: false, sink: 0, wind: null, stalactites: false, ceilingColor: '#14161c',
    }, p);
  }
  const STAGES = [
    defineStage({ id: 'countryside', name: 'Countryside', price: 0, seed: 11, grip: 1.0,
      oct: [[8, 60], [3, 22], [0.5, 6]], music: 'pastoral', decor: 'trees', tufts: 0.1,
      sky: ['#3d96ee', '#e7f7ff'], ground: '#9a4214', groundDark: '#6a2e0c', grass: '#3caf45', grassDark: '#1f7a2c',
      dust: '140,100,60', desc: 'Rolling green hills, ponds in the gaps' }),
    defineStage({ id: 'skottland', name: 'Skottland', price: 1200, seed: 233, grip: 1.0,
      oct: [[9, 70], [3.2, 26], [0.45, 7]], music: 'pastoral', decor: 'trees', tufts: 0.15,
      sky: ['#8aa4b4', '#d7ddd4'], ground: '#6e6458', groundDark: '#4a433c', grass: '#3cb84a', grassDark: '#1c7a2c',
      dust: '120,110,80', fog: 'rgba(200,208,204,0.34)', desc: 'Misty moors, heather, and dark lochs' }),
    defineStage({ id: 'china', name: 'China', price: 1800, seed: 239, grip: 1.0,
      oct: [[8, 64], [3, 24], [0.5, 6]], music: 'pastoral', decor: 'none', tufts: 0.4,
      sky: ['#9eb8c4', '#f4efe2'], ground: '#b7a48a', groundDark: '#7a6a52', grass: '#5f9134', grassDark: '#3c6820',
      dust: '180,120,60', fog: 'rgba(255,230,200,0.16)', desc: 'Jade hills and lanterns' }),
    defineStage({ id: 'seasons', name: 'Seasons', price: 2900, seed: 19, grip: 0.95,
      oct: [[10, 48], [4, 18], [0.8, 6]], music: 'pastoral', decor: 'trees', tufts: 0.2, season: true, surface: 'seasons',
      sky: ['#6eb8ea', '#fff0c4'], ground: '#9a4214', groundDark: '#6a2e0c', grass: '#1ed41c', grassDark: '#0e8c12',
      dust: '160,120,70', desc: 'Spring, summer, autumn, winter' }),
    defineStage({ id: 'desert', name: 'Desert', price: 2000, seed: 23, grip: 0.9, surface: 'sand',
      oct: [[11, 90], [2.5, 28], [0.3, 7]], music: 'heat', decor: 'cactus', tufts: 0.6,
      sky: ['#3d92e4', '#f3e2b8'], ground: '#e4c278', groundDark: '#b89048', grass: '#f3d7a0', grassDark: '#d4b06a',
      dust: '220,180,110', desc: 'Long sandy dunes' }),
    defineStage({ id: 'arctic', name: 'Arctic', price: 5000, seed: 37, grip: 0.5, surface: 'patches-ice',
      oct: [[9, 55], [3.5, 20], [0.6, 6]], music: 'ice', decor: 'pines', wind: 0.05,
      sky: ['#7ec4ee', '#f7fbff'], ground: '#7f9bb8', groundDark: '#5a7590', grass: '#ffffff', grassDark: '#d5e8f6',
      dust: '235,245,255', desc: 'Slippery snow and ice' }),
    defineStage({ id: 'highway', name: 'Highway', price: 7100, seed: 41, grip: 1.05, surface: 'tar', fuelMul: 2.4,
      oct: [[3, 120], [1.1, 40], [0.25, 12]], music: 'metal', stripes: 'road',
      sky: ['#5e96cc', '#d5e4f0'], ground: '#2c3038', groundDark: '#1a1e24', grass: '#5a8a46', grassDark: '#2f5c28',
      dust: '80,80,90', desc: 'Fast tarmac, scarce fuel' }),
    defineStage({ id: 'cave', name: 'Cave', price: 8600, seed: 43, grip: 0.95, fuelMul: 2.6, ceiling: 4.8,
      oct: [[7, 42], [3.2, 16], [1.1, 6]], music: 'dark', sun: false, stars: false, headlight: true, dark: 0.78,
      stalactites: true, ceilingColor: '#1b120e',
      sky: ['#12100e', '#3a3834'], ground: '#5c564e', groundDark: '#3a342e', grass: '#7a7268', grassDark: '#4e4840',
      dust: '90,70,50', desc: 'Low ceiling, watch your head' }),
    defineStage({ id: 'moon', name: 'Moon', price: 10000, seed: 53, gravity: 6.5, grip: 0.9,
      oct: [[10, 70], [5, 24], [1.2, 7]], music: 'space', decor: 'craters', sun: false, stars: true, wind: 0,
      sky: ['#000000', '#12141c'], ground: '#8d8d92', groundDark: '#5a5a60', grass: '#b4b4b8', grassDark: '#6e6e74',
      dust: '190,190,195', desc: 'Low gravity and wide gaps' }),
    defineStage({ id: 'bootcamp', name: 'Boot Camp', price: 11400, seed: 59, grip: 0.95,
      oct: [[7, 40], [3, 16], [1, 6]], music: 'heat', decor: 'barriers',
      sky: ['#8aa85e', '#d5e0b4'], ground: '#5c5228', groundDark: '#3a3418', grass: '#8a9a48', grassDark: '#4a5824',
      dust: '120,110,60', desc: 'Camo hills and barriers' }),
    defineStage({ id: 'mars', name: 'Mars', price: 14300, seed: 61, gravity: 8, grip: 0.88, surface: 'sand',
      oct: [[9, 64], [4, 22], [1, 7]], music: 'space', decor: 'craters', ceiling: 6.2, tunnel: true, sun: true,
      sky: ['#c4846a', '#e8c0a4'], ground: '#a34a2c', groundDark: '#6e2a18', grass: '#c4623a', grassDark: '#8a3820',
      dust: '180,90,60', ceilingColor: '#4a2218', desc: 'Red dust and tunnels' }),
    defineStage({ id: 'xmas', name: 'Xmas', price: 17100, seed: 67, grip: 0.72, surface: 'patches-ice',
      oct: [[8, 52], [3, 18], [0.5, 6]], music: 'festive', decor: 'pines',
      sky: ['#8eb4d8', '#f4f8fc'], ground: '#8eacc4', groundDark: '#5a7e98', grass: '#ffffff', grassDark: '#d5e8f6',
      dust: '240,245,255', desc: 'Snowy holiday hills' }),
    defineStage({ id: 'alien', name: 'Alien Planet', price: 42900, seed: 71, gravity: 12, grip: 0.7, surface: 'slime',
      oct: [[9, 50], [4.5, 18], [1.4, 7]], music: 'space', decor: 'blobs', sun: false, stars: true,
      sky: ['#160828', '#6a32a0'], ground: '#4c2a6e', groundDark: '#2e1848', grass: '#d070ff', grassDark: '#7a3aad',
      dust: '180,100,220', desc: 'Slimy slopes, odd gravity' }),
    defineStage({ id: 'arcticcave', name: 'Arctic Cave', price: 45700, seed: 73, grip: 0.65, surface: 'ice', ceiling: 5.0,
      oct: [[8, 46], [3.4, 16], [0.8, 6]], music: 'ice', decor: 'pines', sun: false, headlight: true, dark: 0.55,
      stalactites: true, ceilingColor: '#243848',
      sky: ['#0e1c28', '#7eb4d4'], ground: '#6a8aa8', groundDark: '#3e5a74', grass: '#f4fbff', grassDark: '#b7d4ea',
      dust: '220,235,245', desc: 'Ice cave, slippery roof' }),
    defineStage({ id: 'forest', name: 'Forest', price: 48600, seed: 79, grip: 0.95,
      oct: [[8, 44], [3.5, 16], [0.7, 6]], music: 'pastoral', decor: 'trees', slowTrees: true, tufts: 0.05,
      sky: ['#1a4a30', '#6a9460'], ground: '#5c3014', groundDark: '#3a1c0c', grass: '#1a6e28', grassDark: '#0c4a16',
      dust: '80,60,30', desc: 'Push through the trunks' }),
    defineStage({ id: 'mountain', name: 'Mountain', price: 48600, seed: 83, grip: 0.85, surface: 'snowcap', snowcap: true,
      oct: [[14, 36], [6, 14], [1.5, 5]], music: 'pastoral', decor: 'pines',
      sky: ['#4e96d0', '#e7f3fb'], ground: '#6a6560', groundDark: '#3e3a36', grass: '#7d776f', grassDark: '#4e4840',
      dust: '140,130,120', desc: 'Steep rock, snowy peaks' }),
    defineStage({ id: 'ragnarok', name: 'Ragnarok', price: 57100, seed: 89, grip: 0.8, gapMul: 1.55,
      oct: [[12, 34], [5, 12], [2, 5]], music: 'dark', decor: 'dead', sun: false, dark: 0.28,
      sky: ['#1e1a28', '#6a5848'], ground: '#3e322c', groundDark: '#241c18', grass: '#7a5c4c', grassDark: '#3a2a24',
      dust: '90,70,60', desc: 'Jagged storm hills' }),
    defineStage({ id: 'mudpool', name: 'Mudpool', price: 57100, seed: 97, grip: 0.85, surface: 'mud', sink: 1.4,
      oct: [[6, 50], [2.5, 18], [0.6, 7]], music: 'dark', tufts: 0.35,
      sky: ['#8a7058', '#e0c8a0'], ground: '#6a3e1c', groundDark: '#3e2410', grass: '#a06a38', grassDark: '#5c3a18',
      dust: '120,80,40', desc: 'Very low grip mud' }),
    defineStage({ id: 'volcano', name: 'Volcano', price: 57100, seed: 101, grip: 0.9, lava: true, gapMul: 1.25,
      oct: [[11, 48], [4, 16], [1.2, 6]], music: 'heat',
      sky: ['#4a1c14', '#e88858'], ground: '#2a2624', groundDark: '#141210', grass: '#3a3430', grassDark: '#221e1c',
      dust: '80,40,30', desc: 'A dip is safe. The lava is not' }),
    defineStage({ id: 'beach', name: 'Beach', price: 57100, seed: 103, grip: 0.88, surface: 'sand',
      oct: [[6, 70], [2, 24], [0.4, 8]], music: 'heat', decor: 'palms', tufts: 0.45,
      sky: ['#2ec0e4', '#fff6d0'], ground: '#f0d090', groundDark: '#c4a060', grass: '#ffe8b8', grassDark: '#d4bc78',
      dust: '230,210,150', desc: 'Sand, palms, ocean breeze' }),
    defineStage({ id: 'factory', name: 'Factory', price: 57100, seed: 107, grip: 1, ceiling: 5.6, stripes: 'warn',
      oct: [[4, 55], [2, 20], [0.5, 8]], music: 'dark', decor: 'crates', sun: false, dark: 0.4, headlight: true,
      ceilingColor: '#2a2e34',
      sky: ['#1c2128', '#6a7582'], ground: '#3a424c', groundDark: '#242a32', grass: '#6a7582', grassDark: '#2a323a',
      dust: '100,100,110', desc: 'Crates under a low roof' }),
    defineStage({ id: 'roller', name: 'Roller Coaster', price: 68600, seed: 109, grip: 1.12,
      oct: [[16, 46], [5, 20], [0.3, 90]], music: 'metal', stripes: 'road',
      sky: ['#4a86e0', '#f4f8ff'], ground: '#d44552', groundDark: '#8a2430', grass: '#ffffff', grassDark: '#e8eef6',
      dust: '180,180,190', desc: 'Huge smooth waves' }),
    defineStage({ id: 'night', name: 'Night', price: 68600, seed: 113, grip: 1,
      oct: [[8, 58], [3, 20], [0.5, 6]], music: 'dark', decor: 'trees', sun: false, stars: true, headlight: true, dark: 0.88,
      sky: ['#05060e', '#14182c'], ground: '#2a3038', groundDark: '#161a20', grass: '#3d4a38', grassDark: '#222820',
      dust: '40,40,50', desc: 'Pitch black, headlights on' }),
    defineStage({ id: 'rooftops', name: 'Rooftops', price: 68600, seed: 127, grip: 1.05, gapMul: 1.9, surface: 'tar',
      oct: [[2.2, 90], [0.7, 28], [0.15, 8]], music: 'dark', decor: 'buildings', sun: false, dark: 0.22,
      sky: ['#243044', '#8a9aab'], ground: '#5a6168', groundDark: '#343a40', grass: '#6e7680', grassDark: '#3e4650',
      dust: '90,90,100', desc: 'Wide gaps between roofs' }),
    defineStage({ id: 'junkyard', name: 'Junkyard', price: 80000, seed: 131, grip: 0.9,
      oct: [[7, 40], [3.5, 14], [1.2, 5]], music: 'dark', decor: 'scrap',
      sky: ['#7a8490', '#d5d0c4'], ground: '#6a5c48', groundDark: '#463c30', grass: '#8a7a62', grassDark: '#5c4e3c',
      dust: '110,100,80', desc: 'Piles of scrap' }),
    defineStage({ id: 'construction', name: 'Construction', price: 80000, seed: 137, grip: 0.9, surface: 'mixed',
      oct: [[8, 42], [3, 15], [1, 6]], music: 'metal', decor: 'barriers', stripes: 'warn',
      sky: ['#6eaee0', '#eef4ea'], ground: '#b08958', groundDark: '#7a5c38', grass: '#c4a06a', grassDark: '#8a6840',
      dust: '180,150,90', desc: 'Barriers and mixed grip' }),
    defineStage({ id: 'rainbow', name: 'Rainbow', price: 85700, seed: 139, grip: 1, rampMul: 1.75,
      oct: [[9, 52], [3, 18], [0.4, 7]], music: 'neon', stripes: 'rainbow',
      sky: ['#7ad0ff', '#ffe6f6'], ground: '#6a5ac8', groundDark: '#3d3480', grass: '#ffffff', grassDark: '#d0c8ff',
      dust: '200,180,255', desc: 'Bright bands, taller ramps' }),
    defineStage({ id: 'haunted', name: 'Haunted', price: 85700, seed: 149, grip: 0.9,
      oct: [[9, 50], [4, 16], [1, 6]], music: 'spooky', decor: 'dead', sun: false, dark: 0.38, stars: true,
      sky: ['#140820', '#7a58a0'], ground: '#4a3060', groundDark: '#2a1840', grass: '#8a58a0', grassDark: '#3a2048',
      dust: '70,50,80', fog: 'rgba(40,20,60,0.45)', desc: 'Purple night, dead trees' }),
    defineStage({ id: 'northpole', name: 'Northpole', price: 85700, seed: 151, grip: 0.6, surface: 'ice',
      oct: [[8, 56], [3, 18], [0.5, 6]], music: 'festive', decor: 'pines', aurora: true, sun: false,
      sky: ['#07182e', '#2a5a90'], ground: '#c5d8ea', groundDark: '#8eabc4', grass: '#ffffff', grassDark: '#e4f2fb',
      dust: '245,250,255', desc: 'Ice and an aurora sky' }),
    defineStage({ id: 'nuclear', name: 'Nuclear Plant', price: 85700, seed: 157, grip: 0.95, ceiling: 5.8, stripes: 'warn',
      oct: [[5, 60], [2.2, 22], [0.6, 8]], music: 'dark', decor: 'crates', sun: false, headlight: true, dark: 0.35,
      ceilingColor: '#14301c', fog: 'rgba(40,180,70,0.28)',
      sky: ['#1a2820', '#6a8074'], ground: '#3e4844', groundDark: '#242c28', grass: '#6a746c', grassDark: '#3a4440',
      dust: '80,120,70', desc: 'Green glow, low roof' }),
    defineStage({ id: 'arena', name: 'Arena', price: 85700, seed: 163, grip: 1.05, rampMul: 1.45,
      oct: [[12, 38], [2, 70], [0.4, 10]], music: 'metal',
      sky: ['#2a4a86', '#f2d48a'], ground: '#c4a878', groundDark: '#7a5a38', grass: '#f0e0c0', grassDark: '#b7a27a',
      dust: '190,170,130', desc: 'Bowl-shaped jumps' }),
    defineStage({ id: 'jungle', name: 'Jungle', price: 85700, seed: 167, grip: 0.9,
      oct: [[8, 46], [3.6, 16], [0.8, 6]], music: 'pastoral', decor: 'jungle', slowTrees: true,
      sky: ['#123828', '#5e9468'], ground: '#4e2810', groundDark: '#2e160c', grass: '#0f7a24', grassDark: '#0a4e16',
      dust: '50,70,30', fog: 'rgba(20,60,20,0.22)', desc: 'Thick green canopy' }),
    defineStage({ id: 'neon', name: 'Neon', price: 85700, seed: 173, grip: 1.05, surface: 'tar',
      oct: [[6, 54], [2.4, 18], [0.4, 7]], music: 'neon', decor: 'neon', sun: false, stars: true, dark: 0.42,
      sky: ['#120018', '#2a0848'], ground: '#1a1230', groundDark: '#0c0818', grass: '#ff4fd8', grassDark: '#7a2cff',
      dust: '255,80,220', desc: 'Night grid, pink and cyan' }),
    defineStage({ id: 'prognosis', name: 'Prognosis', price: 85700, seed: 179, gravity: 9, grip: 0.8,
      oct: [[10, 44], [4, 14], [1.5, 6]], music: 'space', decor: 'blobs', sun: false, stars: true, shift: true,
      sky: ['#1a0840', '#ff7ad9'], ground: '#3a2868', groundDark: '#221448', grass: '#7af0ff', grassDark: '#c46bff',
      dust: '120,200,255', desc: 'Floaty, shifting sky' }),
    defineStage({ id: 'bogland', name: 'Bogland', price: 85700, seed: 181, grip: 0.7, surface: 'mud', sink: 2.4,
      oct: [[5, 58], [2, 20], [0.5, 8]], music: 'spooky', tufts: 0.15, decor: 'dead',
      sky: ['#8a9084', '#d4d2c6'], ground: '#3e3828', groundDark: '#262218', grass: '#6a6840', grassDark: '#3e3c24',
      dust: '90,85,50', fog: 'rgba(70,75,40,0.5)', desc: 'Sinking mud and fog' }),
    defineStage({ id: 'suburbs', name: 'Suburbs', price: 85700, seed: 191, grip: 1,
      oct: [[3.5, 70], [1.2, 24], [0.3, 8]], music: 'pastoral', decor: 'houses', tufts: 0.25,
      sky: ['#7ec8f0', '#fff6e8'], ground: '#3e8a32', groundDark: '#24681c', grass: '#4caf50', grassDark: '#2e8a34',
      dust: '140,120,70', desc: 'Houses and lawns' }),
    defineStage({ id: 'action', name: 'Action Hero', price: 85700, seed: 193, grip: 0.95, gapMul: 1.7,
      oct: [[9, 40], [4, 14], [1.1, 5]], music: 'metal', decor: 'scrap',
      sky: ['#e05a28', '#ffd0a8'], ground: '#6a5044', groundDark: '#3e2c24', grass: '#a08070', grassDark: '#5a4038',
      dust: '120,80,50', desc: 'Broken road, extra gaps' }),
    defineStage({ id: 'supercountry', name: 'Super Countryside', price: 100, seed: 197, grip: 1,
      oct: [[12, 50], [4.5, 18], [0.7, 5]], music: 'pastoral', decor: 'veggies', tufts: 0.05,
      sky: ['#49b0ea', '#e7ffe0'], ground: '#9a4214', groundDark: '#6a2e0c', grass: '#3caf45', grassDark: '#1f7a2c',
      dust: '130,90,40', desc: 'Bigger farm hills' }),
    defineStage({ id: 'retro', name: 'Retro Mission', price: 85700, seed: 199, grip: 1, quant: 1.35,
      oct: [[8, 36], [3, 14], [0.2, 6]], music: 'retro', sun: false,
      sky: ['#0f380f', '#306230'], ground: '#0f380f', groundDark: '#081808', grass: '#9bbc0f', grassDark: '#8bac0f',
      dust: '155,188,15', desc: 'Chunky steps, limited colors' }),
    defineStage({ id: 'megahighway', name: 'Mega Highway', price: 2000, seed: 211, grip: 1.08, surface: 'tar', fuelMul: 2.8,
      oct: [[2.2, 160], [0.7, 50], [0.15, 16]], music: 'metal', stripes: 'road',
      sky: ['#5a7890', '#c5d0d8'], ground: '#2a2e34', groundDark: '#16181c', grass: '#4e7a42', grassDark: '#2a5228',
      dust: '70,70,80', desc: 'Longer, flatter highway' }),
    defineStage({ id: 'megadesert', name: 'Mega Desert', price: 2000, seed: 223, grip: 0.88, surface: 'sand',
      oct: [[16, 100], [4, 32], [0.4, 8]], music: 'heat', decor: 'cactus', tufts: 0.7,
      sky: ['#e07020', '#ffd59a'], ground: '#e0a850', groundDark: '#a87830', grass: '#f8d888', grassDark: '#c9a05a',
      dust: '230,190,120', desc: 'Taller dunes than Desert' }),
    defineStage({ id: 'london', name: 'London', price: 2500, seed: 251, grip: 0.94,
      surface: 'tar', gapMul: 1.25,
      oct: [[4, 80], [1.4, 28], [0.3, 8]], music: 'pastoral', decor: 'london', tufts: 0,
      sky: ['#7e8c9a', '#c9d2da'], ground: '#3a4148', groundDark: '#23282e', grass: '#5e6a62', grassDark: '#3e4650',
      dust: '90,95,105', fog: 'rgba(180,190,200,0.22)', sun: false,
      desc: 'Rainy streets by the river' }),
    defineStage({ id: 'space', name: 'Space Mission', price: 85700, seed: 227, gravity: 5, grip: 0.85,
      oct: [[8, 40], [4, 12], [2.2, 5]], music: 'space', decor: 'asteroids', sun: false, stars: true, wind: 0,
      sky: ['#02030a', '#1a2240'], ground: '#3a404c', groundDark: '#222830', grass: '#8a92a4', grassDark: '#4a5260',
      dust: '160,170,190', desc: 'Very low gravity. Gas lifts the Rocket Car' }),
  ];

  const VEHICLES = [
    { id: 'jeep', name: 'Jeep', price: 0, upgBase: 300, desc: 'Reliable all-rounder',
      mass: 10, inertia: 9, torque: 28, maxSpeed: 22, k: 420, c: 32, grip: 1.0, tank: 32, air: 5,
      wheels: [{ x: -1.15, y: -0.55, r: 0.5 }, { x: 1.15, y: -0.55, r: 0.5 }],
      hull: [[-1.55, -0.25], [1.55, -0.25], [1.55, 0.35], [-1.55, 0.35], [-1.1, 1.05], [0.5, 1.05]],
      head: { x: -0.12, y: 0.88, r: 0.42 }, seat: { x: -0.28, y: 0.22 }, hand: { x: 0.38, y: 0.55 },
      exhaust: { x: -1.6, y: -0.1 }, color: '#e8341c', rim: '#f5c518' },
    { id: 'bike', name: 'Motocross', price: 1000, upgBase: 450, desc: 'Light, fast, flippy', bike: true,
      mass: 5, inertia: 2.2, torque: 22, maxSpeed: 25, k: 230, c: 16, grip: 1.05, tank: 26, air: 7,
      wheels: [{ x: -0.85, y: -0.4, r: 0.42, m: 0.6 }, { x: 0.85, y: -0.4, r: 0.42, m: 0.6, drive: false }],
      hull: [[-0.9, -0.1], [0.9, -0.1], [0.6, 0.3], [-0.7, 0.3]],
      head: { x: 0.02, y: 1.12, r: 0.38 }, seat: { x: -0.25, y: 0.32 }, hand: { x: 0.55, y: 0.7 },
      exhaust: { x: -0.9, y: 0.0 }, color: '#2e7fe8', rim: '#dddddd' },
    { id: 'monster', name: 'Monster Truck', price: 2500, upgBase: 700, desc: 'Giant wheels, big torque',
      mass: 14, inertia: 16, torque: 55, maxSpeed: 20, k: 380, c: 30, grip: 1.15, tank: 36, air: 4,
      wheels: [{ x: -1.35, y: -0.75, r: 0.9, m: 1.6 }, { x: 1.35, y: -0.75, r: 0.9, m: 1.6 }],
      hull: [[-1.7, -0.1], [1.7, -0.1], [1.7, 0.6], [-1.7, 0.6], [-0.9, 1.3], [0.5, 1.3]],
      head: { x: -0.22, y: 1.28, r: 0.42 }, seat: { x: -0.4, y: 0.5 }, hand: { x: 0.28, y: 0.85 },
      exhaust: { x: -1.75, y: 0.2 }, color: '#8a2be2', rim: '#c0c0c0', treads: true },
    { id: 'tractor', name: 'Tractor', price: 4000, upgBase: 500, desc: 'Slow but climbs anything', style: 'box',
      mass: 13, inertia: 12, torque: 60, maxSpeed: 12, k: 400, c: 34, grip: 1.3, tank: 40, air: 3,
      wheels: [{ x: -1.0, y: -0.4, r: 0.8, m: 1.5 }, { x: 1.2, y: -0.6, r: 0.45, m: 0.8, drive: false }],
      hull: [[-1.4, -0.1], [1.6, -0.1], [1.6, 0.5], [-1.4, 0.5], [-1.0, 1.3], [-0.1, 1.3]],
      head: { x: -0.52, y: 1.18, r: 0.4 }, seat: { x: -0.62, y: 0.38 }, hand: { x: -0.08, y: 0.7 },
      exhaust: { x: 0.9, y: 1.2 }, color: '#3cae3a', rim: '#f5c518', treads: true, bodyH: 0.6 },
    { id: 'van', name: 'Hippie Van', price: 5500, upgBase: 550, desc: 'Long and a little tippy',
      mass: 12, inertia: 14, torque: 26, maxSpeed: 20, k: 400, c: 30, grip: 1.0, tank: 34, air: 4,
      wheels: [{ x: -1.35, y: -0.45, r: 0.42 }, { x: 1.35, y: -0.45, r: 0.42 }],
      hull: [[-1.7, -0.15], [1.7, -0.15], [1.7, 0.85], [-1.7, 0.85]],
      head: { x: 0.85, y: 0.95, r: 0.36 }, seat: { x: 0.7, y: 0.15 }, hand: { x: 1.25, y: 0.45 },
      exhaust: { x: -1.75, y: 0 }, color: '#7b3ff0', rim: '#f2f2f2', windows: true },
    { id: 'quad', name: 'Quad Bike', price: 8500, upgBase: 400, desc: 'Light 4-wheeler, easy flips', style: 'box',
      mass: 6, inertia: 3, torque: 16, maxSpeed: 20, k: 260, c: 18, grip: 1.05, tank: 28, air: 6,
      wheels: [{ x: -0.75, y: -0.35, r: 0.38, m: 0.6 }, { x: 0.75, y: -0.35, r: 0.38, m: 0.6 }],
      hull: [[-0.9, -0.1], [0.9, -0.1], [0.8, 0.3], [-0.8, 0.3]],
      head: { x: -0.08, y: 1.02, r: 0.38 }, seat: { x: -0.25, y: 0.28 }, hand: { x: 0.38, y: 0.58 },
      exhaust: { x: -0.95, y: 0 }, color: '#ff8c1a', rim: '#dddddd', bodyH: 0.4 },
    { id: 'bus', name: 'Tourist Bus', price: 10000, upgBase: 700, desc: 'Long, heavy and tippy', style: 'box',
      mass: 18, inertia: 30, torque: 45, maxSpeed: 18, k: 520, c: 40, grip: 1.0, tank: 40, air: 3,
      wheels: [{ x: -1.9, y: -0.7, r: 0.55, m: 1.2 }, { x: 0, y: -0.7, r: 0.55, m: 1.2, drive: false }, { x: 1.9, y: -0.7, r: 0.55, m: 1.2 }],
      hull: [[-2.5, -0.3], [2.5, -0.3], [2.5, 1.4], [-2.5, 1.4]],
      head: { x: 1.55, y: 0.95, r: 0.4 }, seat: { x: 1.45, y: 0.28 }, hand: { x: 2.05, y: 0.65 },
      exhaust: { x: -2.6, y: -0.2 }, color: '#f5b800', rim: '#cccccc', bodyH: 1.7, windows: true, driverFront: true },
    { id: 'racecar', name: 'Race Car', price: 12000, upgBase: 650, desc: 'Super fast, hates steep hills', style: 'box',
      mass: 9, inertia: 8, torque: 30, maxSpeed: 32, k: 500, c: 36, grip: 0.9, tank: 28, air: 4,
      wheels: [{ x: -1.3, y: -0.3, r: 0.38 }, { x: 1.3, y: -0.3, r: 0.38 }],
      hull: [[-1.8, -0.15], [1.8, -0.15], [1.8, 0.2], [-1.8, 0.25], [-0.6, 0.75], [0.3, 0.75]],
      head: { x: -0.22, y: 0.78, r: 0.36 }, seat: { x: -0.35, y: 0.08 }, hand: { x: 0.18, y: 0.38 },
      exhaust: { x: -1.85, y: 0 }, color: '#ffd200', rim: '#222222', bodyH: 0.35 },
    { id: 'police', name: 'Police Car', price: 14000, upgBase: 650, desc: 'Fast cruiser',
      mass: 10, inertia: 9, torque: 28, maxSpeed: 28, k: 460, c: 34, grip: 1.0, tank: 30, air: 4,
      wheels: [{ x: -1.25, y: -0.38, r: 0.4 }, { x: 1.25, y: -0.38, r: 0.4 }],
      hull: [[-1.6, -0.15], [1.6, -0.15], [1.55, 0.45], [-1.15, 0.85], [-0.2, 0.85], [-0.7, 0.45]],
      head: { x: -0.15, y: 0.85, r: 0.34 }, seat: { x: -0.3, y: 0.12 }, hand: { x: 0.15, y: 0.4 },
      exhaust: { x: -1.65, y: 0 }, color: '#f7f7f7', rim: '#111', stripe: '#1a1a1a' },
    { id: 'ambulance', name: 'Ambulance', price: 16000, upgBase: 700, desc: 'Boxy and tall',
      mass: 13, inertia: 16, torque: 32, maxSpeed: 22, k: 440, c: 32, grip: 0.95, tank: 34, air: 3,
      wheels: [{ x: -1.3, y: -0.42, r: 0.42 }, { x: 1.35, y: -0.42, r: 0.42 }],
      hull: [[-1.7, -0.15], [1.7, -0.15], [1.7, 0.95], [-1.7, 0.95]],
      head: { x: 0.7, y: 1.05, r: 0.34 }, seat: { x: 0.55, y: 0.18 }, hand: { x: 1.15, y: 0.5 },
      exhaust: { x: -1.75, y: 0.05 }, color: '#f4f7fb', rim: '#c0392b', windows: true },
    { id: 'diesel', name: 'Super Diesel', price: 20000, upgBase: 800, desc: 'Heavy hauler, lots of torque',
      mass: 16, inertia: 20, torque: 50, maxSpeed: 18, k: 480, c: 36, grip: 1.15, tank: 42, air: 3,
      wheels: [{ x: -1.5, y: -0.55, r: 0.55, m: 1.2 }, { x: 1.15, y: -0.5, r: 0.48 }],
      hull: [[-1.8, -0.1], [1.5, -0.1], [1.7, 0.55], [0.4, 0.7], [-0.2, 1.15], [-1.5, 1.15], [-1.8, 0.45]],
      head: { x: -0.7, y: 1.15, r: 0.36 }, seat: { x: -0.85, y: 0.4 }, hand: { x: -0.2, y: 0.7 },
      exhaust: { x: 0.55, y: 1.2 }, color: '#e23b2f', rim: '#222', treads: true },
    { id: 'chopper', name: 'Chopper', price: 24000, upgBase: 700, desc: 'Long bike, big air control', bike: true,
      mass: 6, inertia: 3.2, torque: 24, maxSpeed: 26, k: 240, c: 16, grip: 1.0, tank: 26, air: 8,
      wheels: [{ x: -1.15, y: -0.35, r: 0.4, m: 0.6 }, { x: 1.05, y: -0.35, r: 0.4, m: 0.6, drive: false }],
      hull: [[-1.2, -0.08], [1.15, -0.08], [0.4, 0.28], [-0.85, 0.32]],
      head: { x: -0.15, y: 1.0, r: 0.36 }, seat: { x: -0.45, y: 0.28 }, hand: { x: 0.55, y: 0.5 },
      exhaust: { x: -1.15, y: 0.05 }, color: '#111111', rim: '#c0c0c0' },
    { id: 'tank', name: 'Tank', price: 30000, upgBase: 1200, desc: 'Six wheels, unstoppable grip', style: 'box',
      mass: 20, inertia: 25, torque: 22, maxSpeed: 12, k: 600, c: 45, grip: 1.5, tank: 60, air: 2,
      wheels: [-1.5, -0.9, -0.3, 0.3, 0.9, 1.5].map((x) => ({ x, y: -0.55, r: 0.32, m: 0.8 })),
      hull: [[-1.9, -0.2], [1.9, -0.2], [1.9, 0.45], [-1.9, 0.45], [-0.6, 1.0], [0.6, 1.0]],
      head: { x: -0.12, y: 1.05, r: 0.4 }, seat: { x: -0.18, y: 0.55 }, hand: { x: 0.28, y: 0.75 },
      exhaust: { x: -1.95, y: 0.2 }, color: '#5b6b3a', rim: '#3a4425', treads: true, bodyH: 0.65, turret: true },
    { id: 'snowmobile', name: 'Snow Mobile', price: 34000, upgBase: 700, desc: 'Light ski machine',
      mass: 6, inertia: 3, torque: 20, maxSpeed: 24, k: 240, c: 16, grip: 0.85, tank: 24, air: 6,
      wheels: [{ x: -0.7, y: -0.28, r: 0.32, m: 0.5 }, { x: 0.85, y: -0.22, r: 0.18, m: 0.3, drive: false }],
      hull: [[-0.9, -0.05], [1.05, -0.05], [0.7, 0.28], [-0.55, 0.42]],
      head: { x: 0.05, y: 0.85, r: 0.34 }, seat: { x: -0.2, y: 0.22 }, hand: { x: 0.45, y: 0.4 },
      exhaust: { x: -0.9, y: 0.1 }, color: '#1f8a4c', rim: '#dddddd' },
    { id: 'truck', name: 'Truck', price: 38000, upgBase: 800, desc: 'Long nose, strong pull',
      mass: 15, inertia: 18, torque: 42, maxSpeed: 20, k: 460, c: 34, grip: 1.1, tank: 40, air: 3,
      wheels: [{ x: -1.45, y: -0.5, r: 0.5, m: 1.1 }, { x: 1.25, y: -0.48, r: 0.48 }],
      hull: [[-1.7, -0.12], [1.55, -0.12], [1.7, 0.4], [0.35, 0.55], [-0.15, 1.05], [-1.45, 1.05], [-1.7, 0.4]],
      head: { x: -0.55, y: 1.05, r: 0.36 }, seat: { x: -0.7, y: 0.32 }, hand: { x: -0.05, y: 0.6 },
      exhaust: { x: 0.2, y: 1.15 }, color: '#2f6fed', rim: '#222' },
    { id: 'buggy', name: 'Dune Buggy', price: 42000, upgBase: 650, desc: 'Open frame, loves dunes',
      mass: 7, inertia: 4, torque: 22, maxSpeed: 24, k: 280, c: 18, grip: 1.1, tank: 28, air: 6,
      wheels: [{ x: -1.05, y: -0.4, r: 0.46 }, { x: 1.05, y: -0.4, r: 0.46 }],
      hull: [[-1.15, -0.05], [1.2, -0.05], [1.05, 0.35], [0.2, 0.7], [-0.85, 0.55], [-1.15, 0.25]],
      head: { x: -0.15, y: 0.85, r: 0.34 }, seat: { x: -0.25, y: 0.18 }, hand: { x: 0.35, y: 0.4 },
      exhaust: { x: -1.2, y: 0.1 }, color: '#ff5a1f', rim: '#111' },
    { id: 'hover', name: 'Hovercraft', price: 48000, upgBase: 800, desc: 'Wide skirt, slides on hills',
      mass: 9, inertia: 8, torque: 20, maxSpeed: 22, k: 220, c: 14, grip: 0.75, tank: 30, air: 5,
      wheels: [{ x: -1.1, y: -0.22, r: 0.28, m: 0.4 }, { x: 1.1, y: -0.22, r: 0.28, m: 0.4 }],
      hull: [[-1.6, -0.12], [1.6, -0.12], [1.45, 0.28], [-1.45, 0.28]],
      head: { x: 0.15, y: 0.7, r: 0.34 }, seat: { x: 0, y: 0.12 }, hand: { x: 0.45, y: 0.35 },
      exhaust: null, color: '#f2d23a', rim: '#666' },
    { id: 'finger', name: 'Big Finger', price: 55000, upgBase: 900, desc: 'Tall finger, wild balance',
      mass: 8, inertia: 6, torque: 18, maxSpeed: 18, k: 260, c: 16, grip: 1.0, tank: 26, air: 7,
      wheels: [{ x: -0.4, y: -0.35, r: 0.38 }, { x: 0.4, y: -0.35, r: 0.38 }],
      hull: [[-0.38, -0.15], [0.38, -0.15], [0.42, 1.35], [0.12, 1.7], [-0.18, 1.7], [-0.42, 1.25]],
      head: { x: 0, y: 1.15, r: 0.32 }, seat: { x: -0.05, y: 0.35 }, hand: { x: 0.15, y: 0.7 },
      exhaust: null, color: '#f0c9a0', rim: '#333' },
    { id: 'rally', name: 'Rally Car', price: 62000, upgBase: 750, desc: 'Grippy and quick',
      mass: 9, inertia: 7, torque: 32, maxSpeed: 30, k: 480, c: 34, grip: 1.2, tank: 30, air: 5,
      wheels: [{ x: -1.2, y: -0.36, r: 0.4 }, { x: 1.2, y: -0.36, r: 0.4 }],
      hull: [[-1.55, -0.12], [1.55, -0.12], [1.4, 0.32], [-0.15, 0.62], [-0.7, 0.62], [-1.2, 0.32]],
      head: { x: -0.2, y: 0.7, r: 0.32 }, seat: { x: -0.35, y: 0.08 }, hand: { x: 0.1, y: 0.32 },
      exhaust: { x: -1.6, y: 0 }, color: '#1aa34a', rim: '#eee', stripe: '#f5f5f5' },
    { id: 'dragster', name: 'Dragster', price: 70000, upgBase: 800, desc: 'Huge torque, tiny rear weight',
      mass: 7, inertia: 5, torque: 40, maxSpeed: 34, k: 420, c: 28, grip: 0.85, tank: 22, air: 4,
      wheels: [{ x: -1.7, y: -0.55, r: 0.62 }, { x: 1.35, y: -0.22, r: 0.22, drive: false }],
      hull: [[-1.3, -0.05], [1.6, -0.02], [1.15, 0.22], [-0.4, 0.35], [-1.15, 0.2]],
      head: { x: 0.15, y: 0.55, r: 0.3 }, seat: { x: -0.15, y: 0.12 }, hand: { x: 0.7, y: 0.22 },
      exhaust: { x: -1.2, y: 0.15 }, color: '#c0392b', rim: '#111' },
    { id: 'scooter', name: 'Scooter', price: 1500, upgBase: 350, desc: 'Small and easy to flip', bike: true,
      mass: 4, inertia: 1.8, torque: 12, maxSpeed: 16, k: 180, c: 12, grip: 0.95, tank: 18, air: 6,
      wheels: [{ x: -0.55, y: -0.28, r: 0.28, m: 0.4 }, { x: 0.6, y: -0.28, r: 0.28, m: 0.4, drive: false }],
      hull: [[-0.6, -0.05], [0.7, -0.05], [0.35, 0.35], [-0.15, 0.55], [-0.45, 0.25]],
      head: { x: 0.05, y: 0.95, r: 0.32 }, seat: { x: -0.15, y: 0.32 }, hand: { x: 0.4, y: 0.45 },
      exhaust: { x: -0.6, y: 0.05 }, color: '#f28b20', rim: '#eee' },
    { id: 'superjeep', name: 'Super Jeep', price: 150, upgBase: 320, desc: 'Snorkel, roof lamp, more pull',
      mass: 11, inertia: 10, torque: 36, maxSpeed: 23, k: 440, c: 34, grip: 1.05, tank: 36, air: 5,
      wheels: [{ x: -1.25, y: -0.58, r: 0.55 }, { x: 1.25, y: -0.58, r: 0.55 }],
      hull: [[-1.7, -0.2], [1.7, -0.2], [1.65, 0.4], [-1.2, 1.1], [0.55, 1.1]],
      head: { x: -0.15, y: 0.9, r: 0.4 }, seat: { x: -0.3, y: 0.22 }, hand: { x: 0.4, y: 0.55 },
      exhaust: { x: -1.7, y: 0.05 }, color: '#d4521a', rim: '#f5c518' },
    { id: 'used', name: 'Used Car', price: 400, upgBase: 280, desc: 'Plain, slow, and reliable',
      mass: 10, inertia: 9, torque: 18, maxSpeed: 16, k: 380, c: 30, grip: 0.95, tank: 30, air: 4,
      wheels: [{ x: -1.15, y: -0.4, r: 0.38 }, { x: 1.15, y: -0.4, r: 0.38 }],
      hull: [[-1.5, -0.12], [1.5, -0.12], [1.4, 0.4], [-0.2, 0.72], [-0.9, 0.72], [-1.35, 0.38]],
      head: { x: -0.4, y: 0.62, r: 0.32 }, seat: { x: -0.5, y: 0.12 }, hand: { x: 0.05, y: 0.35 },
      exhaust: { x: -1.5, y: 0 }, color: '#8a9aa8', rim: '#ddd' },
    { id: 'family', name: 'Family Car', price: 900, upgBase: 300, desc: 'Boxy wagon, medium everything',
      mass: 12, inertia: 12, torque: 22, maxSpeed: 18, k: 400, c: 32, grip: 1, tank: 34, air: 4,
      wheels: [{ x: -1.35, y: -0.42, r: 0.4 }, { x: 1.3, y: -0.42, r: 0.4 }],
      hull: [[-1.7, -0.12], [1.65, -0.12], [1.6, 0.85], [-1.55, 0.85]],
      head: { x: 0.55, y: 0.75, r: 0.32 }, seat: { x: 0.4, y: 0.15 }, hand: { x: 1.05, y: 0.4 },
      exhaust: { x: -1.7, y: 0.05 }, color: '#3d7edb', rim: '#eee' },
    { id: 'trophy', name: 'Trophy Truck', price: 3500, upgBase: 650, desc: 'Long-travel shocks, desert lamps',
      mass: 12, inertia: 12, torque: 40, maxSpeed: 26, k: 320, c: 22, grip: 1.15, tank: 32, air: 5,
      wheels: [{ x: -1.4, y: -0.7, r: 0.62 }, { x: 1.45, y: -0.7, r: 0.62 }],
      hull: [[-1.7, -0.05], [1.8, -0.05], [1.7, 0.45], [-0.2, 0.85], [-1.2, 0.85], [-1.6, 0.4]],
      head: { x: -0.45, y: 0.75, r: 0.32 }, seat: { x: -0.55, y: 0.15 }, hand: { x: 0.05, y: 0.4 },
      exhaust: { x: -1.7, y: 0.2 }, color: '#e23b2f', rim: '#222' },
    { id: 'electric', name: 'Electric Car', price: 4500, upgBase: 500, desc: 'Quiet hatch, no exhaust',
      mass: 9, inertia: 8, torque: 26, maxSpeed: 24, k: 460, c: 34, grip: 1.05, tank: 36, air: 5,
      wheels: [{ x: -1.15, y: -0.38, r: 0.38 }, { x: 1.2, y: -0.38, r: 0.38 }],
      hull: [[-1.45, -0.1], [1.5, -0.1], [1.35, 0.35], [-0.15, 0.7], [-0.85, 0.7], [-1.3, 0.32]],
      head: { x: -0.3, y: 0.6, r: 0.3 }, seat: { x: -0.4, y: 0.1 }, hand: { x: 0.1, y: 0.32 },
      exhaust: null, color: '#f4f7fb', rim: '#9be37a' },
    { id: 'minibike', name: 'Minibike', price: 6000, upgBase: 400, desc: 'Smaller than the motocross', bike: true,
      mass: 3.5, inertia: 1.4, torque: 14, maxSpeed: 20, k: 180, c: 12, grip: 1.05, tank: 18, air: 8,
      wheels: [{ x: -0.55, y: -0.32, r: 0.32, m: 0.45 }, { x: 0.6, y: -0.32, r: 0.32, m: 0.45, drive: false }],
      hull: [[-0.6, -0.05], [0.65, -0.05], [0.35, 0.28], [-0.4, 0.32]],
      head: { x: 0.02, y: 0.85, r: 0.3 }, seat: { x: -0.15, y: 0.28 }, hand: { x: 0.4, y: 0.5 },
      exhaust: { x: -0.6, y: 0.05 }, color: '#f2c14e', rim: '#333', treads: true },
    { id: 'corkscrew', name: 'Corkscrew', price: 9000, upgBase: 500, desc: 'A screw standing on two wheels',
      mass: 8, inertia: 6, torque: 16, maxSpeed: 14, k: 260, c: 18, grip: 0.9, tank: 24, air: 6,
      wheels: [{ x: -0.35, y: -0.32, r: 0.32 }, { x: 0.35, y: -0.32, r: 0.32 }],
      hull: [[-0.28, -0.1], [0.28, -0.1], [0.32, 1.15], [0.1, 1.55], [-0.1, 1.55], [-0.32, 1.1]],
      head: { x: 0, y: 0.7, r: 0.28 }, seat: { x: -0.05, y: 0.2 }, hand: { x: 0.15, y: 0.45 },
      exhaust: null, color: '#c0c6ce', rim: '#222' },
    { id: 'lowrider', name: 'Lowrider', price: 11000, upgBase: 550, desc: 'Long and very low',
      mass: 11, inertia: 11, torque: 24, maxSpeed: 22, k: 280, c: 18, grip: 0.9, tank: 30, air: 4,
      wheels: [{ x: -1.45, y: -0.28, r: 0.28 }, { x: 1.5, y: -0.28, r: 0.28 }],
      hull: [[-1.8, -0.08], [1.85, -0.08], [1.7, 0.28], [-0.2, 0.42], [-1.1, 0.42], [-1.65, 0.22]],
      head: { x: -0.45, y: 0.38, r: 0.26 }, seat: { x: -0.55, y: 0.05 }, hand: { x: 0.05, y: 0.2 },
      exhaust: { x: -1.75, y: 0 }, color: '#7a1f8a', rim: '#f2f2f2' },
    { id: 'firetruck', name: 'Fire Truck', price: 15000, upgBase: 700, desc: 'Ladder, hose, and extra wheels',
      mass: 16, inertia: 20, torque: 36, maxSpeed: 18, k: 480, c: 36, grip: 1.05, tank: 40, air: 3,
      wheels: [{ x: -1.7, y: -0.48, r: 0.42 }, { x: -0.55, y: -0.48, r: 0.42, drive: false }, { x: 1.55, y: -0.48, r: 0.42 }],
      hull: [[-2.1, -0.12], [2.05, -0.12], [2.05, 0.7], [-0.2, 0.95], [-1.3, 0.95], [-2.05, 0.55]],
      head: { x: 1.15, y: 0.85, r: 0.32 }, seat: { x: 1.0, y: 0.15 }, hand: { x: 1.6, y: 0.45 },
      exhaust: { x: -2.05, y: 0.15 }, color: '#e23b2f', rim: '#f5c518' },
    { id: 'hotrod', name: 'Hot Rod', price: 18000, upgBase: 650, desc: 'Chopped roof and big rear slicks',
      mass: 8, inertia: 7, torque: 34, maxSpeed: 30, k: 420, c: 28, grip: 0.9, tank: 24, air: 5,
      wheels: [{ x: -1.25, y: -0.48, r: 0.5 }, { x: 1.2, y: -0.32, r: 0.32, drive: false }],
      hull: [[-1.4, -0.05], [1.45, -0.05], [1.2, 0.28], [-0.15, 0.48], [-0.9, 0.42], [-1.3, 0.22]],
      head: { x: -0.35, y: 0.42, r: 0.28 }, seat: { x: -0.45, y: 0.08 }, hand: { x: 0.15, y: 0.25 },
      exhaust: { x: -1.35, y: 0.15 }, color: '#c0392b', rim: '#111' },
    { id: 'fastcar', name: 'Fast Car', price: 22000, upgBase: 700, desc: 'Low, light, and very quick',
      mass: 8, inertia: 6, torque: 32, maxSpeed: 34, k: 500, c: 36, grip: 1.05, tank: 26, air: 5,
      wheels: [{ x: -1.2, y: -0.32, r: 0.36 }, { x: 1.25, y: -0.32, r: 0.36 }],
      hull: [[-1.55, -0.08], [1.6, -0.1], [1.45, 0.22], [-0.2, 0.48], [-0.85, 0.48], [-1.4, 0.2]],
      head: { x: -0.35, y: 0.42, r: 0.26 }, seat: { x: -0.45, y: 0.05 }, hand: { x: 0.1, y: 0.22 },
      exhaust: { x: -1.55, y: 0.05 }, color: '#1a1a1a', rim: '#ddd' },
    { id: 'skycar', name: 'Sky Car', price: 26000, upgBase: 650, desc: 'A wing and a fan, weak grip',
      mass: 7, inertia: 6, torque: 20, maxSpeed: 24, k: 300, c: 18, grip: 0.7, tank: 26, air: 10,
      wheels: [{ x: -1.05, y: -0.32, r: 0.32 }, { x: 1.05, y: -0.32, r: 0.32 }],
      hull: [[-1.3, -0.05], [1.25, -0.05], [0.9, 0.35], [-0.2, 0.55], [-1.05, 0.4]],
      head: { x: -0.15, y: 0.5, r: 0.28 }, seat: { x: -0.25, y: 0.08 }, hand: { x: 0.25, y: 0.28 },
      exhaust: null, color: '#7ec8f0', rim: '#333' },
    { id: 'luxury', name: 'Luxury Car', price: 32000, upgBase: 800, desc: 'Long chrome sedan, soft springs',
      mass: 13, inertia: 14, torque: 26, maxSpeed: 26, k: 260, c: 16, grip: 0.85, tank: 34, air: 3,
      wheels: [{ x: -1.45, y: -0.4, r: 0.4 }, { x: 1.5, y: -0.4, r: 0.4 }],
      hull: [[-1.9, -0.1], [1.95, -0.1], [1.8, 0.4], [-0.15, 0.62], [-1.15, 0.62], [-1.75, 0.35]],
      head: { x: -0.45, y: 0.55, r: 0.3 }, seat: { x: -0.55, y: 0.1 }, hand: { x: 0.1, y: 0.32 },
      exhaust: { x: -1.85, y: 0.05 }, color: '#1c2430', rim: '#e8e8e8' },
    { id: 'train', name: 'Toy Train', price: 38000, upgBase: 800, desc: 'Engine plus one carriage',
      mass: 18, inertia: 28, torque: 30, maxSpeed: 16, k: 520, c: 40, grip: 1.1, tank: 42, air: 2,
      wheels: [{ x: -1.7, y: -0.32, r: 0.28, drive: false }, { x: -0.55, y: -0.32, r: 0.28, drive: false }, { x: 1.5, y: -0.32, r: 0.28 }, { x: 2.3, y: -0.32, r: 0.28 }],
      hull: [[-2.15, -0.08], [2.7, -0.08], [2.6, 0.55], [1.15, 1.05], [0.15, 1.05], [-0.15, 0.75], [-2.1, 0.7]],
      head: { x: 1.5, y: 0.9, r: 0.3 }, seat: { x: 1.6, y: 0.2 }, hand: { x: 1.05, y: 0.5 },
      exhaust: { x: 2.2, y: 1.15 }, color: '#1f4f8a', rim: '#222' },
    { id: 'moonlander', name: 'Moonlander', price: 44000, upgBase: 800, desc: 'Thruster push while airborne',
      mass: 8, inertia: 7, torque: 18, maxSpeed: 16, k: 280, c: 16, grip: 0.85, tank: 28, air: 7,
      wheels: [{ x: -0.7, y: -0.4, r: 0.36 }, { x: 0.75, y: -0.4, r: 0.36 }],
      hull: [[-0.95, -0.08], [1.05, -0.08], [0.95, 0.45], [-0.7, 0.7], [-0.95, 0.4]],
      head: { x: -0.15, y: 0.6, r: 0.3 }, seat: { x: -0.2, y: 0.12 }, hand: { x: 0.35, y: 0.35 },
      exhaust: null, color: '#d9dde4', rim: '#333' },
    { id: 'rocket', name: 'Rocket Car', price: 50000, upgBase: 800, desc: 'Jump lifts on two belly rockets. In the air, left and right slide',
      mass: 7, inertia: 6, torque: 28, maxSpeed: 32, k: 400, c: 26, grip: 0.8, tank: 24, air: 8,
      wheels: [{ x: -0.85, y: -0.32, r: 0.3 }, { x: 0.7, y: -0.28, r: 0.26, drive: false }],
      hull: [[-1.15, -0.05], [0.4, -0.02], [1.35, 0.18], [0.35, 0.42], [-0.9, 0.35]],
      head: { x: 0.05, y: 0.4, r: 0.26 }, seat: { x: -0.1, y: 0.08 }, hand: { x: 0.45, y: 0.25 },
      exhaust: { x: -1.15, y: 0.12 }, color: '#f2f2f2', rim: '#c0392b' },
    { id: 'shifter', name: 'Shapeshifter', price: 56000, upgBase: 800, desc: 'Both pedals swap the body', shape: 'low',
      mass: 8, inertia: 7, torque: 26, maxSpeed: 24, k: 360, c: 24, grip: 1, tank: 28, air: 6,
      wheels: [{ x: -1.05, y: -0.36, r: 0.36 }, { x: 1.1, y: -0.36, r: 0.36 }],
      hull: [[-1.35, -0.08], [1.4, -0.08], [1.2, 0.22], [-0.1, 0.4], [-1.15, 0.22]],
      head: { x: -0.2, y: 0.38, r: 0.26 }, seat: { x: -0.3, y: 0.05 }, hand: { x: 0.2, y: 0.2 },
      alt: {
        hull: [[-1.15, -0.05], [1.15, -0.05], [1.05, 0.55], [-0.15, 0.95], [-0.9, 0.9], [-1.15, 0.4]],
        head: { x: -0.35, y: 0.78, r: 0.3 }, seat: { x: -0.45, y: 0.2 }, hand: { x: 0.15, y: 0.45 },
      },
      exhaust: { x: -1.2, y: 0.1 }, color: '#6a4cff', rim: '#eee' },
    { id: 'sleigh', name: 'Sleigh', price: 60000, upgBase: 600, desc: 'Runners over the wheels',
      mass: 9, inertia: 8, torque: 22, maxSpeed: 20, k: 300, c: 18, grip: 0.75, tank: 28, air: 5,
      wheels: [{ x: -0.9, y: -0.28, r: 0.22 }, { x: 0.85, y: -0.28, r: 0.22, drive: false }],
      hull: [[-1.15, 0.05], [1.05, 0.02], [0.9, 0.45], [-0.95, 0.5]],
      head: { x: -0.1, y: 0.7, r: 0.3 }, seat: { x: -0.2, y: 0.2 }, hand: { x: 0.35, y: 0.4 },
      exhaust: null, color: '#c0392b', rim: '#f5c518' },
    { id: 'saucer', name: 'Saucer', price: 66000, upgBase: 800, desc: 'A disc with a glass dome',
      mass: 8, inertia: 7, torque: 18, maxSpeed: 22, k: 240, c: 14, grip: 0.65, tank: 30, air: 8,
      wheels: [{ x: -0.7, y: -0.22, r: 0.22 }, { x: 0.7, y: -0.22, r: 0.22 }],
      hull: [[-1.35, -0.08], [1.35, -0.08], [1.15, 0.22], [-1.15, 0.22]],
      head: { x: 0, y: 0.55, r: 0.28 }, seat: { x: -0.05, y: 0.12 }, hand: { x: 0.25, y: 0.3 },
      exhaust: null, color: '#c8cdd6', rim: '#39f3ff' },
    { id: 'trackracer', name: 'Track Racer', price: 72000, upgBase: 900, desc: 'A racer on treads', treads: true,
      mass: 14, inertia: 16, torque: 42, maxSpeed: 22, k: 520, c: 38, grip: 1.35, tank: 34, air: 3,
      wheels: [-1.15, -0.55, 0.05, 0.65, 1.25].map((x) => ({ x, y: -0.42, r: 0.28, m: 0.7 })),
      hull: [[-1.5, -0.08], [1.55, -0.1], [1.4, 0.28], [-0.2, 0.55], [-1.15, 0.5], [-1.45, 0.22]],
      head: { x: -0.35, y: 0.48, r: 0.28 }, seat: { x: -0.45, y: 0.08 }, hand: { x: 0.1, y: 0.28 },
      exhaust: { x: -1.45, y: 0.15 }, color: '#f5c518', rim: '#222' },
    { id: 'fastbike', name: 'Fast Bike', price: 80000, upgBase: 900, desc: 'Very fast and easy to loop', bike: true,
      mass: 4.5, inertia: 2, torque: 28, maxSpeed: 36, k: 240, c: 16, grip: 1.05, tank: 22, air: 9,
      wheels: [{ x: -0.8, y: -0.38, r: 0.38, m: 0.5 }, { x: 0.85, y: -0.38, r: 0.38, m: 0.5, drive: false }],
      hull: [[-0.85, -0.05], [0.9, -0.05], [0.45, 0.32], [-0.55, 0.35]],
      head: { x: 0.05, y: 0.95, r: 0.32 }, seat: { x: -0.2, y: 0.32 }, hand: { x: 0.5, y: 0.55 },
      exhaust: { x: -0.85, y: 0.08 }, color: '#111111', rim: '#c0c0c0' },
    { id: 'roadster', name: 'Tesla Roadster', price: 90000, upgBase: 950, desc: 'Hold jump to fly. Gas fires the rear thrusters',
      electric: true, wheelStyle: 'aero', noDriver: true,
      mass: 7.4, inertia: 6.4, torque: 36, maxSpeed: 40, k: 540, c: 38, grip: 1.32, tank: 54, air: 7,
      wheels: [{ x: -1.25, y: -0.3, r: 0.32 }, { x: 1.44, y: -0.3, r: 0.32 }],
      hull: [[-1.98, -0.05], [-1.25, -0.46], [0.15, -0.16], [1.44, -0.46], [2.16, 0.06], [0.4, 0.38], [-0.25, 0.5], [-1.4, 0.38], [-1.98, 0.28]],
      head: { x: -0.15, y: 0.3, r: 0.1 }, seat: { x: -0.2, y: 0.08 }, hand: { x: 0.15, y: 0.2 },
      exhaust: null, color: '#e7eaee', rim: '#c5ccd3' },
    { id: 'cybertruck', name: 'Cybertruck', price: 0, upgBase: 700, desc: 'Stainless wedge, quiet and strong',
      electric: true,
      mass: 14, inertia: 16, torque: 38, maxSpeed: 24, k: 480, c: 36, grip: 1.15, tank: 40, air: 4,
      wheels: [{ x: -1.2, y: -0.55, r: 0.55, m: 1.1 }, { x: 1.25, y: -0.55, r: 0.55, m: 1.1 }],
      hull: [[-1.9, -0.06], [1.8, -0.08], [1.95, 0.16], [1.2, 0.46], [0.2, 1.0], [-0.75, 0.74], [-1.72, 0.52], [-1.95, 0.12]],
      head: { x: 0.35, y: 0.72, r: 0.3 }, seat: { x: 0.15, y: 0.28 }, hand: { x: 0.85, y: 0.42 },
      exhaust: null, color: '#c5c9ce', rim: '#2a2e34' },
    { id: 'unbreakable', name: 'Air Unbreakable', price: 150000, upgBase: 800, desc: 'Cannot crash or run dry. Super fast. Cold-air belly boosters. Buy to unlock all Unbreakables',
      immortal: true, electric: true,
      mass: 9, inertia: 8, torque: 96, maxSpeed: 80, k: 560, c: 40, grip: 1.45, tank: 99, air: 10,
      wheels: [{ x: -1.2, y: -0.4, r: 0.4 }, { x: 1.25, y: -0.4, r: 0.4 }],
      hull: [[-1.55, -0.08], [1.6, -0.08], [1.55, 0.38], [0.2, 0.58], [-0.85, 0.58], [-1.5, 0.36]],
      head: { x: -0.22, y: 0.52, r: 0.22 }, seat: { x: -0.3, y: 0.14 }, hand: { x: 0.28, y: 0.34 },
      exhaust: { x: -1.6, y: 0.08 }, color: '#2a3038', rim: '#c9a227',
      rockets: [-0.85, 0.9], boosters: [-0.3, 0.15, 0.6], boosterY: -0.3 },
    { id: 'unbreakableLava', name: 'Lava Unbreakable', price: 150000, upgBase: 800, desc: 'Cannot crash or run dry. Super fast. Molten lava rocket thrusters',
      immortal: true, lava: true,
      mass: 9, inertia: 8, torque: 96, maxSpeed: 80, k: 560, c: 40, grip: 1.45, tank: 99, air: 10,
      wheels: [{ x: -1.2, y: -0.4, r: 0.4 }, { x: 1.25, y: -0.4, r: 0.4 }],
      hull: [[-1.55, -0.08], [1.6, -0.08], [1.55, 0.38], [0.2, 0.58], [-0.85, 0.58], [-1.5, 0.36]],
      head: { x: -0.22, y: 0.52, r: 0.22 }, seat: { x: -0.3, y: 0.14 }, hand: { x: 0.28, y: 0.34 },
      exhaust: { x: -1.6, y: 0.08 }, color: '#2a1410', rim: '#ff6a28',
      rockets: [-0.85, 0.9], boosters: [-0.3, 0.15, 0.6], boosterY: -0.32 },
    { id: 'unbreakableWater', name: 'Water Unbreakable', price: 150000, upgBase: 800, desc: 'Cannot crash or run dry. Super fast. High-pressure water rocket thrusters',
      immortal: true, water: true,
      mass: 9, inertia: 8, torque: 96, maxSpeed: 80, k: 560, c: 40, grip: 1.45, tank: 99, air: 10,
      wheels: [{ x: -1.2, y: -0.4, r: 0.4 }, { x: 1.25, y: -0.4, r: 0.4 }],
      hull: [[-1.55, -0.08], [1.6, -0.08], [1.55, 0.38], [0.2, 0.58], [-0.85, 0.58], [-1.5, 0.36]],
      head: { x: -0.22, y: 0.52, r: 0.22 }, seat: { x: -0.3, y: 0.14 }, hand: { x: 0.28, y: 0.34 },
      exhaust: { x: -1.6, y: 0.08 }, color: '#0a3d5c', rim: '#5ee0ff',
      rockets: [-0.85, 0.9], boosters: [-0.3, 0.15, 0.6], boosterY: -0.32 },
    { id: 'unbreakableLightning', name: 'Lightning Unbreakable', price: 150000, upgBase: 800, desc: 'Cannot crash or run dry. Super fast. Electric arc thrusters',
      immortal: true, lightning: true,
      mass: 9, inertia: 8, torque: 96, maxSpeed: 80, k: 560, c: 40, grip: 1.45, tank: 99, air: 10,
      wheels: [{ x: -1.2, y: -0.4, r: 0.4 }, { x: 1.25, y: -0.4, r: 0.4 }],
      hull: [[-1.55, -0.08], [1.6, -0.08], [1.55, 0.38], [0.2, 0.58], [-0.85, 0.58], [-1.5, 0.36]],
      head: { x: -0.22, y: 0.52, r: 0.22 }, seat: { x: -0.3, y: 0.14 }, hand: { x: 0.28, y: 0.34 },
      exhaust: { x: -1.6, y: 0.08 }, color: '#1a1030', rim: '#f0e878',
      rockets: [-0.85, 0.9], boosters: [-0.3, 0.15, 0.6], boosterY: -0.32 },
    { id: 'unbreakableGhost', name: 'Ghost Unbreakable', price: 150000, upgBase: 800, desc: 'Cannot crash or run dry. Floats silently. ↓ to vanish',
      immortal: true, ghost: true,
      mass: 9, inertia: 8, torque: 96, maxSpeed: 80, k: 560, c: 40, grip: 1.45, tank: 99, air: 10,
      wheels: [{ x: -1.2, y: -0.4, r: 0.4 }, { x: 1.25, y: -0.4, r: 0.4 }],
      hull: [[-1.55, -0.08], [1.6, -0.08], [1.55, 0.38], [0.2, 0.58], [-0.85, 0.58], [-1.5, 0.36]],
      head: { x: -0.22, y: 0.52, r: 0.22 }, seat: { x: -0.3, y: 0.14 }, hand: { x: 0.28, y: 0.34 },
      exhaust: null, color: '#f2f4f7', rim: '#e0e4ea' },
  ];

  const UPGRADES = [
    { id: 'engine', name: 'Engine', desc: '+8 mph top speed per level (max 55 mph), more torque' },
    { id: 'suspension', name: 'Suspension', desc: 'Stiffer, more stable springs' },
    { id: 'tires', name: 'Tires', desc: 'More grip on steep hills' },
    { id: 'fuel', name: 'Fuel Tank', desc: 'Drive longer between cans' },
    { id: 'stability', name: 'Stability', desc: 'Stays upright on hills, gas, and landings' },
    { id: 'awd', name: '4WD', desc: 'Sends power to the free wheels' },
    { id: 'brakes', name: 'Brakes', desc: 'Stop shorter before a drop' },
    { id: 'air', name: 'Air Control', desc: 'Rotate more while you are in the air' },
    { id: 'tiresize', name: 'Bigger Tires', desc: 'Taller wheels that roll over bumps' },
  ];
  const MAX_LVL = 10;
  const UNBREAKABLE_PRICE = 150000;
  const UNBREAKABLE_IDS = ['unbreakable', 'unbreakableLava', 'unbreakableWater', 'unbreakableLightning', 'unbreakableGhost'];
  const UNBREAKABLE_MENU_ANCHOR = 'unbreakable';

  function ownsUnbreakableSet() {
    return !!save.vehicles[UNBREAKABLE_MENU_ANCHOR] || UNBREAKABLE_IDS.some((id) => save.vehicles[id]);
  }
  function unlockUnbreakablePurchase() {
    for (const id of UNBREAKABLE_IDS) save.vehicles[id] = true;
  }
  function isImmortal(def) { return !!(def && def.immortal); }
  function isUnbreakable(def) { return def && UNBREAKABLE_IDS.includes(def.id); }
  function isLavaJet(def) { return !!(def && def.lava); }
  function isWaterJet(def) { return !!(def && def.water); }
  function isLightningJet(def) { return !!(def && def.lightning); }
  function isGhostUnbreakable(def) { return !!(def && def.ghost); }
  function unbreakableJetMode(def) {
    if (isGhostUnbreakable(def)) return 'ghost';
    if (isLavaJet(def)) return 'lava';
    if (isWaterJet(def)) return 'water';
    if (isLightningJet(def)) return 'lightning';
    return 'air';
  }
  function isHiddenUnbreakableMenu(v) {
    return v && UNBREAKABLE_IDS.includes(v.id) && v.id !== UNBREAKABLE_MENU_ANCHOR;
  }
  function menuVehicleList() { return VEHICLES.filter((v) => !isHiddenUnbreakableMenu(v)); }
  function vehicleById(id) { return VEHICLES.find((v) => v.id === id); }
  function activeUnbreakableId() {
    const id = save.unbreakableVariant;
    if (UNBREAKABLE_IDS.includes(id)) return id;
    if (UNBREAKABLE_IDS.includes(save.veh)) return save.veh;
    return UNBREAKABLE_MENU_ANCHOR;
  }
  function resolvedDef(baseDef) {
    if (!baseDef) return baseDef;
    if (baseDef.id === UNBREAKABLE_MENU_ANCHOR || isHiddenUnbreakableMenu(baseDef)) {
      return vehicleById(activeUnbreakableId()) || baseDef;
    }
    return baseDef;
  }
  function isJetCar(def) {
    return def && (def.id === 'rocket' || def.id === 'roadster' || isUnbreakable(def));
  }
  function swapUnbreakableInWorld(id) {
    if (!world || !isUnbreakable(world.def)) return;
    const def = vehicleById(id);
    if (!def) return;
    world.defBase = def;
    world.def = Object.assign({ shape: world.def.shape || 'low' }, def);
    world.car = buildCar(def, upgOf(UNBREAKABLE_MENU_ANCHOR));
  }
  function cycleUnbreakableVariant() {
    if (!ownsUnbreakableSet()) return;
    const cur = activeUnbreakableId();
    const i = UNBREAKABLE_IDS.indexOf(cur);
    const next = UNBREAKABLE_IDS[(i + 1) % UNBREAKABLE_IDS.length];
    save.unbreakableVariant = next;
    save.veh = next;
    persist();
    const def = vehicleById(next);
    if ((state === 'play' || state === 'pause') && world && isUnbreakable(world.def)) {
      swapUnbreakableInWorld(next);
      if (def) floater(def.name, W / 2, H * 0.3, 'bonus');
    } else if (state === 'menu' && selDef().id === UNBREAKABLE_MENU_ANCHOR) {
      newWorld(resolvedDef(selDef()), selStage());
      refreshMenu();
    }
  }
  const isDarkStage = (st) => !!(st && (!st.sun || (st.dark || 0) > 0.15));

  // ================= SAVE =================
  const SAVE_KEY = 'brennans-hill-rush-v2';
  try { localStorage.removeItem('brennans-hill-rush-v1'); } catch (e) { /* ignore */ }
  function defaultSave() {
    return { coins: 0, vehicles: { jeep: true }, stages: { countryside: true }, upgrades: {}, best: {}, veh: 'jeep', stage: 'countryside', ghost: {}, goals: {}, paint: {} };
  }
  function loadSave() {
    try {
      const s = JSON.parse(localStorage.getItem(SAVE_KEY));
      if (s) return Object.assign(defaultSave(), s);
    } catch (e) { /* ignore */ }
    return defaultSave();
  }
  let save = loadSave();
  if (!VEHICLES.some((v) => v.id === save.veh)) save.veh = 'jeep';
  if (!STAGES.some((s) => s.id === save.stage)) save.stage = 'countryside';
  function persist() {
    if (catalogMode) return;
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); }
    catch (e) {
      save.ghost = {};
      try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e2) { /* ignore */ }
    }
  }
  if (!save.purchaseFix) {
    const ownsAllVeh = VEHICLES.every((v) => save.vehicles[v.id]);
    const ownsAllStage = STAGES.every((s) => save.stages[s.id]);
    if (ownsAllVeh && ownsAllStage) {
      save.vehicles = { jeep: true };
      save.stages = { countryside: true };
    }
    save.purchaseFix = true;
    persist();
  }
  if (!save.vehicles.cybertruck) {
    save.vehicles.cybertruck = true;
    save.veh = 'cybertruck';
    persist();
  }
  {
    const rocketUpgKeys = ['engine', 'suspension', 'tires', 'fuel', 'stability', 'awd', 'brakes', 'air', 'tiresize'];
    if (!save.upgrades) save.upgrades = {};
    const rk = save.upgrades.rocket || (save.upgrades.rocket = {});
    let rocketUpgChanged = false;
    for (const k of rocketUpgKeys) {
      if (rk[k] !== MAX_LVL) {
        rk[k] = MAX_LVL;
        rocketUpgChanged = true;
      }
    }
    if (rocketUpgChanged) persist();
  }
  function migrateBest() {
    const veh = VEHICLES.some((v) => v.id === save.veh) ? save.veh : 'jeep';
    let changed = false;
    for (const sid of Object.keys(save.best)) {
      const v = save.best[sid];
      if (typeof v === 'number') {
        save.best[sid] = v > 0 ? { [veh]: v } : {};
        changed = true;
      }
    }
    if (changed) persist();
  }
  migrateBest();
  function bestOf(sid, vid) {
    const b = save.best[sid];
    if (!b || typeof b === 'number') return 0;
    return b[vid] || 0;
  }
  function upgOf(vid) {
    const u = save.upgrades[vid] || (save.upgrades[vid] = {});
    if (u.engine == null) u.engine = 0;
    if (u.suspension == null) u.suspension = 0;
    if (u.tires == null) u.tires = 0;
    if (u.fuel == null) u.fuel = 0;
    if (u.stability == null) u.stability = 0;
    if (u.awd == null) u.awd = 0;
    if (u.brakes == null) u.brakes = 0;
    if (u.air == null) u.air = 0;
    if (u.tiresize == null) u.tiresize = 0;
    return u;
  }
  function upgCost(def, lvl) { return Math.round((def.upgBase * Math.pow(1.5, lvl)) / 50) * 50; }

  // ================= TERRAIN =================
  const STEP = 0.5, CHUNK = 64;
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function hash(seed, i) {
    const s = Math.sin(i * 127.1 + seed * 311.7) * 43758.5453;
    return (s - Math.floor(s)) * 2 - 1;
  }
  function noise(seed, x) {
    const i = Math.floor(x), f = x - i;
    const a = hash(seed, i), b = hash(seed, i + 1);
    const t = (1 - Math.cos(f * Math.PI)) / 2;
    return a + (b - a) * t;
  }
  function makeTerrain(stage) {
    return {
      stage, seed: stage.seed, chunks: new Map(), pickups: [], genUpTo: 0, nextFuel: 150, nextArc: 0,
      shortcutSpans: new Map(), rng: mulberry32(stage.seed * 7 + 1),
      rngX: mulberry32(stage.seed * 13 + 9),
      props: [], rescues: [], rollers: [],
      nextProp: 40, nextNitro: 200, nextRescue: 80, nextRoller: 120,
    };
  }
  function hillHeight(T, x) {
    if (x < 0) return 0;
    const retro = T.stage.id === 'retro';
    const r = clamp((x - (retro ? -6 : 15)) / (retro ? 18 : 60), 0, 1);
    const ramp = r * r * (3 - 2 * r);
    const diff = 0.6 + Math.min(1, x / 2000);
    const oct = T.stage.oct;
    let h = 0;
    for (let k = 0; k < oct.length; k++) h += noise(T.seed + k * 17, x / oct[k][1]) * oct[k][0];
    return h * ramp * diff + rampBump(T, x);
  }
  function solidHeight(T, x) {
    const h = hillHeight(T, x);
    const span = marsShortcutLookup(T, x, 0);
    if (!span || span.roofOnly) return h;
    let lifted = span.lipH;
    if (x > span.flatUntil) {
      const spanRun = span.end - span.flatUntil;
      const u = spanRun > 0.001 ? clamp((x - span.flatUntil) / spanRun, 0, 1) : 1;
      const eased = u * u * (3 - 2 * u);
      lifted = span.lipH + (span.endH - span.lipH) * eased;
    }
    return h > lifted ? h : lifted;
  }
  function quantizeHeight(st, h) {
    if (!st.quant) return h;
    return Math.round(h / st.quant) * st.quant;
  }
  function genHeight(T, x) { return quantizeHeight(T.stage, solidHeight(T, x) - gapCut(T, x)); }
  function rideHeight(T, x) { return gapContaining(T, x) ? solidHeight(T, x) : hAt(T, x); }
  const RAMP_GAP = 220, RAMP_LEN = 6, GAP_DROP = 40, GAP_WATER_DEPTH = 7.2, LAVA_DIP = 8;
  const MARS_SHORTCUT_HEADROOM = 9, MARS_SHORTCUT_RELEASE = 14;
  function rampInfo(T, x) {
    const s = Math.floor(x / RAMP_GAP);
    const start = s * RAMP_GAP + 80 + (hash(T.seed + 3, s) * 0.5 + 0.5) * 60;
    const mul = T.stage.rampMul || 1;
    return { start, height: (2.4 + Math.min(1.8, start / 1500)) * 0.85 * mul, index: s };
  }
  function rampBump(T, x) {
    if (x < 0) return 0;
    const r = rampInfo(T, x), d = x - r.start;
    if (d < 0) return 0;
    if (d <= RAMP_LEN) { const u = d / RAMP_LEN; return r.height * u * u; }
    if (d <= RAMP_LEN + 0.6) return r.height * (1 - (d - RAMP_LEN) / 0.6);
    return 0;
  }
  function gapForRamp(T, s) {
    if (s < 0) return null;
    if (T.stage.id === 'moon') {
      if (hash(T.seed + 41, s) < -0.55) return null;
      const r = rampInfo(T, s * RAMP_GAP + 1);
      if (r.start < 90) return null;
      const t = hash(T.seed + 43, s) * 0.5 + 0.5;
      const start = r.start + RAMP_LEN + 1;
      return { start, end: start + 18 + t * 12, index: s };
    }
    if (s < 1) return null;
    const r = rampInfo(T, s * RAMP_GAP + 1);
    if (r.start < 250) return null;
    if (hash(T.seed + 41, s) < 0) return null;
    const t = hash(T.seed + 43, s) * 0.5 + 0.5;
    const grow = Math.min(1, r.start / 2200);
    const width = (10 + t * 2.5 + grow * 1.5) * (T.stage.gapMul || 1);
    const start = r.start + RAMP_LEN + 1;
    return { start, end: start + width, index: s };
  }
  function gapContaining(T, x) {
    if (x < 70) return null;
    if (x < 250 && T.stage.id !== 'moon') return null;
    const s = Math.floor(x / RAMP_GAP);
    const g = gapForRamp(T, s);
    if (!g || x < g.start || x > g.end) return null;
    return g;
  }
  function gapNearby(T, x) {
    for (let s = Math.floor(x / RAMP_GAP) - 1; s <= Math.floor(x / RAMP_GAP) + 1; s++) {
      const g = gapForRamp(T, s);
      if (g && x > g.start - 24 && x < g.end + 6) return g;
    }
    return null;
  }
  function lavaSurface(T, gap, x) {
    const yL = solidHeight(T, gap.start);
    const yR = solidHeight(T, gap.end);
    const span = gap.end - gap.start;
    const u = span > 0 ? clamp((x - gap.start) / span, 0, 1) : 0;
    return yL + (yR - yL) * u - LAVA_DIP;
  }
  function gapWaterSurface(T, gap, x) {
    const yL = solidHeight(T, gap.start);
    const yR = solidHeight(T, gap.end);
    const span = gap.end - gap.start;
    const u = span > 0 ? clamp((x - gap.start) / span, 0, 1) : 0;
    return yL + (yR - yL) * u;
  }
  function gapSinkSurface(T, st, gap, x) {
    if (st.lava) return lavaSurface(T, gap, x);
    return gapWaterSurface(T, gap, x);
  }
  function tryStartGapSink(w) {
    if (isImmortal(w.def)) return false;
    const g = gapContaining(w.T, w.body.x);
    if (!g) return false;
    const T = w.T, st = w.stage, b = w.body;
    if (b.y < gapSinkSurface(T, st, g, b.x) - 0.35) return true;
    if (b.y < solidHeight(T, b.x) - 0.9) return true;
    return false;
  }
  function gapSinkOutcome(st) {
    if (st.lava) return { title: 'Lava!', text: 'Brennan went under the lava.' };
    switch (st.id) {
      case 'countryside': return { title: 'Splash!', text: 'Brennan sank in the pond.' };
      case 'skottland': return { title: 'Splash!', text: 'Brennan went in the water.' };
      case 'london': return { title: 'Splash!', text: 'Brennan fell in the river.' };
      case 'china': return { title: 'Splash!', text: 'Brennan sank in the stream.' };
      default: return { title: 'Boom!', text: 'Brennan blew up in the canyon.' };
    }
  }
  function gapSinkBubbleColor(st) {
    if (st.lava) return '255,210,90';
    if (st.id === 'london') return '195,210,225';
    if (st.id === 'china') return '195,230,205';
    if (st.id === 'skottland') return '185,225,245';
    if (st.id === 'countryside') return '180,220,255';
    return '215,220,228';
  }
  function gapFloorAt(T, gap, x) {
    return gapWaterSurface(T, gap, x) - GAP_WATER_DEPTH;
  }
  function carLowestY(w) {
    let low = Infinity;
    const b = w.body, def = w.def;
    const cos = Math.cos(b.a), sin = Math.sin(b.a);
    for (const wh of w.wheels) low = Math.min(low, wh.y - wh.r);
    for (const p of def.hull) low = Math.min(low, b.y + p[0] * sin + p[1] * cos);
    low = Math.min(low, b.y + def.head.x * sin + (def.head.y - def.head.r * 0.5) * cos);
    return low;
  }
  function drawGapFloorBed(g, yL, yR, tint) {
    const topL = yL - GAP_WATER_DEPTH, topR = yR - GAP_WATER_DEPTH;
    const botL = yL - GAP_DROP, botR = yR - GAP_DROP;
    const bed = tint || 'rgba(28,48,42,0.92)';
    ctx.fillStyle = bed;
    ctx.beginPath();
    ctx.moveTo(g.start, topL);
    ctx.lineTo(g.end, topR);
    ctx.lineTo(g.end, botR);
    ctx.lineTo(g.start, botL);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.16)';
    ctx.beginPath();
    ctx.moveTo(g.start, topL);
    ctx.lineTo(g.end, topR);
    ctx.lineTo(g.end, topR - 0.28);
    ctx.lineTo(g.start, topL - 0.28);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(236,248,240,0.8)';
    ctx.lineWidth = 0.1;
    ctx.beginPath();
    ctx.moveTo(g.start, topL);
    ctx.lineTo(g.end, topR);
    ctx.stroke();
  }
  function pushBoomPart(w, x, y, vx, vy, life, r, c, kind) {
    w.particles.push({ x, y, vx, vy, life, max: life, r, c, kind: kind || 'boom' });
  }
  function sinkGapRef(w) {
    if (w.sinkGap) return w.sinkGap;
    const g = gapContaining(w.T, w.body.x);
    if (!g) return null;
    w.sinkGap = { start: g.start, end: g.end };
    return w.sinkGap;
  }
  function snapCarToGapBed(w, bed) {
    const low = carLowestY(w);
    const dy = bed - low;
    if (Math.abs(dy) > 0.001) {
      w.body.y += dy;
      for (const wh of w.wheels) wh.y += dy;
    }
    w.body.vy = 0;
    for (const wh of w.wheels) wh.vy = 0;
  }
  function keepCarInSinkGap(w) {
    const gRef = sinkGapRef(w);
    if (!gRef) return;
    const pad = 0.55;
    const minX = gRef.start + pad, maxX = gRef.end - pad;
    const b = w.body;
    if (maxX <= minX) return;
    if (b.x < minX) { b.x = minX; if (b.vx < 0) b.vx = 0; }
    else if (b.x > maxX) { b.x = maxX; if (b.vx > 0) b.vx = 0; }
  }
  function gapBedFloor(w) {
    const gRef = sinkGapRef(w);
    if (!gRef) return null;
    const gap = { start: gRef.start, end: gRef.end };
    const x = clamp(w.body.x, gap.start, gap.end);
    return gapFloorAt(w.T, gap, x);
  }
  function beginGapBed(w, floor) {
    const margin = 0.12;
    const wasBed = w.sinkOnBed;
    w.sinkOnBed = true;
    if (!wasBed) {
      w.sinkBedTime = 0;
      w.sinkBedWarned = false;
    }
    w.sinkFloorY = floor + margin;
    snapCarToGapBed(w, w.sinkFloorY);
    w.body.vx *= 0.35;
    w.body.va *= 0.5;
    for (const wh of w.wheels) { wh.vx *= 0.35; wh.w *= 0.4; }
    if (!wasBed && !w.sinkLanded) {
      w.sinkLanded = true;
      sfxSinkThud();
      const st = w.stage;
      const hit = st.lava ? 'Hit the lava floor!' : st.id === 'countryside' ? 'Mud bottom!' : 'Hit bottom!';
      floater(hit, W / 2, H * 0.34, 'bad');
    }
  }
  function resolveGapFloor(w, playing) {
    if (!w.sinking && !w.sinkBoom) return;
    const b = w.body;
    const margin = 0.12;
    if (w.sinkBoom) {
      if (w.sinkFloorY != null) snapCarToGapBed(w, w.sinkFloorY);
      b.vx = 0;
      b.va = 0;
      for (const wh of w.wheels) { wh.vx = 0; wh.w = 0; }
      return;
    }
    if (!w.sinkOnBed) keepCarInSinkGap(w);
    const gRef = sinkGapRef(w);
    if (!gRef) return;
    const gap = { start: gRef.start, end: gRef.end };
    const x = clamp(b.x, gap.start, gap.end);
    const floor = gapFloorAt(w.T, gap, x);
    const low = carLowestY(w);
    const bed = w.sinkFloorY != null ? w.sinkFloorY : floor + margin;
    const hitBed = w.sinkOnBed || low <= bed + 0.2;
    if (hitBed) {
      if (!w.sinkOnBed) beginGapBed(w, floor);
      else snapCarToGapBed(w, bed);
      if (b.vy < 0) b.vy = 0;
      for (const wh of w.wheels) if (wh.vy < 0) wh.vy = 0;
      b.vx *= 0.82;
      b.va *= 0.9;
      for (const wh of w.wheels) wh.vx *= 0.82;
      return;
    }
  }
  function forceGapBedIfStuck(w) {
    if (!w.sinking || w.sinkOnBed || w.sinkBoom || w.sinkTime < 1.6) return;
    const floor = gapBedFloor(w);
    if (floor == null) return;
    const bed = floor + 0.12;
    const low = carLowestY(w);
    if (low <= bed + 0.2) { beginGapBed(w, floor); return; }
    const drop = Math.min(0.45, (low - bed) * 0.45);
    w.body.y -= drop;
    w.body.vy = Math.min(w.body.vy, -6);
    for (const wh of w.wheels) wh.y -= drop;
  }
  function spawnCarChunks(w, bx, by) {
    const def = w.def;
    const fills = [def.color || '#c0392b', def.rim || '#222', def.color || '#c0392b', '#2a2a2a', def.rim || '#444'];
    const pieces = [
      { rw: 0.62, rh: 0.22 },
      { rw: 0.38, rh: 0.18 },
      { rw: 0.28, rh: 0.28 },
      { rw: 0.48, rh: 0.14 },
      { rw: 0.22, rh: 0.16 },
      { rw: 0.34, rh: 0.2 },
    ];
    for (let i = 0; i < pieces.length; i++) {
      const a = (i / pieces.length) * TAU + Math.random() * 0.4;
      const sp = 5 + Math.random() * 8;
      const life = 1.7 + Math.random() * 0.55;
      w.particles.push({
        x: bx + (Math.random() - 0.5) * 0.8,
        y: by + (Math.random() - 0.5) * 0.3,
        vx: Math.cos(a) * sp,
        vy: 4 + Math.random() * 6,
        life, max: life,
        r: pieces[i].rw,
        rw: pieces[i].rw,
        rh: pieces[i].rh,
        rot: Math.random() * TAU,
        vr: (Math.random() - 0.5) * 9,
        fill: fills[i % fills.length],
        c: '255,255,255',
        kind: 'debris',
      });
    }
    for (const wh of w.wheels) {
      const life = 1.65 + Math.random() * 0.5;
      const a = Math.random() * TAU;
      const sp = 4 + Math.random() * 7;
      w.particles.push({
        x: wh.x, y: wh.y,
        vx: Math.cos(a) * sp,
        vy: 5 + Math.random() * 5,
        life, max: life,
        r: wh.r,
        rot: wh.ang || 0,
        vr: (Math.random() - 0.5) * 12,
        fill: def.rim || '#333',
        c: '40,40,40',
        kind: 'debris',
        wheel: true,
      });
    }
  }
  function gapSinkBottomExplode(w) {
    if (isImmortal(w.def)) return;
    if (w.sinkBoom) return;
    const floor = gapBedFloor(w);
    if (floor != null) w.sinkFloorY = floor + 0.12;
    w.sinkBoom = true;
    w.sinkTime = 0;
    const b = w.body;
    b.vx = 0;
    b.vy = 0;
    b.va = 0;
    for (const wh of w.wheels) { wh.vx = 0; wh.vy = 0; wh.w = 0; }
    resolveGapFloor(w, true);
    sfxBoom();
    const out = gapSinkOutcome(w.stage);
    floater(out.title, W / 2, H * 0.38, 'bad');
    const lava = w.stage.lava;
    const bx = b.x, by = b.y;
    const fire = lava
      ? ['255,230,120', '255,160,30', '255,90,10', '255,250,200']
      : ['255,244,210', '255,150,40', '255,70,16', '255,210,90'];
    const smoke = lava
      ? ['90,40,16', '120,55,20', '70,32,18', '150,70,30']
      : ['40,42,46', '62,64,68', '28,30,34', '80,82,86'];
    for (let i = 0; i < 28; i++) {
      const a = Math.random() * TAU;
      const sp = 2 + Math.random() * 7;
      const life = 0.22 + Math.random() * 0.2;
      pushBoomPart(w, bx, by, Math.cos(a) * sp, Math.sin(a) * sp * 0.35 + 2,
        life, 0.55 + Math.random() * 0.85, '255,255,245', 'boomCore');
    }
    pushBoomPart(w, bx, by, 0, 1.2, 0.72, 0.35, '255,255,255', 'shock');
    pushBoomPart(w, bx, by, 0, 0.4, 0.95, 0.2, lava ? '255,220,120' : '255,180,60', 'shock');
    for (let i = 0; i < 78; i++) {
      const a = Math.random() * TAU;
      const sp = 3 + Math.random() * 12;
      const life = 0.55 + Math.random() * 0.7;
      pushBoomPart(w, bx + (Math.random() - 0.5) * 1.4, by + (Math.random() - 0.5) * 0.5,
        Math.cos(a) * sp, Math.sin(a) * sp * 0.45 + 3 + Math.random() * 4,
        life, 0.28 + Math.random() * 0.55, fire[(Math.random() * fire.length) | 0], 'boom');
    }
    for (let i = 0; i < 42; i++) {
      const a = Math.random() * TAU;
      const sp = 1.2 + Math.random() * 5;
      const life = 1.5 + Math.random() * 0.85;
      pushBoomPart(w, bx + (Math.random() - 0.5) * 1.6, by,
        Math.cos(a) * sp, 1.5 + Math.random() * 3.5,
        life, 0.45 + Math.random() * 0.7, smoke[(Math.random() * smoke.length) | 0], 'smoke');
    }
    for (let i = 0; i < 36; i++) {
      const a = Math.random() * TAU;
      const sp = 8 + Math.random() * 16;
      pushBoomPart(w, bx, by, Math.cos(a) * sp, Math.sin(a) * sp * 0.4 + 2,
        0.35 + Math.random() * 0.4, 0.06 + Math.random() * 0.1,
        lava ? '255,255,210' : '255,255,230', 'spark');
    }
    spawnCarChunks(w, bx, by);
    if (lava) {
      const globs = ['255,220,60', '255,140,20', '255,255,210', '255,80,10'];
      for (let i = 0; i < 26; i++) {
        const a = Math.random() * TAU;
        const sp = 3 + Math.random() * 10;
        const life = 1.15 + Math.random() * 0.7;
        pushBoomPart(w, bx, by, Math.cos(a) * sp, 3 + Math.random() * 8,
          life, 0.18 + Math.random() * 0.38, globs[(Math.random() * globs.length) | 0], 'glob');
      }
    } else spawnBlood(bx, by, 10, 1.15);
    w.carBroken = true;
    trimDust(w);
  }
  function drawSkottlandGroundMist(T, cam) {
    const hw = W / 2 / cam.s + 3;
    const x0 = cam.x - hw, x1 = cam.x + hw;
    const t = performance.now() / 1000;
    const dx = 0.7;
    const topPts = [];
    for (let x = x0; x <= x1; x += dx) {
      if (gapContaining(T, x)) continue;
      const y = hAt(T, x);
      const wob = Math.sin(x * 0.36 + t * 0.52) * 0.07 + Math.sin(x * 0.09 - t * 0.28) * 0.05;
      topPts.push({ x, y: y + 0.04 + wob });
    }
    ctx.save();
    if (topPts.length >= 2) {
      ctx.beginPath();
      ctx.moveTo(topPts[0].x, topPts[0].y);
      for (let i = 1; i < topPts.length; i++) ctx.lineTo(topPts[i].x, topPts[i].y);
      for (let i = topPts.length - 1; i >= 0; i--) {
        const thick = 0.38 + Math.sin(topPts[i].x * 0.13 + t * 0.38) * 0.14;
        ctx.lineTo(topPts[i].x, topPts[i].y + thick);
      }
      ctx.closePath();
      let yBase = Infinity, yTop = -Infinity;
      for (const p of topPts) {
        yBase = Math.min(yBase, p.y);
        yTop = Math.max(yTop, p.y + 0.55);
      }
      const sheet = ctx.createLinearGradient(0, yBase, 0, yTop);
      sheet.addColorStop(0, 'rgba(228,244,234,0.52)');
      sheet.addColorStop(0.5, 'rgba(208,228,212,0.24)');
      sheet.addColorStop(1, 'rgba(208,228,212,0)');
      ctx.fillStyle = sheet;
      ctx.fill();
    }
    ctx.restore();
  }
  function carWorldPoints(w) {
    const b = w.body, def = w.def;
    const cos = Math.cos(b.a), sin = Math.sin(b.a);
    const pts = [];
    const add = (lx, ly) => pts.push({
      x: b.x + lx * cos - ly * sin,
      y: b.y + lx * sin + ly * cos,
    });
    for (const p of def.hull) add(p[0], p[1]);
    add(def.head.x, def.head.y + def.head.r);
    for (const wh of w.wheels) {
      pts.push({ x: wh.x, y: wh.y + wh.r });
      pts.push({ x: wh.x, y: wh.y - wh.r });
    }
    return pts;
  }
  function underLava(w) {
    const T = w.T;
    const pts = carWorldPoints(w);
    if (!pts.length) return false;
    for (const p of pts) {
      const g = gapContaining(T, p.x);
      if (!g || p.y >= lavaSurface(T, g, p.x)) return false;
    }
    return true;
  }
  function gapCut(T, x) {
    const g = gapContaining(T, x);
    if (!g) return 0;
    const edge = Math.min(x - g.start, g.end - x);
    const lip = 0.45;
    if (edge >= lip) return GAP_DROP;
    const u = Math.max(0, edge / lip);
    return GAP_DROP * u * u;
  }
  function clearGap(T, x) {
    for (let n = 0; n < 4; n++) {
      const g = gapContaining(T, x);
      if (!g) return x;
      x = g.end + 2;
    }
    return x;
  }
  function safeSpot(T, x) {
    let sx = clearGap(T, Math.max(0, x));
    for (let n = 0; n < 6; n++) {
      const ramp = rampInfo(T, sx);
      const onRamp = sx >= ramp.start - 1 && sx <= ramp.start + RAMP_LEN + 1.5;
      const ceil = ceilingAt(T, sx);
      const low = ceil != null && ceil - hAt(T, sx) < 2.5;
      const gap = gapContaining(T, sx) || gapContaining(T, sx - 2) || gapContaining(T, sx + 2);
      if (!onRamp && !low && !gap) return sx;
      sx = clearGap(T, sx + 6);
    }
    return null;
  }
  const SURFACE_GRIP = { ground: 1, sand: 0.85, ice: 0.2, tar: 1.25, mud: 0.35, slime: 0.45 };
  function patchInfo(T, ci) {
    const s = T.stage.surface;
    if (s !== 'patches-ice' && s !== 'patches-mud') return null;
    const cell = 88;
    if (hash(T.seed + 81, ci) < -0.05) return null;
    const len = 6 + (hash(T.seed + 82, ci) * 0.5 + 0.5) * 4;
    const start = ci * cell + 6 + (hash(T.seed + 83, ci) * 0.5 + 0.5) * Math.max(1, cell - len - 12);
    if (start < 50) return null;
    return { start, end: start + len, kind: s === 'patches-ice' ? 'ice' : 'mud' };
  }
  function surfaceAt(T, x) {
    if (x < 50 || rampBump(T, x) > 0.05 || gapContaining(T, x)) return 'ground';
    const st = T.stage;
    const s = st.surface || 'ground';
    if (s === 'patches-ice' || s === 'patches-mud') {
      const p = patchInfo(T, Math.floor(x / 88));
      if (p && x >= p.start && x <= p.end) return p.kind;
      return 'ground';
    }
    if (s === 'seasons') return ['ground', 'sand', 'mud', 'ice'][Math.floor(x / 380) % 4];
    if (s === 'mixed') {
      const h = hash(T.seed + 77, Math.floor(x / 36));
      if (h > 0.35) return 'tar';
      if (h > -0.15) return 'mud';
      return 'ground';
    }
    if (s === 'snowcap') return hillHeight(T, x) > 8 ? 'ice' : 'ground';
    return s;
  }
  function gripAt(T, x) { return SURFACE_GRIP[surfaceAt(T, x)] || 1; }
  function tunnelWallAt(T, x) {
    if (!T.stage.tunnel || x < 30) return false;
    return !(hash(T.seed + 91, Math.floor(x / 160)) > 0.2);
  }
  function buildMarsShortcut(T, s) {
    if (T.stage.id !== 'mars') return null;
    const g = gapForRamp(T, s);
    if (!g || !tunnelWallAt(T, g.end + 1)) return null;
    const ramp = rampInfo(T, s * RAMP_GAP + 1);
    const lipH = hillHeight(T, ramp.start + RAMP_LEN);
    const nextRamp = rampInfo(T, (s + 1) * RAMP_GAP + 1);
    const stop = Math.min(g.end + 140, nextRamp.start - 8);
    let endX = null;
    for (let x = g.end + 2; x <= stop; x += 2) {
      if (hillHeight(T, x) >= lipH) { endX = x; break; }
    }
    const sampleTo = endX == null ? Math.min(g.end + 40, stop) : endX;
    let low = lipH;
    for (let x = g.end + 2; x < sampleTo; x += 2) low = Math.min(low, hillHeight(T, x));
    const drop = lipH - low;
    if (endX != null && endX - g.end >= 8 && drop >= 1.5) {
      const tail = Math.min(12, (endX - g.end) * 0.35);
      return {
        start: g.end - 0.55, end: endX, lipH,
        endH: hillHeight(T, endX), flatUntil: endX - tail,
      };
    }
    if (endX == null && drop >= 2) {
      const land = Math.min(g.end + 36, stop - 16);
      let end = Math.min(land + 24, stop);
      for (let n = 0; n < 4; n++) {
        const dive = lipH - hillHeight(T, end);
        const run = clamp(Math.max(dive, 0) * 5, 18, 80);
        end = Math.min(land + run, stop);
      }
      if (end - g.end >= 12) {
        return {
          start: g.end - 0.55, end, lipH,
          endH: hillHeight(T, end), flatUntil: land,
        };
      }
    }
    const mouth = hillHeight(T, Math.min(g.end + 2, stop));
    if (mouth + T.stage.ceiling < lipH + 8.2) {
      const end = Math.min(g.end + 32, stop);
      return { start: g.end, end, lipH, endH: lipH, flatUntil: end, roofOnly: true };
    }
    return null;
  }
  function marsShortcutLookup(T, x, past) {
    if (!T.shortcutSpans || T.stage.id !== 'mars') return null;
    const s0 = Math.floor(x / RAMP_GAP);
    for (let s = s0 - 1; s <= s0; s++) {
      if (s < 1) continue;
      if (!T.shortcutSpans.has(s)) {
        T.shortcutSpans.set(s, null);
        T.shortcutSpans.set(s, buildMarsShortcut(T, s));
      }
      const span = T.shortcutSpans.get(s);
      if (span && x > span.start && x < span.end + past) return span;
    }
    return null;
  }
  function marsRoofClearance(T, x) {
    const span = marsShortcutLookup(T, x, MARS_SHORTCUT_RELEASE);
    if (!span || !tunnelWallAt(T, x)) return 0;
    let clear = MARS_SHORTCUT_HEADROOM;
    if (x > span.end) {
      const u = clamp((x - span.end) / MARS_SHORTCUT_RELEASE, 0, 1);
      const eased = u * u * (3 - 2 * u);
      clear = MARS_SHORTCUT_HEADROOM + (T.stage.ceiling - MARS_SHORTCUT_HEADROOM) * eased;
    }
    if (span.roofOnly && x <= span.end) {
      const need = span.lipH + MARS_SHORTCUT_HEADROOM - hillHeight(T, x);
      if (need > clear) clear = need;
    }
    return clear;
  }
  function ceilingAt(T, x) {
    const st = T.stage;
    if (!st.ceiling || x < 30 || gapContaining(T, x)) return null;
    if (st.tunnel && !tunnelWallAt(T, x)) return null;
    const raised = marsRoofClearance(T, x);
    return hAt(T, x) + (raised > 0 ? raised : st.ceiling);
  }
  function treeBlocking(T, x) {
    if (!T.stage.slowTrees) return false;
    const cell = T.stage.decor === 'jungle' ? 7 : 9;
    const ci = Math.floor(x / cell);
    for (let k = ci - 1; k <= ci + 1; k++) {
      if (k < 1) continue;
      const hv = hash(T.seed + 21, k);
      if (hv < (T.stage.decor === 'jungle' ? -0.25 : 0.02)) continue;
      const tx = k * cell + (hash(T.seed + 22, k) * 0.5 + 0.5) * (cell * 0.62);
      if (gapContaining(T, tx) || rampBump(T, tx) > 0.2) continue;
      if (Math.abs(x - tx) < 0.42) return true;
    }
    return false;
  }
  function hIdx(T, i) {
    if (i < 0) return genHeight(T, i * STEP);
    const ci = Math.floor(i / CHUNK);
    let ch = T.chunks.get(ci);
    if (!ch) {
      ch = new Float32Array(CHUNK);
      for (let j = 0; j < CHUNK; j++) ch[j] = genHeight(T, (ci * CHUNK + j) * STEP);
      T.chunks.set(ci, ch);
    }
    return ch[i - ci * CHUNK];
  }
  function hAt(T, x) {
    const i = Math.floor(x / STEP), t = x / STEP - i;
    const a = hIdx(T, i), b = hIdx(T, i + 1);
    return a + (b - a) * t;
  }
  function normalAt(T, x) {
    const s = (hAt(T, x + 0.1) - hAt(T, x - 0.1)) / 0.2;
    const l = Math.hypot(s, 1);
    return { x: -s / l, y: 1 / l };
  }
  function closest(T, px, py, r) {
    const i0 = Math.floor((px - r) / STEP) - 1, i1 = Math.floor((px + r) / STEP) + 1;
    let best = 1e9, nx = 0, ny = 1;
    for (let i = i0; i <= i1; i++) {
      const ax = i * STEP, ay = hIdx(T, i), ex = STEP, ey = hIdx(T, i + 1) - ay;
      let t = ((px - ax) * ex + (py - ay) * ey) / (ex * ex + ey * ey);
      t = t < 0 ? 0 : t > 1 ? 1 : t;
      const dx = px - (ax + ex * t), dy = py - (ay + ey * t);
      const d = Math.hypot(dx, dy);
      if (d < best) { best = d; if (d > 1e-6) { nx = dx / d; ny = dy / d; } }
    }
    if (py < hAt(T, px)) {
      const n = normalAt(T, px);
      return { dist: -best, nx: n.x, ny: n.y };
    }
    return { dist: best, nx, ny };
  }
  function coinTier(x) { return x > 1500 ? 100 : x > 500 ? 25 : 5; }
  function spawnArc(T, s) {
    const r = rampInfo(T, s * RAMP_GAP + 1);
    if (r.start < 40) return;
    const g = gapForRamp(T, s);
    const lipX = r.start + RAMP_LEN;
    const hop = 7 + (hash(T.seed + 47, s) * 0.5 + 0.5) * 3;
    const landX = g ? g.end + 1.5 : lipX + hop;
    const y0 = solidHeight(T, lipX) + 1.15;
    const y1 = solidHeight(T, landX) + 1.15;
    const peak = 2.5 + Math.min(2.5, lipX / 800);
    const v = coinTier(lipX);
    const n = 8;
    for (let k = 0; k < n; k++) {
      const u = (k + 0.5) / n;
      const x = lipX + (landX - lipX) * u;
      const y = y0 + (y1 - y0) * u + Math.sin(u * Math.PI) * peak;
      T.pickups.push({ type: 'coin', x, y, v, taken: false, arc: true });
    }
  }
  function nearbyGap(T, x) {
    const s0 = Math.floor(x / RAMP_GAP);
    let gap = null;
    for (let s = s0 - 1; s <= s0 + 1; s++) {
      const g = gapForRamp(T, s);
      if (!g || g.start < x - 20 || g.start > x + 80) continue;
      if (!gap || g.start < gap.start) gap = g;
    }
    return gap;
  }
  function apexFitsCeiling(T, gap, apex) {
    let ceil = null;
    for (const x of [gap.start - 0.8, gap.end + 0.8]) {
      const c = ceilingAt(T, x);
      if (c == null) continue;
      ceil = ceil == null ? c : Math.min(ceil, c);
    }
    return ceil == null || apex <= ceil - 0.8;
  }
  function fuelSpot(T, x) {
    if (x < 250) {
      const sx = clearGap(T, x);
      return { x: sx, y: hAt(T, sx) + 1.2, arc: false };
    }
    const gap = nearbyGap(T, x);
    if (gap && hash(T.seed + 59, gap.index) >= 0) {
      const mx = (gap.start + gap.end) / 2;
      const y0 = solidHeight(T, gap.start) + 1.15;
      const y1 = solidHeight(T, gap.end) + 1.15;
      const peak = 2.5 + Math.min(2.5, gap.start / 800);
      const apex = (y0 + y1) / 2 + peak;
      if (apexFitsCeiling(T, gap, apex)) return { x: mx, y: apex, arc: true };
      const sx = clearGap(T, gap.end + 2);
      return { x: sx, y: hAt(T, sx) + 1.2, arc: false };
    }
    const sx = clearGap(T, x);
    if (!gap && hash(T.seed + 61, Math.floor(sx)) > 1 / 3) return { x: sx, y: hAt(T, sx) + 3.2, arc: true };
    return { x: sx, y: hAt(T, sx) + 1.2, arc: false };
  }
  function ensurePickups(T, upTo) {
    while (T.nextArc * RAMP_GAP < upTo + RAMP_GAP) {
      const r = rampInfo(T, T.nextArc * RAMP_GAP + 1);
      if (r.start > upTo) break;
      spawnArc(T, T.nextArc);
      T.nextArc++;
    }
    while (T.genUpTo < upTo) {
      const x0 = T.genUpTo, x1 = x0 + 32;
      if (x0 > 30 && T.rng() < 0.5) {
        let cx = clearGap(T, x0 + T.rng() * 20);
        const n = 5 + Math.floor(T.rng() * 5);
        const roll = T.rng();
        const v = cx > 1500 ? (roll < 0.5 ? 100 : 25) : cx > 500 ? (roll < 0.5 ? 25 : 5) : 5;
        for (let k = 0; k < n; k++) {
          const x = cx + k * 0.9;
          if (gapContaining(T, x)) continue;
          T.pickups.push({ type: 'coin', x, y: hAt(T, x) + 1.1, v, taken: false });
        }
      }
      if (x0 > 30 && T.stage.id === 'supercountry' && T.rng() < 0.45) {
        const vx = clearGap(T, x0 + 6 + T.rng() * 16);
        if (!gapContaining(T, vx)) T.pickups.push({ type: 'veg', x: vx, y: hAt(T, vx) + 0.85, v: 8, taken: false });
      }
      if (T.nextFuel < x1) {
        const spot = fuelSpot(T, T.nextFuel);
        T.pickups.push({ type: 'fuel', x: spot.x, y: spot.y, taken: false, arc: spot.arc });
        const mul = T.stage.fuelMul || 1;
        T.nextFuel = spot.x + 90 * mul;
      }
      spawnStretch(T, x0, x1);
      T.genUpTo = x1;
    }
  }

  // ================= SPEED =================
  const KMH_PER_MPH = 1.60934;
  const VX_PER_MPH = KMH_PER_MPH / 3.6;
  const ENGINE_MPH_PER_LVL = 8;
  const MAX_MPH = 55;
  const UNBREAKABLE_MPH = 140;
  const MAX_VX = MAX_MPH * VX_PER_MPH;
  const vxToMph = (vx) => Math.abs(vx) * 3.6 / KMH_PER_MPH;
  function hudMaxMph() {
    return speedLimitMph(world && world.def);
  }
  function baseSpeedLimitMph(def) {
    return isImmortal(def) ? UNBREAKABLE_MPH : MAX_MPH;
  }
  function speedLimitMph(def) {
    const base = baseSpeedLimitMph(def);
    return (world && world.nitro && world.nitro.t > 0) ? base * 1.35 : base;
  }
  function capVx(def) {
    return speedLimitMph(def) * VX_PER_MPH;
  }
  function baseCapVx(def) {
    return baseSpeedLimitMph(def) * VX_PER_MPH;
  }
  const topSpeedCap = (car) => Math.min(car.maxSpeed, MAX_VX);
  function enforceSpeedCap(body, wheels) {
    const cap = capVx(world && world.def);
    let spd = Math.hypot(body.vx, body.vy);
    if (spd > cap) {
      const k = cap / spd;
      body.vx *= k;
      body.vy *= k;
      spd = cap;
    }
    if (body.vx > cap) {
      const k = cap / body.vx;
      body.vx = cap;
      body.vy *= k;
    } else if (body.vx < -cap * 0.4) {
      const k = (-cap * 0.4) / body.vx;
      body.vx = -cap * 0.4;
      body.vy *= k;
    }
    if (wheels) {
      for (const wh of wheels) {
        const ws = Math.hypot(wh.vx, wh.vy);
        if (ws > cap) {
          const k = cap / ws;
          wh.vx *= k;
          wh.vy *= k;
        }
        const maxW = cap / wh.r;
        if (wh.w < -maxW) wh.w = -maxW;
        else if (wh.w > maxW) wh.w = maxW;
      }
    }
    return Math.hypot(body.vx, body.vy);
  }
  function displaySpeedMph(body) {
    if (world && (world.sinkOnBed || world.sinkBoom)) return 0;
    const spd = Math.hypot(body.vx, body.vy);
    const lim = speedLimitMph(world && world.def);
    return Math.min(lim, Math.max(0, Math.round(vxToMph(spd))));
  }
  function formatDistance(m) {
    return String(Math.floor(Math.max(0, m)));
  }

  // ================= WORLD =================
  function buildCar(def, lv) {
    const awdLvl = lv.awd || 0;
    const freeWheel = def.wheels.some((w) => w.drive === false);
    const maxSpeed = def.immortal
      ? UNBREAKABLE_MPH * VX_PER_MPH
      : Math.min(def.maxSpeed + lv.engine * ENGINE_MPH_PER_LVL * VX_PER_MPH, baseCapVx(def));
    return {
      mass: def.mass, inertia: def.inertia,
      torque: def.torque * 1.2 * (1 + 0.09 * lv.engine) * (freeWheel ? 1 : (1 + 0.025 * awdLvl)),
      maxSpeed,
      k: def.k * (1 + 0.07 * lv.suspension), c: def.c * (1 + 0.05 * lv.suspension),
      grip: def.grip * (1 + 0.06 * lv.tires), tank: def.tank * (1 + 0.15 * lv.fuel), air: def.air,
      stable: 1 + 0.14 * (lv.stability || 0),
      awd: awdLvl / MAX_LVL,
      brake: 1 + 0.12 * (lv.brakes || 0),
      airCtrl: 1 + 0.08 * (lv.air || 0),
      wheelScale: 1 + 0.03 * (lv.tiresize || 0),
    };
  }

  let world = null;
  const input = { gas: false, brake: false, kGas: false, kBrake: false, pGas: false, pBrake: false, jump: false, jumpHold: false, cloak: false, kCloak: false, pCloak: false, stealthHold: false, kStealth: false, pStealth: false };

  function newWorld(def, stage, opts) {
    const T = makeTerrain(stage);
    const upgId = isUnbreakable(def) ? UNBREAKABLE_MENU_ANCHOR : def.id;
    const stockUpg = { engine: 0, suspension: 0, tires: 0, fuel: 0, stability: 0, awd: 0, brakes: 0, air: 0, tiresize: 0 };
    const car = buildCar(def, opts && opts.stock ? stockUpg : upgOf(upgId));
    const grow = car.wheelScale || 1;
    let lowest = 0;
    for (const w of def.wheels) lowest = Math.min(lowest, w.y - w.r * grow);
    const body = { x: 0, y: hAt(T, 0) - lowest + 0.05, a: 0, vx: 0, vy: 0, va: 0 };
    const wheels = def.wheels.map((w) => {
      const m = w.m || 1;
      const r = w.r * grow;
      return { lx: w.x, ly: w.y, r, m, I: 0.5 * m * r * r, drive: w.drive !== false,
        x: body.x + w.x, y: body.y + w.y, vx: 0, vy: 0, w: 0, ang: 0, contact: false, slip: 0 };
    });
    const live = Object.assign({ shape: 'low' }, def);
    world = { stage, def: live, defBase: def, form: 0, shiftLatch: false, T, car, body, wheels, fuel: 1, coins: 0, maxX: 0, distPaid: 0,
      airTime: 0, airRot: 0, airborne: false, crashed: false, crashTimer: 0, outTimer: 0, stuckTimer: 0,
      sinking: false, sinkTime: 0, sinkBoom: false, sinkOnBed: false, sinkBedTime: 0, sinkFloorY: null, sinkGap: null,
      sinkBedWarned: false, sinkLanded: false, carBroken: false, jumpKick: 0,
      boomShakeX: 0, boomShakeY: 0,
      lowWarned: false, outWarned: false, particles: [],
      nitro: { t: 0 },
      combo: { mult: 1, t: 0, peak: 1 },
      trick: { hold: 0, kind: '', armed: true },
      rescue: { carried: false, perfect: false, delivered: 0, fromX: 0, dive: null },
      trailer: null,
      ghost: { rec: [], acc: 0, beaten: false, play: null },
      cam: { x: body.x, y: body.y + 1.5, s: baseScale(), trackS: baseScale() } };
    ensurePickups(T, 150);
  }
  function baseScale() { return Math.min(H, W * 0.65) / 13; }

  function vehicleViewBounds(w) {
    const b = w.body;
    const cos = Math.cos(b.a), sin = Math.sin(b.a);
    let minX = b.x, maxX = b.x, minY = b.y, maxY = b.y;
    const add = (x, y, r) => {
      if (x - r < minX) minX = x - r;
      if (x + r > maxX) maxX = x + r;
      if (y - r < minY) minY = y - r;
      if (y + r > maxY) maxY = y + r;
    };
    const hull = w.def.hull;
    for (let i = 0; i < hull.length; i++) {
      const p = hull[i];
      add(b.x + p[0] * cos - p[1] * sin, b.y + p[0] * sin + p[1] * cos, 0.2);
    }
    const head = w.def.head;
    if (head && !w.def.noDriver) {
      add(b.x + head.x * cos - head.y * sin, b.y + head.x * sin + head.y * cos, head.r + 0.05);
    }
    for (let i = 0; i < w.wheels.length; i++) {
      const wh = w.wheels[i];
      add(wh.x, wh.y, wh.r);
    }
    return { minX, maxX, minY, maxY };
  }

  // ================= PHYSICS =================
  const DT = 1 / 240;
  const SINK_BED_DELAY = 5;
  const SINK_FORCE_BED = 2.5;
  const SINK_BOOM_DELAY = 2.4;
  const TILT_REACTION = 0.08, GROUND_SPIN_DAMP = 4, AIR_BOOST = 2.6;
  const JUMP_VY = 8;

  function wrapAng(a) {
    return Math.atan2(Math.sin(a), Math.cos(a));
  }

  // Pulls a grounded chassis onto the slope under the tires, kills wheelies, and adds speed stick.
  function stabilizeChassis(w, dt, contacts) {
    if (contacts <= 0 || w.crashed) return;
    const b = w.body, car = w.car, T = w.T;
    const nW = w.wheels.length;
    let sx = 0, sy = 0, sn = 0;
    for (const wh of w.wheels) {
      if (!wh.contact) continue;
      const nn = normalAt(T, wh.x);
      sx += nn.x; sy += nn.y; sn++;
    }
    if (!sn) return;
    const slope = Math.atan2(-sx, sy);
    const err = wrapAng(slope - b.a);
    const planted = sn / nW;
    const aerr = Math.abs(err);
    const s = car.stable || 1;
    const hold = 1.05 + 0.18 * (s - 1);

    if (aerr < hold) {
      const kA = 80 * planted * s;
      const cA = 18 * planted * s;
      b.va += (kA * err - cA * b.va) * dt;
      if (err * b.va < 0) b.va *= Math.exp(-14 * s * dt);
      const maxVa = (1.35 + 0.9 * (1 - planted)) / Math.sqrt(s);
      b.va = clamp(b.va, -maxVa, maxVa);
    } else if (aerr < hold + 0.5 && sn >= Math.ceil(nW * 0.5)) {
      b.va += (32 * s * err - 9 * s * b.va) * dt;
    }

    if (aerr < hold && sn >= Math.ceil(nW * 0.5) && b.vy < 7) {
      const nl = Math.hypot(sx, sy) || 1;
      const spd = Math.hypot(b.vx, b.vy);
      const acc = Math.min(9 + 4 * (s - 1), (3.2 + spd * 0.42) * clamp(car.k / 400, 0.55, 1.35) * s);
      const ax = (sx / nl) * acc * dt, ay = (sy / nl) * acc * dt;
      b.vx -= ax; b.vy -= ay;
      for (const wh of w.wheels) { wh.vx -= ax; wh.vy -= ay; }
    }
  }

  function step(dt, playing) {
    const w = world, b = w.body, car = w.car, T = w.T, g = w.stage.gravity, def = w.def;
    enforceSpeedCap(b, w.wheels);
    if (input.jump) {
      const sinkSeq = w.sinking || w.sinkOnBed || w.sinkBoom;
      if (def.id !== 'rocket' && def.id !== 'roadster' && !isUnbreakable(def) && playing && !w.crashed && !w.airborne && !sinkSeq) {
        b.vy += JUMP_VY;
        for (const wh of w.wheels) wh.vy += JUMP_VY;
        sfxJump();
      }
      input.jump = false;
    }
    const sinkSeq = w.sinking || w.sinkOnBed || w.sinkBoom;
    const gas = playing && input.gas && w.fuel > 0 && !w.crashed && !sinkSeq;
    const brake = playing && input.brake && !w.crashed && !sinkSeq;
    const jetCar = isJetCar(def);
    const jumpHold = jetCar && playing && input.jumpHold && w.fuel > 0 && !w.crashed && !sinkSeq;
    if (isImmortal(def)) w.fuel = 1;
    let cos = Math.cos(b.a), sin = Math.sin(b.a);

    for (const wh of w.wheels) {
      if (jetCar && w.airborne && jumpHold) { wh.w *= 0.992; continue; }
      const share = wh.drive ? 1 : (car.awd || 0);
      const brakeMul = car.brake || 1;
      if (share <= 0 && !(brake && brakeMul > 1)) { wh.w *= 0.9995; continue; }
      const maxW = capVx(def) / wh.r;
      let tau = 0;
      if (gas && share > 0) tau = -car.torque * share;
      else if (brake) tau = (wh.w < -0.5 ? car.torque * 1.2 : car.torque * 0.6) * brakeMul * (wh.drive ? 1 : Math.max(share, 0.45));
      if (tau) {
        let nw = wh.w + (tau / wh.I) * dt;
        nw = gas ? Math.max(nw, -maxW) : Math.min(nw, maxW * 0.45);
        const applied = ((nw - wh.w) * wh.I) / dt;
        if ((gas && applied < 0) || (brake && applied > 0)) {
          wh.w = nw;
          b.va -= ((applied * TILT_REACTION) / (car.inertia * (car.stable || 1))) * dt;
        }
      } else {
        wh.w *= 0.998;
      }
    }
    if (w.airborne && w.airTime > 0.08 && !(jetCar && jumpHold)) {
      const ramp = Math.min(1, (w.airTime - 0.08) / 0.15);
      let spin = Math.max(car.air, 4) * AIR_BOOST * ramp * (car.airCtrl || 1);
      if (jetCar) spin *= 0.68;
      if (gas) b.va += spin * dt;
      if (brake) b.va -= spin * dt;
      if (!gas && !brake) {
        b.va *= 1 - 0.6 * dt;
        if (w.airTime < 0.3) {
          const pitch = wrapAng(b.a);
          b.va += (-pitch * 14 - b.va * 5) * dt;
        }
      }
      if (gas && def.id === 'moonlander') {
        b.vy += 11 * dt;
        for (const wh of w.wheels) wh.vy += 11 * dt;
      }
    } else if (!w.airborne) {
      const s = car.stable || 1;
      b.va *= 1 - Math.min(0.2, GROUND_SPIN_DAMP * s * dt);
    }
    const maxSpin = w.airborne ? (jetCar ? 6.4 : 9) : 3.2 / Math.sqrt(car.stable || 1);
    b.va = clamp(b.va, -maxSpin, maxSpin);

    b.vy -= g * dt;
    for (const wh of w.wheels) wh.vy -= g * dt;
    if (def.id === 'rocket' && !sinkSeq) {
      if (jumpHold) {
        const up = g + 4.2;
        b.vy += up * dt;
        if (b.vy > 5.5) b.vy = 5.5;
        for (const wh of w.wheels) {
          wh.vy += up * dt;
          if (wh.vy > 5.5) wh.vy = 5.5;
        }
        if (w.airborne) {
          if (gas) {
            b.vx += 20 * dt;
            for (const wh of w.wheels) wh.vx += 20 * dt;
          } else if (brake) {
            b.vx -= 18 * dt;
            for (const wh of w.wheels) wh.vx -= 18 * dt;
          }
        }
        const err = wrapAng(-b.a);
        b.va += (err * 26 - b.va * 16) * dt;
        b.va = clamp(b.va, -1.1, 1.1);
      } else if (!w.airborne && gas) {
        b.vx += 8 * dt;
        for (const wh of w.wheels) wh.vx += 8 * dt;
      }
    }
    if (def.id === 'roadster' && !sinkSeq) {
      if (jumpHold) {
        const gy = rideHeight(w.T, b.x);
        const airH = b.y - gy;
        const want = 6.2;
        const lift = airH < want ? g + 6.2 : g;
        b.vy += lift * dt;
        if (airH < want) {
          if (b.vy > 7) b.vy = 7;
        } else {
          b.vy += (want - airH) * 4 * dt;
          b.vy = clamp(b.vy, -4, 1.5);
        }
        for (const wh of w.wheels) {
          wh.vy += lift * dt;
          if (airH < want) {
            if (wh.vy > 7) wh.vy = 7;
          } else {
            wh.vy += (want - airH) * 4 * dt;
            wh.vy = clamp(wh.vy, -4, 1.5);
          }
        }
        if (gas) {
          b.vx += 28 * dt;
          for (const wh of w.wheels) wh.vx += 28 * dt;
        } else if (brake) {
          b.vx -= 16 * dt;
          for (const wh of w.wheels) wh.vx -= 16 * dt;
          b.va += 2.4 * dt;
        }
        if (!(brake && !gas)) {
          const err = wrapAng(-b.a);
          b.va += (err * 22 - b.va * 12) * dt;
        }
        b.va = clamp(b.va, -1.6, 1.6);
      } else if (gas) {
        const push = w.airborne ? 18 : 16;
        b.vx += push * dt;
        for (const wh of w.wheels) wh.vx += push * dt;
      }
    }
    if (isUnbreakable(def) && !sinkSeq) {
      if (jumpHold) {
        if (isGhostUnbreakable(def)) {
          b.vy += g * 0.95 * dt;
          const hover = 2.6;
          b.vy += (hover - b.vy) * 3.8 * dt;
          b.vy = clamp(b.vy, -5, 5);
          for (const wh of w.wheels) {
            wh.vy += g * 0.95 * dt;
            wh.vy += (hover - wh.vy) * 3.8 * dt;
            wh.vy = clamp(wh.vy, -5, 5);
          }
        } else {
          const lift = g + 7.4;
          b.vy += lift * dt;
          if (b.vy > 22) b.vy = 22;
          for (const wh of w.wheels) {
            wh.vy += lift * dt;
            if (wh.vy > 22) wh.vy = 22;
          }
        }
        if (gas) {
          const flyPush = isGhostUnbreakable(def) ? 26 : 42;
          b.vx += flyPush * dt;
          for (const wh of w.wheels) wh.vx += flyPush * dt;
        } else if (brake) {
          b.vx -= 16 * dt;
          for (const wh of w.wheels) wh.vx -= 16 * dt;
          b.va += 2.4 * dt;
        }
      } else if (gas) {
        const push = w.airborne ? 34 : 32;
        b.vx += push * dt;
        for (const wh of w.wheels) wh.vx += push * dt;
      }
    }
    if (playing && !w.crashed && w.sinking && !w.sinkBoom && !w.sinkOnBed) {
      b.vy -= 22 * dt;
      const damp = Math.min(1, 9 * dt);
      b.vx *= 1 - damp;
      b.va *= 1 - Math.min(1, 6 * dt);
      b.y -= 16 * dt;
      keepCarInSinkGap(w);
      for (const wh of w.wheels) {
        wh.vx *= 1 - damp;
        wh.vy -= 14 * dt;
        wh.y -= 16 * dt;
      }
    }
    if (playing && !w.crashed && w.defBase && w.defBase.id === 'shifter') {
      if (gas && brake) {
        if (!w.shiftLatch) {
          w.shiftLatch = true;
          w.form = w.form ? 0 : 1;
          const pose = w.form ? w.defBase.alt : w.defBase;
          w.def.hull = pose.hull;
          w.def.head = pose.head;
          w.def.seat = pose.seat;
          w.def.hand = pose.hand;
          w.def.shape = w.form ? 'tall' : 'low';
        }
      } else w.shiftLatch = false;
    }
    if (playing && !w.crashed && w.stage.id === 'forest' && def.id !== 'van') {
      const cell = 9;
      const ci = Math.floor(b.x / cell);
      for (let k = ci - 1; k <= ci + 2; k++) {
        const hv = hash(T.seed + 21, k);
        if (hv < 0.02) continue;
        const tx = decorX(T, k, cell);
        if (rampBump(T, tx) > 0.2 || gapContaining(T, tx)) continue;
        if (Math.abs(b.x - tx) < 0.55) {
          const damp = Math.min(0.4, dt * 5);
          b.vx *= 1 - damp;
          for (const wh of w.wheels) wh.vx *= 1 - damp;
        }
      }
    }

    const travel = 0.26;
    for (const wh of w.wheels) {
      const rx = wh.lx * cos - wh.ly * sin, ry = wh.lx * sin + wh.ly * cos;
      const ax = b.x + rx, ay = b.y + ry;
      const avx = b.vx - b.va * ry, avy = b.vy + b.va * rx;
      const dx = wh.x - ax, dy = wh.y - ay, dvx = wh.vx - avx, dvy = wh.vy - avy;
      const ds = dx * cos + dy * sin, du = -dx * sin + dy * cos;
      const dvs = dvx * cos + dvy * sin, dvu = -dvx * sin + dvy * cos;
      const fs = -car.k * 6 * ds - car.c * 4.2 * dvs;
      let fu = -car.k * 1.45 * du - car.c * 2.8 * dvu;
      if (du > travel) fu -= car.k * 14 * (du - travel);
      else if (du < -travel) fu -= car.k * 14 * (du + travel);
      const fx = fs * cos - fu * sin, fy = fs * sin + fu * cos;
      wh.vx += (fx / wh.m) * dt; wh.vy += (fy / wh.m) * dt;
      b.vx -= (fx / car.mass) * dt; b.vy -= (fy / car.mass) * dt;
      b.va -= ((rx * fy - ry * fx) / car.inertia) * dt;
    }

    const hiSpd = Math.hypot(b.vx, b.vy);
    const drag = hiSpd > MAX_VX * 0.4 ? 0.9985 : 0.9996;
    b.vx *= drag; b.vy *= drag;
    b.va *= 0.9995;
    b.x += b.vx * dt; b.y += b.vy * dt; b.a += b.va * dt;
    for (const wh of w.wheels) { wh.x += wh.vx * dt; wh.y += wh.vy * dt; wh.ang += wh.w * dt; }

    let contacts = 0;
    const inSink = w.sinking || w.sinkOnBed || w.sinkBoom;
    for (const wh of w.wheels) {
      wh.contact = false;
      if (inSink || gapContaining(T, wh.x)) continue;
      const c = closest(T, wh.x, wh.y, wh.r);
      if (c.dist < wh.r) {
        const mu = car.grip * w.stage.grip * gripAt(T, wh.x);
        const pen = wh.r - c.dist, nx = c.nx, ny = c.ny;
        wh.x += nx * pen; wh.y += ny * pen;
        const vn = wh.vx * nx + wh.vy * ny;
        const share = (car.mass * 0.55) / w.wheels.length;
        const spd = Math.hypot(b.vx, b.vy);
        const N = (share + wh.m) * g * Math.max(0.4, ny) + share * Math.min(spd, 14) * 0.35;
        let jn = N * dt;
        if (vn < 0) {
          const jImpact = -vn * wh.m;
          if (jImpact > jn) jn = jImpact;
          wh.vx -= vn * nx; wh.vy -= vn * ny;
        }
        const tx = ny, ty = -nx;
        const slip = wh.vx * tx + wh.vy * ty + wh.w * wh.r;
        let jt = slip / (1 / wh.m + (wh.r * wh.r) / wh.I);
        const maxJ = mu * jn;
        jt = clamp(jt, -maxJ, maxJ);
        wh.vx -= (jt / wh.m) * tx; wh.vy -= (jt / wh.m) * ty;
        wh.w -= (jt * wh.r) / wh.I;
        wh.contact = true; wh.slip = slip;
        contacts++;
      }
    }
    if (playing && !w.crashed && contacts && (treeBlocking(T, b.x) || w.stage.sink)) {
      const drag = (treeBlocking(T, b.x) ? 3.2 : 0) + (w.stage.sink || 0);
      const k = Math.exp(-drag * dt);
      b.vx *= k;
      for (const wh of w.wheels) wh.vx *= k;
    }

    cos = Math.cos(b.a); sin = Math.sin(b.a);
    const hx = b.x + def.head.x * cos - def.head.y * sin;
    const hy = b.y + def.head.x * sin + def.head.y * cos;
    if (!isImmortal(def) && !w.crashed && playing && !inSink && !gapContaining(T, hx)) {
      const hc = closest(T, hx, hy, def.head.r);
      if (hc.dist < def.head.r * 0.9) crash();
    }
    if (!isImmortal(def) && !w.crashed && playing) {
      const ceilY = ceilingAt(T, hx);
      if (ceilY != null && hy + def.head.r * 0.85 > ceilY) crash();
    }

    let hullHits = 0;
    let bestPen = 0, brx = 0, bry = 0, bnx = 0, bny = 1;
    const pts = def.hull.concat([[def.head.x, def.head.y + def.head.r * 0.8]]);
    const onRoof = w.crashed || Math.cos(b.a) < 0.2;
    for (const p of pts) {
      const rx = p[0] * cos - p[1] * sin, ry = p[0] * sin + p[1] * cos;
      const px = b.x + rx, py = b.y + ry;
      if (inSink || gapContaining(T, px)) continue;
      const gh = hAt(T, px);
      if (py >= gh - 0.02) continue;
      const pen = gh - py;
      hullHits++;
      if (pen > bestPen) {
        bestPen = pen;
        brx = rx;
        bry = ry;
        const n = normalAt(T, px);
        bnx = n.x;
        bny = n.y;
      }
    }
    if (bestPen > 0) {
      const push = onRoof ? bestPen : Math.min(bestPen, 0.28);
      b.x += bnx * push;
      b.y += bny * push;
      for (const wh of w.wheels) { wh.x += bnx * push; wh.y += bny * push; }
      const vpx = b.vx - b.va * bry, vpy = b.vy + b.va * brx;
      const vn = vpx * bnx + vpy * bny;
      if (vn < 0) {
        const rest = onRoof ? 0 : 0.12;
        const rn = brx * bny - bry * bnx;
        const j = (-(1 + rest) * vn) / (1 / car.mass + (rn * rn) / car.inertia);
        const angScale = onRoof ? 0.25 : ((contacts > 0 && Math.cos(b.a) > 0.2) ? 0.15 / (car.stable || 1) : 0.65);
        b.vx += (j * bnx) / car.mass;
        b.vy += (j * bny) / car.mass;
        b.va += angScale * (rn * j) / car.inertia;
        if (!onRoof) {
          const tx = bny, ty = -bnx;
          const vt = (b.vx - b.va * bry) * tx + (b.vy + b.va * brx) * ty;
          const rt = brx * ty - bry * tx;
          let jt = -vt / (1 / car.mass + (rt * rt) / car.inertia);
          jt = clamp(jt, -0.45 * j, 0.45 * j);
          b.vx += (jt * tx) / car.mass;
          b.vy += (jt * ty) / car.mass;
          b.va += angScale * (rt * jt) / car.inertia;
        }
      }
      if (onRoof) {
        if (b.vy > 0) b.vy *= 0.15;
        b.va *= 0.86;
        for (const wh of w.wheels) if (wh.vy > 0) wh.vy *= 0.15;
      }
    }

    stabilizeChassis(w, dt, contacts);

    enforceSpeedCap(b, w.wheels);

    const nowAir = contacts === 0 && hullHits === 0;
    if (nowAir) {
      w.airTime += dt; w.airRot += b.va * dt;
    } else if (w.airborne) {
      if (contacts > 0 && Math.cos(b.a) > 0.35) b.va *= Math.max(0.08, 0.3 / (car.stable || 1));
      if (w.airTime > 0.35) {
        const gy = rideHeight(T, b.x);
        for (let k = 0; k < 18; k++) {
          const dir = k % 2 ? 1 : -1;
          w.particles.push({ x: b.x + (Math.random() - 0.5) * 2, y: gy + 0.1, vx: dir * (1.5 + Math.random() * 3), vy: 0.5 + Math.random() * 1.5,
            life: 0.8, max: 0.8, r: 0.2 + Math.random() * 0.25, c: w.stage.dust });
        }
      }
      if (playing && !w.crashed) awardAir(w.airTime, w.airRot);
      w.airTime = 0; w.airRot = 0;
    }
    w.airborne = nowAir;
    if (w.jumpKick > 0) {
      w.jumpKick -= dt;
      if (!gas && !brake) {
        const pitch = wrapAng(b.a);
        b.va += (-pitch * 18 - b.va * 8) * dt;
      }
    }
    if (playing) resolveGapFloor(w, playing);
    else if (w.sinking || w.sinkBoom) resolveGapFloor(w, false);
  }

  function awardAir(time, rot) {
    const flips = Math.floor((Math.abs(rot) + 0.6) / TAU);
    if (flips <= 0 && time <= 0.35) return;
    const b = world.body;
    const ang = Math.atan2(Math.sin(b.a), Math.cos(b.a));
    const wheelsDown = world.wheels.some((wh) => wh.contact);
    const perfect = Math.abs(ang) < 0.45 && wheelsDown && Math.abs(b.va) < 3;
    const scale = perfect ? 1 : 0.4;
    if (world.rescue && world.rescue.carried) {
      if (!perfect) missRescue('They bailed!', true);
      else world.rescue.perfect = true;
    }
    if (!perfect) { world.combo.mult = 1; world.combo.t = 0; }
    if (flips > 0) {
      const m = addStunt();
      const amt = Math.max(1, Math.round(flips * 100 * scale * m));
      world.coins += amt;
      floater(`${rot > 0 ? 'Backflip' : 'Frontflip'}${flips > 1 ? ' x' + flips : ''}! x${fmtMult(m)} +${amt}`, W / 2, H * 0.35, 'bonus');
    }
    if (time > 1.2) {
      const m = addStunt();
      const amt = Math.max(1, Math.round(time * 20 * scale * m));
      world.coins += amt;
      floater(`Air time ${time.toFixed(1)}s! x${fmtMult(m)} +${amt}`, W / 2, H * 0.42, 'bonus');
    }
    if (perfect) {
      const m = addStunt();
      const amt = Math.max(1, Math.round(50 * m));
      world.coins += amt;
      floater(`Perfect! x${fmtMult(m)} +${amt}`, W / 2, H * 0.28, 'bonus');
    } else {
      floater('Sketchy', W / 2, H * 0.28, 'bad');
    }
    if (perfect || flips > 0) sfxBonus();
  }

  // ================= EXTRAS =================
  const PAINT_COLORS = ['#e8341c', '#f5c518', '#3cae3a', '#2e7fe8', '#8a2be2', '#f4f1ea', '#1c1c1c', '#e86bb0'];
  const PAINT_DECALS = [
    { id: 'none', name: 'None' },
    { id: 'stripe', name: 'Stripe' },
    { id: 'flame', name: 'Flame' },
    { id: 'star', name: 'Star' },
  ];

  function frontWheel(w) {
    let best = w.wheels[0];
    for (let i = 1; i < w.wheels.length; i++) if (w.wheels[i].lx > best.lx) best = w.wheels[i];
    return best;
  }
  function rearWheel(w) {
    let best = w.wheels[0];
    for (let i = 1; i < w.wheels.length; i++) if (w.wheels[i].lx < best.lx) best = w.wheels[i];
    return best;
  }
  function fmtMult(m) {
    const r = Math.round(m * 2) / 2;
    return r % 1 ? r.toFixed(1) : String(r);
  }
  function addStunt() {
    const c = world.combo;
    if (!c) return 1;
    c.mult = Math.min(8, Math.round((c.mult + 0.5) * 2) / 2);
    c.t = 3;
    if (c.mult > c.peak) c.peak = c.mult;
    if (c.mult >= 4) markGoal('stunt');
    return c.mult;
  }
  function goalsOf(sid) {
    if (!save.goals || typeof save.goals !== 'object') save.goals = {};
    if (!save.goals[sid]) save.goals[sid] = { dist: false, stunt: false, haul: false, paid: false };
    return save.goals[sid];
  }
  function markGoal(key) {
    if (testRide || !world || state === 'menu') return;
    const g = goalsOf(world.stage.id);
    if (g[key]) return;
    g[key] = true;
    persist();
  }
  function claimGoalBonus() {
    if (testRide || !world) return;
    const g = goalsOf(world.stage.id);
    if (g.dist && g.stunt && g.haul && !g.paid) {
      g.paid = true;
      world.coins += 1000;
    }
  }
  function fillGoalRow(el, sid) {
    if (!el) return;
    const g = (save.goals && save.goals[sid]) || {};
    const bits = [['dist', '500 m'], ['stunt', 'x4 combo'], ['haul', 'Haul']];
    el.innerHTML = bits.map(([k, label]) => `<span class="goal${g[k] ? ' on' : ''}">${label}</span>`).join('');
  }

  function spawnProps(T, x) {
    const kinds = ['sign', 'crate', 'barrel'];
    const n = 1 + Math.floor(T.rngX() * 3);
    let cursor = x;
    for (let k = 0; k < n; k++) {
      const sx = safeSpot(T, cursor);
      if (sx == null) return;
      const kind = kinds[Math.floor(T.rngX() * kinds.length)];
      T.props.push({ kind, x: sx, broken: false });
      cursor = sx + 1.6;
    }
  }
  function spawnStretch(T, x0, x1) {
    while (T.nextProp < x1) {
      spawnProps(T, T.nextProp);
      T.nextProp += 40 + T.rngX() * 30;
    }
    while (T.nextNitro < x1) {
      const sx = safeSpot(T, T.nextNitro);
      if (sx != null) T.pickups.push({ type: 'nitro', x: sx, y: hAt(T, sx) + 1.15, taken: false });
      T.nextNitro = (sx == null ? T.nextNitro : sx) + 360 + T.rngX() * 80;
    }
    if (!T.rescues.length && T.nextRescue < x1) {
      const sx = safeSpot(T, T.nextRescue);
      if (sx == null) T.nextRescue += 24;
      else {
        T.rescues.push({ x: sx, state: 'wait', skin: rescueSkin(T.stage), pad: null });
        T.nextRescue = Infinity;
      }
    }
  }
  function breakProp(w, p) {
    if (p.broken) return;
    p.broken = true;
    const coins = 15 + Math.floor(w.T.rngX() * 26);
    w.coins += coins;
    const sp = toScreen(p.x, hAt(w.T, p.x) + 0.7);
    floater(`+${coins}`, sp.x, sp.y);
    sfxCoin(coins);
    const fill = p.kind === 'crate' ? '#c48a3a' : p.kind === 'barrel' ? '#8a3a22' : '#fff8e1';
    for (let i = 0; i < 8; i++) {
      w.particles.push({
        x: p.x, y: hAt(w.T, p.x) + 0.4,
        vx: (Math.random() - 0.5) * 5, vy: 2 + Math.random() * 3,
        life: 0.55, max: 0.55, r: 0.1, rw: 0.16, rh: 0.1,
        rot: Math.random() * TAU, vr: (Math.random() - 0.5) * 8,
        fill, c: '200,160,80', kind: 'debris',
      });
    }
  }
  function updateProps(w) {
    const b = w.body;
    for (const p of w.T.props) {
      if (p.broken || p.x < b.x - 6 || p.x > b.x + 8) continue;
      const py = hAt(w.T, p.x) + 0.4;
      let hit = Math.hypot(p.x - b.x, py - b.y) < 1.3;
      if (!hit) {
        for (const wh of w.wheels) {
          if (Math.hypot(p.x - wh.x, py - wh.y) < wh.r + 0.4) { hit = true; break; }
        }
      }
      if (hit) breakProp(w, p);
    }
  }

  function rollerKind(st) {
    const d = st.decor;
    if (d === 'trees' || d === 'pines' || d === 'jungle') return 'log';
    if (st.id === 'factory' || st.id === 'nuclear' || st.id === 'junkyard' || st.id === 'construction' || st.id === 'highway' || st.id === 'megahighway') return 'barrel';
    return 'boulder';
  }
  function spawnRoller(T, x, carX) {
    let best = null, bestH = -1e9;
    for (let d = 0; d <= 36; d += 4) {
      const sx = safeSpot(T, x + d);
      if (sx == null) continue;
      const h = hAt(T, sx);
      if (h > bestH) { bestH = h; best = sx; }
    }
    if (best == null) return;
    const kind = rollerKind(T.stage);
    const rad = kind === 'log' ? 0.4 : 0.62;
    T.rollers.push({
      kind, x: best, y: hAt(T, best) + rad, vx: 0, vy: 0, ang: 0,
      dir: best >= carX ? -1 : 1, wait: 0.8, rad, alive: true, puff: true, falling: false,
    });
  }
  function rollerHits(w, r) {
    const b = w.body;
    if (Math.hypot(r.x - b.x, r.y - b.y) < r.rad + 1.15) return true;
    const cos = Math.cos(b.a), sin = Math.sin(b.a);
    const hull = w.def.hull || [];
    for (let i = 0; i < hull.length; i += 2) {
      const p = hull[i];
      const px = b.x + p[0] * cos - p[1] * sin;
      const py = b.y + p[0] * sin + p[1] * cos;
      if (Math.hypot(r.x - px, r.y - py) < r.rad + 0.3) return true;
    }
    for (const wh of w.wheels) {
      if (Math.hypot(r.x - wh.x, r.y - wh.y) < r.rad + wh.r * 0.8) return true;
    }
    return false;
  }
  function updateRollers(w, dt) {
    const T = w.T, b = w.body;
    if (state === 'play') {
      while (T.nextRoller < b.x + 48) {
        if (T.nextRoller > b.x + 18) spawnRoller(T, T.nextRoller, b.x);
        T.nextRoller += 250 + T.rngX() * 100;
      }
    }
    const g = w.stage.gravity;
    for (const r of T.rollers) {
      if (!r.alive) continue;
      if (r.puff) {
        r.puff = false;
        for (let i = 0; i < 10; i++) {
          w.particles.push({
            x: r.x + (Math.random() - 0.5) * 1.2, y: r.y,
            vx: (Math.random() - 0.5) * 2, vy: 1 + Math.random() * 2,
            life: 0.7, max: 0.7, r: 0.16 + Math.random() * 0.12, c: w.stage.dust,
          });
        }
      }
      if (r.wait > 0) r.wait -= dt;
      else if (r.falling || gapContaining(T, r.x)) {
        r.falling = true;
        r.vy -= g * dt;
        r.x += r.vx * dt;
        r.y += r.vy * dt;
        r.ang += r.vx * dt;
        if (r.y < hAt(T, r.x) - 24) r.alive = false;
      } else {
        const slope = (hAt(T, r.x + 0.4) - hAt(T, r.x - 0.4)) / 0.8;
        r.vx += r.dir * 6 * dt - slope * 7 * dt;
        r.vx = clamp(r.vx, -11, 11);
        r.x += r.vx * dt;
        if (gapContaining(T, r.x)) r.falling = true;
        else {
          r.y = hAt(T, r.x) + r.rad;
          r.ang += (r.vx / r.rad) * dt;
        }
      }
      if (!r.alive || r.x < b.x - 30) { if (r.x < b.x - 30) r.alive = false; continue; }
      if (r.falling && r.y < hAt(T, b.x) - 1.5) continue;
      if (!rollerHits(w, r)) continue;
      if (w.airborne) continue;
      if (isImmortal(w.def)) {
        r.dir = r.x >= b.x ? 1 : -1;
        r.vx = r.dir * 14;
        r.y += 0.45;
        r.falling = false;
        continue;
      }
      if (state === 'play' && !w.crashed) crash();
    }
  }

  function updateTricks(w, dt) {
    const tr = w.trick;
    if (!tr || state !== 'play' || w.crashed || w.sinking || w.sinkOnBed || w.sinkBoom) return;
    if (!w.wheels.length) return;
    const front = frontWheel(w), rear = rearWheel(w);
    if (front.contact && rear.contact) tr.armed = true;
    if (!tr.armed) { tr.hold = 0; tr.kind = ''; return; }
    let active = '';
    if (rear.contact && !front.contact && input.gas && Math.cos(w.body.a) > 0.35) active = 'wheelie';
    else if (front.contact && !rear.contact && input.brake) active = 'stoppie';
    if (active && active === tr.kind) tr.hold += dt;
    else { tr.kind = active; tr.hold = active ? dt : 0; }
    const need = active === 'wheelie' ? 0.6 : active === 'stoppie' ? 0.4 : 99;
    if (!active || tr.hold < need) return;
    tr.armed = false;
    tr.hold = 0;
    tr.kind = '';
    const m = addStunt();
    const amt = Math.max(1, Math.round(40 * m));
    w.coins += amt;
    floater(`${active === 'wheelie' ? 'Wheelie!' : 'Stoppie!'} x${fmtMult(m)} +${amt}`, W / 2, H * 0.33, 'bonus');
    sfxBonus();
  }

  function rescueSkin(st) {
    const id = st.id;
    if (id === 'countryside' || id === 'supercountry') return { rider: 'farmer', mark: 'barn' };
    if (id === 'desert' || id === 'megadesert') return { rider: 'prospector', mark: 'tent' };
    if (id === 'arctic' || id === 'xmas' || id === 'northpole') return { rider: 'parka', mark: 'igloo' };
    if (id === 'moon' || id === 'mars' || id === 'space') return { rider: 'astronaut', mark: 'flag' };
    if (id === 'cave' || id === 'arcticcave') return { rider: 'miner', mark: 'lantern' };
    if (id === 'volcano') return { rider: 'hardhat', mark: 'ring' };
    return { rider: 'hiker', mark: 'sign' };
  }
  function dropPad(T, fromX) {
    let best = null, bestH = -1e9;
    for (let d = 80; d <= 110; d += 2) {
      const sx = safeSpot(T, fromX + d);
      if (sx == null || sx < fromX + 78 || sx > fromX + 116) continue;
      const h = hAt(T, sx);
      if (h > bestH) { bestH = h; best = sx; }
    }
    if (best == null) best = safeSpot(T, fromX + 80);
    return best == null ? fromX + 90 : best;
  }
  function scheduleNextRescue(fromX) {
    const T = world.T;
    T.rescues.length = 0;
    T.nextRescue = fromX + 160 + T.rngX() * 60;
  }
  function missRescue(text, atCar) {
    const r = world.T.rescues[0];
    if (r) {
      const x = atCar ? world.body.x : r.x;
      world.rescue.dive = { x, y: hAt(world.T, x), skin: r.skin, t: 0.5 };
    }
    world.rescue.carried = false;
    world.rescue.perfect = false;
    if (text) floater(text, W / 2, H * 0.3, text === 'Got them!' ? 'bonus' : 'bad');
    scheduleNextRescue(world.body.x);
  }
  function updateRescue(w, dt) {
    const R = w.rescue;
    if (R.dive) {
      R.dive.t -= dt;
      if (R.dive.t <= 0) R.dive = null;
    }
    if (state !== 'play' || w.crashed) return;
    const r = w.T.rescues[0];
    const b = w.body;
    if (r && r.state === 'wait') {
      const ry = hAt(w.T, r.x) + 0.7;
      let near = Math.hypot(r.x - b.x, ry - b.y) < 1.6;
      if (!near) {
        for (const wh of w.wheels) if (Math.hypot(r.x - wh.x, ry - wh.y) < 1.6) { near = true; break; }
      }
      if (near) {
        if (vxToMph(b.vx) < 15) {
          r.state = 'carried';
          r.pad = dropPad(w.T, b.x);
          R.carried = true;
          R.perfect = false;
          R.fromX = b.x;
          floater('Got them!', W / 2, H * 0.3, 'bonus');
          sfxBonus();
        } else missRescue('Too fast!', false);
      } else if (b.x > r.x + 6) missRescue('', false);
    }
    if (R.carried && r && r.pad != null) {
      let crossed = false;
      for (const wh of w.wheels) if (wh.contact && wh.x >= r.pad) crossed = true;
      if (b.x > r.pad + 10) missRescue('Missed the pad!', true);
      else if (crossed && Math.cos(b.a) > 0.35) {
        const meters = Math.max(0, b.x - R.fromX);
        let pay = Math.round(200 + 3 * meters);
        if (R.perfect) pay += 150;
        w.coins += pay;
        R.delivered += 1;
        R.carried = false;
        R.perfect = false;
        floater(`Delivered! +${pay}`, W / 2, H * 0.3, 'bonus');
        sfxBonus();
        markGoal('haul');
        scheduleNextRescue(b.x);
      }
    }
  }

  function hitchLocal(def) {
    const ex = def.exhaust;
    if (ex && ex.x < -0.2) return { x: ex.x, y: ex.y };
    let x = -1.6, y = 0;
    const hull = def.hull || [];
    for (const p of hull) if (p[0] < x) x = p[0];
    return { x, y };
  }
  function hitchPoint(w) {
    const b = w.body, p = hitchLocal(w.def);
    const cos = Math.cos(b.a), sin = Math.sin(b.a);
    return { x: b.x + p.x * cos - p.y * sin, y: b.y + p.x * sin + p.y * cos };
  }
  function attachTrailer(w) {
    const h = hitchPoint(w), a = w.body.a;
    let x = h.x - Math.cos(a) * 1.9;
    let y = h.y - Math.sin(a) * 1.9;
    if (!gapContaining(w.T, x)) {
      const gy = hAt(w.T, x) + 0.36;
      if (y < gy) y = gy;
    }
    w.trailer = { attached: true, x, y, a, vx: w.body.vx, vy: 0, va: 0, ang: 0, len: 1.9 };
  }
  function cutTrailer() {
    const tr = world && world.trailer;
    if (!tr || !tr.attached || state !== 'play') return;
    tr.attached = false;
    tr.va = 5;
    tr.vy += 2;
  }
  function updateTrailer(w, dt) {
    const tr = w.trailer;
    if (!tr) return;
    const T = w.T, g = w.stage.gravity;
    tr.vy -= g * dt;
    tr.x += tr.vx * dt;
    tr.y += tr.vy * dt;
    tr.a += tr.va * dt;
    tr.ang += tr.vx * dt;
    for (const lx of [-0.55, 0.55]) {
      const cos = Math.cos(tr.a), sin = Math.sin(tr.a);
      const ly = -0.34;
      const wx = tr.x + lx * cos - ly * sin;
      const wy = tr.y + lx * sin + ly * cos;
      if (gapContaining(T, wx)) continue;
      const hit = closest(T, wx, wy, 0.28);
      if (hit.dist < 0.28) {
        const pen = 0.28 - hit.dist;
        tr.x += hit.nx * pen;
        tr.y += hit.ny * pen;
        const vn = tr.vx * hit.nx + tr.vy * hit.ny;
        if (vn < 0) {
          tr.vx -= vn * hit.nx;
          tr.vy -= vn * hit.ny;
          tr.va += lx * vn * 0.35;
        }
      }
    }
    if (!tr.attached) {
      tr.vx *= 1 - Math.min(1, dt * 0.3);
      return;
    }
    const h = hitchPoint(w);
    let dx = tr.x - h.x, dy = tr.y - h.y;
    const dist = Math.hypot(dx, dy) || 0.001;
    const err = dist - tr.len;
    tr.x -= (dx / dist) * err * 0.7;
    tr.y -= (dy / dist) * err * 0.7;
    tr.vx += (w.body.vx - tr.vx) * Math.min(1, dt * 3);
    tr.vy += (w.body.vy - tr.vy) * Math.min(1, dt);
    const link = Math.atan2(tr.y - h.y, tr.x - h.x);
    tr.a += wrapAng(link - tr.a) * Math.min(1, dt * 8);
    const diff = Math.abs(wrapAng(link - (w.body.a + Math.PI)));
    if (diff > 1.4 && state === 'play' && !w.crashed) crash();
  }

  function packGhost(rec) {
    const n = (rec.length / 3) | 0;
    if (n <= 1500) return rec.slice();
    const out = [];
    for (let i = 0; i < 1500; i++) {
      const k = Math.round((i * (n - 1)) / 1499);
      out.push(rec[k * 3], rec[k * 3 + 1], rec[k * 3 + 2]);
    }
    return out;
  }
  function loadGhost(w) {
    const vid = isUnbreakable(w.defBase) ? UNBREAKABLE_MENU_ANCHOR : w.defBase.id;
    const pack = save.ghost && save.ghost[w.stage.id] && save.ghost[w.stage.id][vid];
    w.ghost.play = pack && pack.length >= 6 ? pack : null;
    w.ghost.beaten = false;
    w.ghost.rec = [];
    w.ghost.acc = 0;
  }
  function storeGhost(sid, vid) {
    if (testRide || !world.ghost) return;
    const packed = packGhost(world.ghost.rec);
    if (packed.length < 6) return;
    if (!save.ghost || typeof save.ghost !== 'object') save.ghost = {};
    if (!save.ghost[sid]) save.ghost[sid] = {};
    save.ghost[sid][vid] = packed;
  }
  function recordGhost(w, dt) {
    if (state !== 'play' || testRide || w.crashed || !w.ghost) return;
    const g = w.ghost;
    g.acc += dt;
    if (g.acc < 0.2) return;
    g.acc = 0;
    const b = w.body;
    const x = Math.round(b.x * 10);
    if (g.rec.length && x <= g.rec[g.rec.length - 3]) return;
    g.rec.push(x, Math.round(b.y * 10), Math.round(b.a * 100));
  }

  function updateExtras(dt) {
    const w = world;
    if (!w || !w.nitro) return;
    if (w.nitro.t > 0) w.nitro.t = Math.max(0, w.nitro.t - dt);
    if (w.combo && w.combo.t > 0) {
      if (!w.airborne) w.combo.t -= dt;
      if (w.combo.t <= 0) { w.combo.t = 0; w.combo.mult = 1; }
    }
    updateProps(w);
    updateRollers(w, dt);
    updateTricks(w, dt);
    updateRescue(w, dt);
    updateTrailer(w, dt);
    recordGhost(w, dt);
    if (!testRide && state === 'play' && w.maxX >= 500) markGoal('dist');
  }
  function syncExtraHud() {
    const w = world;
    const rider = $('hud-rider');
    if (rider) {
      const r = w && w.T.rescues[0];
      const show = !!(w && w.rescue && w.rescue.carried && r && r.pad != null);
      rider.classList.toggle('hidden', !show);
      if (show) $('rider-label').textContent = `RIDER ${Math.max(0, Math.round(r.pad - w.body.x))}m`;
    }
    const combo = $('hud-combo');
    if (combo && w && w.combo) {
      combo.classList.toggle('hidden', w.combo.mult <= 1);
      $('combo-label').textContent = `x${fmtMult(w.combo.mult)}`;
      const fill = $('combo-fill');
      if (fill) fill.style.width = `${clamp(w.combo.t / 3, 0, 1) * 100}%`;
    }
    const nitro = $('hud-nitro');
    if (nitro && w && w.nitro) nitro.classList.toggle('hidden', w.nitro.t <= 0);
    const cut = $('cut-btn');
    if (cut) cut.classList.toggle('hidden', !(w && w.trailer && w.trailer.attached && (state === 'play' || state === 'pause')));
  }

  function drawProps(T, cam) {
    const hw = W / 2 / cam.s + 3;
    for (const p of T.props) {
      if (p.broken || p.x < cam.x - hw || p.x > cam.x + hw) continue;
      const y = hAt(T, p.x);
      ctx.save();
      ctx.translate(p.x, y);
      ctx.lineWidth = 0.05;
      ctx.strokeStyle = '#3a2412';
      if (p.kind === 'sign') {
        ctx.fillStyle = '#6b4220';
        ctx.fillRect(-0.06, 0, 0.12, 0.85);
        ctx.fillStyle = '#fff8e1';
        ctx.fillRect(-0.4, 0.85, 0.8, 0.42);
        ctx.strokeRect(-0.4, 0.85, 0.8, 0.42);
      } else if (p.kind === 'crate') {
        ctx.fillStyle = '#c48a3a';
        ctx.fillRect(-0.36, 0, 0.72, 0.72);
        ctx.strokeRect(-0.36, 0, 0.72, 0.72);
        ctx.beginPath();
        ctx.moveTo(-0.36, 0); ctx.lineTo(0.36, 0.72);
        ctx.moveTo(0.36, 0); ctx.lineTo(-0.36, 0.72);
        ctx.stroke();
      } else {
        ctx.fillStyle = '#8a3a22';
        ctx.beginPath(); ctx.ellipse(0, 0.42, 0.32, 0.42, 0, 0, TAU); ctx.fill(); ctx.stroke();
        ctx.strokeStyle = '#e8d2a0';
        ctx.beginPath(); ctx.ellipse(0, 0.42, 0.22, 0.3, 0, 0, TAU); ctx.stroke();
      }
      ctx.restore();
    }
  }
  function drawRider(skin, dive) {
    const look = {
      farmer: ['#3a6ea5', '#e6c15a', 'brim'],
      prospector: ['#8a5a32', '#5c3a22', 'brim'],
      parka: ['#d5e4f2', '#2a6fad', 'hood'],
      astronaut: ['#f7f7f7', '#d5dbe3', 'helm'],
      miner: ['#3e4248', '#f5c518', 'hard'],
      hardhat: ['#d2652a', '#f5c518', 'hard'],
      hiker: ['#2e8b3a', '#6b4220', 'cap'],
    }[skin] || ['#2e8b3a', '#6b4220', 'cap'];
    ctx.save();
    if (dive) ctx.rotate(-1.05);
    ctx.lineWidth = 0.04;
    ctx.strokeStyle = '#1a1a1a';
    ctx.fillStyle = look[0];
    ctx.fillRect(-0.16, 0.16, 0.32, 0.52);
    ctx.strokeRect(-0.16, 0.16, 0.32, 0.52);
    ctx.fillStyle = '#f2c094';
    ctx.beginPath(); ctx.arc(0, 0.88, 0.16, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = look[0];
    ctx.lineWidth = 0.07;
    ctx.beginPath();
    ctx.moveTo(-0.08, 0.16); ctx.lineTo(-0.14, 0);
    ctx.moveTo(0.08, 0.16); ctx.lineTo(0.14, 0);
    ctx.stroke();
    ctx.fillStyle = look[1];
    if (look[2] === 'brim') {
      ctx.fillRect(-0.24, 1.0, 0.48, 0.06);
      ctx.fillRect(-0.12, 1.0, 0.24, 0.12);
    } else if (look[2] === 'hood' || look[2] === 'helm') {
      ctx.beginPath(); ctx.arc(0, 0.9, 0.2, 0, TAU); ctx.fill(); ctx.stroke();
      if (look[2] === 'helm') {
        ctx.fillStyle = '#9fd4ff';
        ctx.fillRect(-0.1, 0.82, 0.2, 0.08);
      }
    } else if (look[2] === 'hard') {
      ctx.beginPath();
      ctx.moveTo(-0.18, 0.96);
      ctx.quadraticCurveTo(0, 1.22, 0.18, 0.96);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.fillRect(-0.16, 1.0, 0.32, 0.08);
    }
    ctx.restore();
  }
  function drawLandmark(kind) {
    ctx.save();
    ctx.lineWidth = 0.05;
    ctx.strokeStyle = '#1a1a1a';
    if (kind === 'barn') {
      ctx.fillStyle = '#c0392b';
      ctx.fillRect(-0.55, 0, 1.1, 0.8);
      ctx.fillStyle = '#f4f1ea';
      ctx.fillRect(-0.16, 0, 0.32, 0.4);
      ctx.fillStyle = '#7a1208';
      ctx.beginPath(); ctx.moveTo(-0.7, 0.8); ctx.lineTo(0, 1.35); ctx.lineTo(0.7, 0.8); ctx.fill();
    } else if (kind === 'tent') {
      ctx.fillStyle = '#e6d2a2';
      ctx.beginPath(); ctx.moveTo(-0.6, 0); ctx.lineTo(0, 0.9); ctx.lineTo(0.6, 0); ctx.fill(); ctx.stroke();
    } else if (kind === 'igloo') {
      ctx.fillStyle = '#f7fbff';
      ctx.beginPath();
      ctx.moveTo(-0.55, 0);
      ctx.quadraticCurveTo(0, 1.15, 0.55, 0);
      ctx.closePath();
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#2a3a4a';
      ctx.fillRect(-0.12, 0, 0.24, 0.28);
    } else if (kind === 'flag') {
      ctx.strokeStyle = '#ddd';
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 1.4); ctx.stroke();
      ctx.fillStyle = '#e8341c';
      ctx.fillRect(0, 0.9, 0.55, 0.32);
    } else if (kind === 'lantern') {
      ctx.strokeStyle = '#5a5048';
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 0.9); ctx.stroke();
      ctx.fillStyle = '#f5c518';
      ctx.beginPath(); ctx.arc(0, 1.05, 0.16, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(255,220,80,0.35)';
      ctx.beginPath(); ctx.arc(0, 1.05, 0.4, 0, TAU); ctx.fill();
    } else if (kind === 'ring') {
      ctx.fillStyle = '#6a6560';
      for (let i = 0; i < 6; i++) {
        const a = Math.PI * (0.15 + i / 7);
        ctx.beginPath();
        ctx.arc(Math.cos(a) * 0.55, Math.sin(a) * 0.28, 0.12, 0, TAU);
        ctx.fill();
      }
    } else {
      ctx.fillStyle = '#6b4220';
      ctx.fillRect(-0.04, 0, 0.08, 0.9);
      ctx.fillStyle = '#fff8e1';
      ctx.fillRect(-0.28, 0.9, 0.56, 0.32);
      ctx.strokeRect(-0.28, 0.9, 0.56, 0.32);
    }
    ctx.restore();
  }
  function drawRescues(w) {
    const cam = w.cam, hw = W / 2 / cam.s + 4;
    const bob = Math.sin(performance.now() / 180) * 0.06;
    const r = w.T.rescues[0];
    if (r && r.x > cam.x - hw && r.x < cam.x + hw) {
      const y = hAt(w.T, r.x);
      if (r.state === 'wait') {
        ctx.save(); ctx.translate(r.x, y + bob); drawRider(r.skin.rider, false); ctx.restore();
        const mx = gapContaining(w.T, r.x + 1.6) ? r.x - 1.6 : r.x + 1.6;
        ctx.save(); ctx.translate(mx, hAt(w.T, mx)); drawLandmark(r.skin.mark); ctx.restore();
      }
      if (r.pad != null && r.pad > cam.x - hw && r.pad < cam.x + hw && w.rescue.carried) {
        ctx.save(); ctx.translate(r.pad, hAt(w.T, r.pad)); drawLandmark(r.skin.mark); ctx.restore();
      }
    }
    const dive = w.rescue && w.rescue.dive;
    if (dive && dive.x > cam.x - hw && dive.x < cam.x + hw) {
      ctx.save(); ctx.translate(dive.x, dive.y); drawRider(dive.skin.rider, true); ctx.restore();
    }
  }
  function drawRollers(w) {
    const cam = w.cam, hw = W / 2 / cam.s + 3;
    const st = w.stage;
    for (const r of w.T.rollers) {
      if (!r.alive || r.x < cam.x - hw || r.x > cam.x + hw) continue;
      ctx.save();
      ctx.translate(r.x, r.y);
      ctx.rotate(r.ang);
      ctx.lineWidth = 0.05;
      ctx.strokeStyle = '#1a1a1a';
      if (r.kind === 'log') {
        ctx.fillStyle = '#6b4220';
        ctx.fillRect(-0.7, -0.28, 1.4, 0.56);
        ctx.strokeRect(-0.7, -0.28, 1.4, 0.56);
        ctx.fillStyle = '#c4a574';
        ctx.beginPath(); ctx.ellipse(-0.7, 0, 0.18, 0.28, 0, 0, TAU); ctx.fill(); ctx.stroke();
      } else if (r.kind === 'barrel') {
        ctx.fillStyle = '#a33b2b';
        ctx.beginPath(); ctx.ellipse(0, 0, r.rad, r.rad * 1.15, 0, 0, TAU); ctx.fill(); ctx.stroke();
        ctx.strokeStyle = '#e8d2a0';
        ctx.beginPath(); ctx.ellipse(0, 0, r.rad * 0.7, r.rad * 0.82, 0, 0, TAU); ctx.stroke();
      } else {
        ctx.fillStyle = st.ground || '#888';
        ctx.beginPath(); ctx.arc(0, 0, r.rad, 0, TAU); ctx.fill(); ctx.stroke();
        ctx.strokeStyle = st.groundDark || '#333';
        ctx.beginPath(); ctx.moveTo(-0.2, 0.1); ctx.lineTo(0.15, -0.05); ctx.lineTo(0.05, 0.2); ctx.stroke();
      }
      ctx.restore();
    }
  }
  function drawTrailer(w) {
    const tr = w.trailer;
    if (!tr) return;
    const cos = Math.cos(tr.a), sin = Math.sin(tr.a);
    if (tr.attached) {
      const h = hitchPoint(w);
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 0.06;
      ctx.beginPath();
      ctx.moveTo(h.x, h.y);
      ctx.lineTo(tr.x + cos * 0.7, tr.y + sin * 0.7);
      ctx.stroke();
    }
    ctx.save();
    ctx.translate(tr.x, tr.y);
    ctx.rotate(tr.a);
    ctx.fillStyle = '#6a4a32';
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 0.05;
    roundRect(ctx, -0.75, -0.05, 1.5, 0.7, 0.08);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#c48a3a';
    ctx.fillRect(-0.55, 0.28, 1.1, 0.1);
    ctx.restore();
    for (const lx of [-0.5, 0.5]) {
      const ly = -0.34;
      drawWheel(ctx, tr.x + lx * cos - ly * sin, tr.y + lx * sin + ly * cos, 0.28, tr.ang || 0, w.def);
    }
  }
  function drawGhostCar(w) {
    const play = w.ghost && w.ghost.play;
    if (!play || state === 'menu') return;
    const n = (play.length / 3) | 0;
    if (n < 2) return;
    const x = w.body.x;
    const lastX = play[(n - 1) * 3] / 10;
    if (x > lastX) {
      if (!w.ghost.beaten && state === 'play') {
        w.ghost.beaten = true;
        floater('Ghost beaten!', W / 2, H * 0.26, 'bonus');
      }
      return;
    }
    let lo = 0, hi = n - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (play[mid * 3] / 10 < x) lo = mid + 1;
      else hi = mid;
    }
    const i1 = lo, i0 = Math.max(0, i1 - 1);
    const x0 = play[i0 * 3] / 10, x1 = play[i1 * 3] / 10;
    const u = x1 > x0 ? clamp((x - x0) / (x1 - x0), 0, 1) : 0;
    const y = (play[i0 * 3 + 1] / 10) * (1 - u) + (play[i1 * 3 + 1] / 10) * u;
    const a = (play[i0 * 3 + 2] / 100) * (1 - u) + (play[i1 * 3 + 2] / 100) * u;
    const cos = Math.cos(a), sin = Math.sin(a);
    const ghost = {
      body: { x, y, a, vx: 0, vy: 0, va: 0 },
      def: w.def, stage: w.stage, carBroken: false, crashed: false, airborne: false,
      rescue: { carried: false },
      wheels: w.wheels.map((wh) => ({
        lx: wh.lx, ly: wh.ly, r: wh.r, ang: 0,
        x: x + wh.lx * cos - wh.ly * sin,
        y: y + wh.lx * sin + wh.ly * cos,
      })),
    };
    ctx.save();
    ctx.globalAlpha = 0.35;
    drawCar(ctx, ghost);
    ctx.restore();
  }
  function drawNitroFlame(c, def) {
    const ex = def.exhaust;
    let x = ex && ex.x < -0.2 ? ex.x : -1.6;
    let y = ex && ex.x < -0.2 ? ex.y : 0;
    if (!(ex && ex.x < -0.2) && def.hull) {
      for (const p of def.hull) if (p[0] < x) x = p[0];
    }
    const dir = x <= 0.2 ? -1 : 1;
    const len = 0.5 + Math.random() * 0.5;
    c.fillStyle = '#ff9a2a';
    c.beginPath();
    c.moveTo(x, y + 0.12); c.lineTo(x, y - 0.12); c.lineTo(x + dir * len, y); c.closePath();
    c.fill();
    c.fillStyle = '#fff6c8';
    c.beginPath();
    c.moveTo(x, y + 0.05); c.lineTo(x, y - 0.05); c.lineTo(x + dir * len * 0.45, y); c.closePath();
    c.fill();
  }
  function passengerDef(def) {
    if (def && def.seat && def.head && def.hand) return def;
    return Object.assign({}, def, {
      noDriver: false,
      head: (def && def.head) || { x: -0.2, y: 0.9, r: 0.4 },
      seat: (def && def.seat) || { x: -0.3, y: 0.25 },
      hand: (def && def.hand) || { x: 0.35, y: 0.55 },
    });
  }
  function drawPassengerPart(c, def, drv, part) {
    c.save();
    c.translate(-0.45, 0.02);
    c.scale(0.85, 0.85);
    const pd = passengerDef(def);
    if (part === 'lower') drawDriverLower(c, pd, drv, true);
    else drawDriverUpper(c, pd, drv, true);
    c.restore();
  }
  function drawDecal(c, def) {
    const kind = def && def.decal;
    if (!kind || kind === 'none' || !def.hull || !def.hull.length) return;
    let minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9;
    for (const p of def.hull) {
      if (p[0] < minX) minX = p[0];
      if (p[0] > maxX) maxX = p[0];
      if (p[1] < minY) minY = p[1];
      if (p[1] > maxY) maxY = p[1];
    }
    const y = minY + (maxY - minY) * 0.35;
    const x0 = minX + (maxX - minX) * 0.22;
    const x1 = maxX - (maxX - minX) * 0.18;
    c.save();
    if (kind === 'stripe') {
      c.fillStyle = 'rgba(255,255,255,0.92)';
      c.fillRect(x0, y - 0.05, Math.max(0.2, x1 - x0), 0.1);
    } else if (kind === 'flame') {
      const span = Math.max(0.3, x1 - x0);
      c.fillStyle = '#ff7a1a';
      c.beginPath();
      c.moveTo(x0, y);
      c.lineTo(x0 + span * 0.45, y + 0.16);
      c.lineTo(x0 + span * 0.28, y);
      c.lineTo(x0 + span * 0.72, y - 0.18);
      c.lineTo(x0 + span * 0.5, y);
      c.lineTo(x1, y + 0.04);
      c.closePath();
      c.fill();
    } else if (kind === 'star') {
      starBadge(c, (x0 + x1) / 2, y, Math.min(0.28, Math.max(0.12, (maxY - minY) * 0.2)));
    }
    c.restore();
  }
  function ensurePaint(vid) {
    if (!save.paint || typeof save.paint !== 'object') save.paint = {};
    if (!save.paint[vid]) save.paint[vid] = { color: '', decal: 'none', owned: ['d:none'] };
    const p = save.paint[vid];
    if (!p.owned) p.owned = ['d:none'];
    if (!p.owned.includes('d:none')) p.owned.push('d:none');
    if (!p.decal) p.decal = 'none';
    return p;
  }
  function buyPaint(vid, kind, value) {
    const p = ensurePaint(vid);
    const key = (kind === 'color' ? 'c:' : 'd:') + value;
    const cost = kind === 'color' ? 500 : (value === 'none' ? 0 : 800);
    const have = cost === 0 || p.owned.includes(key);
    if (!have) {
      if (save.coins < cost) return;
      save.coins -= cost;
      p.owned.push(key);
      sfxCoin(25);
    }
    if (kind === 'color') p.color = value;
    else p.decal = value;
    persist();
    renderGarage();
  }
  function renderPaintShop(vid) {
    const list = $('upgrade-list');
    if (!list) return;
    const p = (save.paint && save.paint[vid]) || { color: '', decal: 'none', owned: ['d:none'] };
    const owned = p.owned || ['d:none'];
    const row = document.createElement('div');
    row.className = 'upg';
    const swatches = PAINT_COLORS.map((col) => {
      const have = owned.includes('c:' + col);
      const on = p.color === col;
      const disabled = !have && save.coins < 500;
      return `<button type="button" class="swatch${on ? ' on' : ''}" data-color="${col}" style="background:${col}" title="${have ? 'Owned' : '500 coins'}" ${disabled ? 'disabled' : ''}></button>`;
    }).join('');
    row.innerHTML = `<div class="upg-main"><div><div class="upg-name">Paint</div><div class="upg-desc">Body color, 500 coins. Stats stay the same.</div><div class="paint-swatches">${swatches}</div></div></div>`;
    list.appendChild(row);
    const row2 = document.createElement('div');
    row2.className = 'upg';
    const decals = PAINT_DECALS.map((d) => {
      const have = d.id === 'none' || owned.includes('d:' + d.id);
      const on = (p.decal || 'none') === d.id;
      const disabled = !have && save.coins < 800;
      return `<button type="button" class="decal-pick${on ? ' on' : ''}" data-decal="${d.id}" ${disabled ? 'disabled' : ''}>${d.name}${have ? '' : ' 800'}</button>`;
    }).join('');
    row2.innerHTML = `<div class="upg-main"><div><div class="upg-name">Decal</div><div class="upg-desc">Hull sticker, 800 coins. None is free.</div><div class="decal-picks">${decals}</div></div></div>`;
    list.appendChild(row2);
    row.querySelectorAll('[data-color]').forEach((btn) => {
      btn.addEventListener('click', () => buyPaint(vid, 'color', btn.getAttribute('data-color')));
    });
    row2.querySelectorAll('[data-decal]').forEach((btn) => {
      btn.addEventListener('click', () => buyPaint(vid, 'decal', btn.getAttribute('data-decal')));
    });
  }

  // ================= GAME STATE =================
  let state = 'menu';
  let match = null;
  function menuVehIndexForSave() {
    const list = menuVehicleList();
    let id = save.veh;
    if (UNBREAKABLE_IDS.includes(id)) id = UNBREAKABLE_MENU_ANCHOR;
    const i = list.findIndex((v) => v.id === id);
    return Math.max(0, i >= 0 ? i : 0);
  }
  let vIdx = menuVehIndexForSave();
  let sIdx = Math.max(0, STAGES.findIndex((s) => s.id === save.stage));
  const selDef = () => menuVehicleList()[vIdx] || VEHICLES[0];
  const selRideDef = () => {
    const base = selDef();
    if (base.id === UNBREAKABLE_MENU_ANCHOR && ownsUnbreakableSet()) return resolvedDef(base);
    return base;
  };
  const selStage = () => STAGES[sIdx];
  const rocketDef = () => VEHICLES.find((v) => v.id === 'rocket');
  function stageVehicle(def, st) {
    return st.id === 'space' ? rocketDef() : def;
  }
  let garageFrom = 'menu';
  let testRide = false;

  function showScreens(...ids) {
    for (const id of ['menu', 'garage', 'pause', 'gameover', 'hud']) $(id).classList.toggle('hidden', !ids.includes(id));
  }

  function startRun() {
    if (match) return;
    const def = selDef();
    let st = selStage();
    const rideBase = selRideDef();
    const ride = stageVehicle(rideBase, st);
    const spaceGuest = st.id === 'space' && !save.vehicles.rocket;
    const ubOwned = def.id === UNBREAKABLE_MENU_ANCHOR ? ownsUnbreakableSet() : !!save.vehicles[def.id];
    const ownVeh = ubOwned || !!save.vehicles[ride.id] || spaceGuest;
    const ownStage = !!save.stages[st.id];
    if (!testRide && (!ownVeh || !ownStage)) return;
    if (!testRide) {
      if (ownVeh && !spaceGuest) {
        if (def.id === UNBREAKABLE_MENU_ANCHOR) save.veh = ride.id;
        else if (ride.id === def.id) save.veh = ride.id;
      }
      if (ownStage) save.stage = st.id;
      persist();
    }
    newWorld(ride, st);
    loadGhost(world);
    if (!isJetCar(ride) && Math.random() < 1 / 3) attachTrailer(world);
    syncCloakUi();
    $('floaters').innerHTML = '';
    const best = bestOf(st.id, isUnbreakable(ride) ? UNBREAKABLE_MENU_ANCHOR : ride.id);
    $('best-label').textContent = testRide ? 'test ride' : (best ? `best ${formatDistance(best)} m` : '');
    state = 'play'; acc = 0;
    showScreens('hud');
    if (testRide) floater('Test ride!', W / 2, H * 0.32, 'bonus');
    else if (st.id === 'space') floater('Rocket Car!', W / 2, H * 0.32, 'bonus');
    if (world.trailer) floater('Trailer on. C to cut.', W / 2, H * 0.4, 'bonus');
  }

  function headWorldPos(w) {
    const b = w.body, def = w.def;
    const cos = Math.cos(b.a), sin = Math.sin(b.a);
    return {
      x: b.x + def.head.x * cos - def.head.y * sin,
      y: b.y + def.head.x * sin + def.head.y * cos,
    };
  }

  function spawnBlood(x, y, count, burst) {
    const w = world, b = w.body;
    const shades = ['190,25,35', '150,15,25', '220,45,55', '115,8,18'];
    const mul = burst || 1;
    for (let i = 0; i < count; i++) {
      const a = Math.random() * TAU;
      const sp = (1.8 + Math.random() * 4.5) * mul;
      const life = 0.55 + Math.random() * 1.1;
      w.particles.push({
        x: x + (Math.random() - 0.5) * 0.2,
        y: y + (Math.random() - 0.5) * 0.2,
        vx: Math.cos(a) * sp + b.vx * 0.25,
        vy: Math.sin(a) * sp * 0.55 + 1.2 + Math.random() * 2.5 + b.vy * 0.2,
        life,
        max: life,
        r: 0.035 + Math.random() * 0.09,
        c: shades[(Math.random() * shades.length) | 0],
        kind: 'blood',
      });
    }
  }

  function crash() {
    if (isImmortal(world.def)) return;
    world.crashed = true; world.crashTimer = 0;
    state = 'crashing';
    floater('Bonk!', W / 2, H * 0.4, 'bad');
    sfxCrash();
    const hp = headWorldPos(world);
    spawnBlood(hp.x, hp.y, 32, 1.35);
    if (match && match.active) reportMatchOut('crash');
  }

  function recordBonus(dist, prev) {
    if (prev <= 0 || dist <= prev) return 0;
    return Math.min(300, (dist - prev) * 2);
  }
  function bankCoins() {
    const dist = Math.floor(world.maxX);
    const sid = world.stage.id;
    const vid = isUnbreakable(world.defBase) ? UNBREAKABLE_MENU_ANCHOR : world.defBase.id;
    const prev = bestOf(sid, vid);
    if (testRide) return { dist, prev, bonus: 0 };
    if (world.trailer && world.trailer.attached && !world.crashed) {
      world.coins += dist * 2;
      markGoal('haul');
    }
    claimGoalBonus();
    const bonus = recordBonus(dist, prev);
    if (bonus > 0) world.coins += bonus;
    if (dist > prev) storeGhost(sid, vid);
    save.coins += world.coins;
    if (dist > prev) {
      const b = save.best[sid];
      if (!b || typeof b === 'number') save.best[sid] = {};
      save.best[sid][vid] = dist;
    }
    persist();
    return { dist, prev, bonus };
  }

  function endRun(reason) {
    if (match && match.active) {
      matchSpectate(reason);
      return;
    }
    if (state === 'over') return;
    state = 'over';
    const { dist, prev, bonus } = bankCoins();
    $('go-title').textContent = reason.title;
    $('go-reason').textContent = testRide ? `${reason.text} Coins and records are not saved.` : reason.text;
    $('go-dist').textContent = `${dist} m`;
    $('go-coins').textContent = testRide ? 'Not saved' : world.coins;
    const rescuesEl = $('go-rescues');
    if (rescuesEl) rescuesEl.textContent = String(world.rescue ? world.rescue.delivered : 0);
    fillGoalRow($('go-goals'), world.stage.id);
    $('go-best-label').textContent = `${world.defBase.name} best`;
    $('go-best').textContent = `${testRide ? prev : Math.max(dist, prev)} m`;
    $('go-newbest').textContent = bonus > 0 ? `New record! +${bonus}` : 'New record!';
    $('go-newbest').classList.toggle('hidden', testRide || !(dist > prev && dist > 0));
    showScreens('gameover');
  }

  function goMenu() {
    const hadMatch = !!(match && match.active);
    match = null;
    if (hadMatch) postMatch({ type: 'leave' });
    testRide = false;
    state = 'menu';
    newWorld(stageVehicle(selRideDef(), selStage()), selStage());
    refreshMenu();
    showScreens('menu');
  }

  function pause() { if (state === 'play') { state = 'pause'; showScreens('hud', 'pause'); } }
  function resume() { if (state === 'pause') { state = 'play'; acc = 0; showScreens('hud'); } }

  function postStep(dt) {
    const w = world, b = w.body;
    const playing = state === 'play';
    w.maxX = Math.max(w.maxX, b.x);
    ensurePickups(w.T, b.x + 150);

    if (playing || state === 'crashing') {
      for (const p of w.T.pickups) {
        if (p.taken || p.x < b.x - 4 || p.x > b.x + 4) continue;
        const reach = p.arc ? 2 : 1.4;
        let near = Math.hypot(p.x - b.x, p.y - b.y) < reach;
        if (!near) for (const wh of w.wheels) if (Math.hypot(p.x - wh.x, p.y - wh.y) < wh.r + 0.6) { near = true; break; }
        if (!near) continue;
        p.taken = true;
        const sp = toScreen(p.x, p.y);
        if (p.type === 'coin' || p.type === 'veg') { w.coins += p.v; floater(`+${p.v}`, sp.x, sp.y); sfxCoin(p.v); }
        else if (p.type === 'nitro') { w.nitro.t = 2; floater('NITRO!', sp.x, sp.y, 'bonus'); sfxBonus(); }
        else { w.fuel = 1; w.lowWarned = false; w.outWarned = false; floater('Fuel!', sp.x, sp.y, 'bonus'); sfxFuel(); }
      }
    }

    const speed = Math.hypot(b.vx, b.vy);
    if (match && match.active && playing && !w.crashed && !isImmortal(w.def)) {
      if (input.gas || speed > 0.35) w.fuel = Math.max(0, w.fuel - dt / Math.max(8, w.car.tank || 30));
      if (w.fuel <= 0 && match.alive) endRun({ title: 'Out of fuel!', text: 'The tank ran dry.' });
    }
    const sinkActive = w.sinking || w.sinkOnBed || w.sinkBoom;
    if (playing && !w.crashed) {
      if (!w.sinking && tryStartGapSink(w)) {
        w.sinking = true;
        w.sinkTime = 0;
        w.sinkBedTime = 0;
        w.sinkLanded = false;
        w.sinkBedWarned = false;
        const g0 = gapContaining(w.T, b.x);
        if (g0) w.sinkGap = { start: g0.start, end: g0.end };
      }
    }
    if (playing && sinkActive) {
      if (w.sinkBoom) {
        w.sinkTime += dt;
        if (w.sinkTime >= SINK_BOOM_DELAY && !isUnbreakable(w.def)) endRun(gapSinkOutcome(w.stage));
      } else if (w.sinkOnBed) {
        w.sinkBedTime += dt;
        w.sinkTime += dt;
        const bubbleCol = gapSinkBubbleColor(w.stage);
        const bubbleRate = 14 + w.sinkBedTime * 5;
        if (Math.random() < dt * bubbleRate) {
          w.particles.push({
            x: b.x + (Math.random() - 0.5) * 1.4,
            y: b.y + (Math.random() - 0.5) * 0.4,
            vx: (Math.random() - 0.5) * 0.45,
            vy: 1.2 + Math.random() * 1.8,
            life: 0.45 + Math.random() * 0.2,
            max: 0.55,
            r: 0.05 + Math.random() * 0.09,
            c: bubbleCol,
          });
        }
        if (!w.sinkBedWarned && w.sinkBedTime >= SINK_BED_DELAY - 1.2) {
          w.sinkBedWarned = true;
          floater('Something\'s brewing…', W / 2, H * 0.3, 'bad');
          tone(220, 0, 0.35, 'sine', 0.06);
        }
        if (w.sinkBedTime >= SINK_BED_DELAY) gapSinkBottomExplode(w);
      } else if (w.sinking) {
        w.sinkTime += dt;
        forceGapBedIfStuck(w);
        const bubbleCol = gapSinkBubbleColor(w.stage);
        if (Math.random() < dt * 18) {
          w.particles.push({
            x: b.x + (Math.random() - 0.5) * 1.2,
            y: b.y + (Math.random() - 0.5) * 0.4,
            vx: (Math.random() - 0.5) * 0.4,
            vy: 1.2 + Math.random() * 1.5,
            life: 0.5,
            max: 0.5,
            r: 0.06 + Math.random() * 0.08,
            c: bubbleCol,
          });
        }
      }
    }
    if (state === 'play' && !w.crashed) {
      const mark = Math.floor(w.maxX / 100) * 100;
      if (mark >= 100 && mark > w.distPaid) {
        const amt = ((mark - w.distPaid) / 100) * 25;
        w.distPaid = mark;
        w.coins += amt;
        floater(`+${amt}`, W / 2, H * 0.24, 'bonus');
        sfxCoin(amt);
      }
    }
    if (state === 'play') {
      const upside = Math.cos(b.a) < -0.3;
      w.stuckTimer = upside && speed < 0.5 ? w.stuckTimer + dt : 0;
      if (w.stuckTimer > 3 && !isUnbreakable(w.def)) endRun({ title: 'Stuck!', text: 'Upside down and going nowhere.' });
    }
    if (state === 'crashing') {
      w.crashTimer += dt;
      if (Math.random() < dt * 14) {
        const hp = headWorldPos(w);
        spawnBlood(hp.x, hp.y - w.def.head.r * 0.15, 1, 0.4);
      }
      if (w.crashTimer > 1.6) endRun({ title: 'Crashed!', text: 'Brennan bonked his head.' });
    }

    spawnParticles(dt, playing && input.gas && w.fuel > 0 && !(isGhostUnbreakable(w.def) && input.stealthHold));
    spawnUnbreakableJetParticles(dt, w);
    updateParticles(dt);

    const cam = w.cam;
    const gy = rideHeight(w.T, b.x);
    const airH = Math.max(0, b.y - gy);
    const sinkCam = w.sinking || w.sinkOnBed || w.sinkBoom;
    const pit = sinkCam ? (w.sinkGap || gapContaining(w.T, b.x)) : gapNearby(w.T, b.x);
    let target = baseScale() / (1 + Math.min(speed, MAX_VX) * 0.012);
    if (pit) {
      const fit = H / (2 * (GAP_WATER_DEPTH + 6.5));
      if (target > fit) target = fit;
    }
    const bounds = vehicleViewBounds(w);
    const lead = clamp(b.vx, -20, 30) * 0.3;
    const framePadX = 0.1, framePadY = 0.16;
    function aimAt(s) {
      const hh = H / (2 * s);
      const tx = b.x + lead + (W / s) * 0.1;
      const tAir = clamp(airH / 4, 0, 1);
      const camCarY = b.y + (sinkCam ? 0.15 : 0.8);
      const camGroundY = gy + hh * 0.42;
      let ty = camCarY + (camGroundY - camCarY) * (sinkCam ? 0.08 : tAir);
      if (pit) {
        const bedY = gy - GAP_WATER_DEPTH;
        const framed = bedY + hh * 0.55;
        ty = sinkCam ? camCarY * 0.35 + framed * 0.65 : ty * 0.45 + framed * 0.55;
      }
      const maxCamY = gy + hh - (pit ? 0.2 : 1.5);
      if (ty > maxCamY) ty = maxCamY;
      return { tx, ty, hh, hw: W / (2 * s) };
    }
    function carFits(s, padX, padY) {
      const a = aimAt(s);
      return bounds.minX >= a.tx - a.hw * (1 - padX)
        && bounds.maxX <= a.tx + a.hw * (1 - padX)
        && bounds.minY >= a.ty - a.hh * (1 - padY)
        && bounds.maxY <= a.ty + a.hh * (1 - padY);
    }
    const keepCar = !sinkCam && (w.airborne || airH > 1.2 || !carFits(target, 0.02, 0.02));
    if (keepCar && !carFits(target, framePadX, framePadY)) {
      let lo = 0.05, hi = target;
      if (carFits(lo, framePadX, framePadY)) {
        for (let i = 0; i < 16; i++) {
          const mid = (lo + hi) * 0.5;
          if (carFits(mid, framePadX, framePadY)) lo = mid;
          else hi = mid;
        }
        target = lo;
      } else target = lo;
    }
    if (cam.trackS == null) cam.trackS = cam.s;
    const zoomOut = target < cam.trackS - 0.01;
    cam.trackS += (target - cam.trackS) * Math.min(1, dt * (zoomOut ? 7 : (pit ? 2.4 : 1.5)));
    const aim = aimAt(cam.trackS);
    cam.x += (aim.tx - cam.x) * Math.min(1, dt * (sinkCam ? 3.2 : (zoomOut ? 8 : 5)));
    cam.y += (aim.ty - cam.y) * Math.min(1, dt * (sinkCam ? 4.5 : (zoomOut ? 7 : 3.5)));
    let viewS = cam.trackS;
    if (!sinkCam) {
      const edgeX = 1 - framePadX, edgeY = 1 - framePadY;
      const needHh = Math.max((bounds.maxY - cam.y) / edgeY, (cam.y - bounds.minY) / edgeY);
      const needHw = Math.max((bounds.maxX - cam.x) / edgeX, (cam.x - bounds.minX) / edgeX);
      let fitS = Infinity;
      if (needHh > 0.001) fitS = Math.min(fitS, H / (2 * needHh));
      if (needHw > 0.001) fitS = Math.min(fitS, W / (2 * needHw));
      if (fitS < viewS) viewS = fitS;
    }
    cam.s = viewS;
    w.boomShakeX = 0;
    w.boomShakeY = 0;
    if (w.sinkOnBed && !w.sinkBoom) {
      const t = w.sinkBedTime / SINK_BED_DELAY;
      const mag = t > 0.55 ? (t - 0.55) * 0.06 : 0;
      w.boomShakeX = Math.sin(w.sinkBedTime * 44) * mag;
      w.boomShakeY = Math.cos(w.sinkBedTime * 38) * mag * 0.6;
    }
    if (w.sinkBoom && w.sinkTime < 1.05) {
      const mag = (1 - w.sinkTime / 1.05) * 1.15;
      w.boomShakeX = Math.sin(w.sinkTime * 98) * mag;
      w.boomShakeY = Math.cos(w.sinkTime * 86) * mag * 0.7;
    }

    let rpm = 0, n = 0;
    for (const wh of w.wheels) if (wh.drive) { rpm += Math.abs(wh.w) / (w.car.maxSpeed / wh.r); n++; }
    rpm = clamp(rpm / Math.max(1, n), 0, 1);
    setEngine(rpm, playing || state === 'crashing', playing && input.gas && w.fuel > 0);
    enforceSpeedCap(b, w.wheels);
    updateExtras(dt);
    if (state !== 'menu') updateHud(rpm);
  }

  // ================= PARTICLES =================
  function spawnParticles(dt, gasOn) {
    const w = world, b = w.body;
    for (const wh of w.wheels) {
      if (!wh.contact) continue;
      const amt = Math.abs(wh.slip) > 2 ? 1 : Math.abs(wh.vx) > 4 ? 0.3 : 0;
      if (amt && Math.random() < amt * dt * 40) {
        w.particles.push({ x: wh.x - Math.sign(wh.vx || 1) * wh.r * 0.6, y: wh.y - wh.r * 0.8,
          vx: -wh.vx * 0.15 + (Math.random() - 0.5), vy: 1 + Math.random() * 1.5,
          life: 0.7, max: 0.7, r: 0.15 + Math.random() * 0.2, c: w.stage.dust });
      }
    }
    const ex = w.def.exhaust;
    if (gasOn && ex && Math.random() < dt * 25) {
      const cos = Math.cos(b.a), sin = Math.sin(b.a);
      w.particles.push({ x: b.x + ex.x * cos - ex.y * sin, y: b.y + ex.x * sin + ex.y * cos,
        vx: b.vx * 0.5 - cos * 1.5, vy: b.vy * 0.5 + 0.6, life: 0.6, max: 0.6, r: 0.12, c: '90,90,90' });
    }
    trimDust(w);
  }
  function blastKind(kind) {
    return kind === 'boom' || kind === 'boomCore' || kind === 'spark' || kind === 'boomRing'
      || kind === 'shock' || kind === 'smoke' || kind === 'debris' || kind === 'glob' || kind === 'blood';
  }
  function trimDust(w) {
    const ps = w.particles;
    let dust = 0;
    for (let i = 0; i < ps.length; i++) if (!blastKind(ps[i].kind)) dust++;
    let extra = dust - 620;
    for (let i = 0; i < ps.length && extra > 0; i++) {
      if (!blastKind(ps[i].kind)) { ps.splice(i, 1); i--; extra--; }
    }
  }
  function updateParticles(dt) {
    const ps = world.particles, T = world.T;
    for (let i = ps.length - 1; i >= 0; i--) {
      const p = ps[i];
      p.life -= dt * (p.ground ? 0.35 : 1);
      if (p.life <= 0) { ps.splice(i, 1); continue; }
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.kind === 'blood') {
        p.vy -= 16 * dt;
        p.vx *= 1 - Math.min(1, dt * 1.2);
        if (!p.ground) {
          const gy = hAt(T, p.x);
          if (p.y <= gy + p.r * 0.4) {
            p.y = gy + p.r * 0.25;
            p.vx *= 0.15;
            p.vy = 0;
            p.ground = true;
            p.r += 0.015 + Math.random() * 0.02;
          }
        }
      } else if (p.kind === 'boomCore') {
        p.vy += 2.2 * dt;
        p.vx *= 1 - Math.min(1, dt * 2.2);
        p.r += dt * 3.4;
      } else if (p.kind === 'shock') {
        p.r += dt * 16;
      } else if (p.kind === 'boomRing') {
        p.vy += 0.4 * dt;
        p.vx *= 1 - Math.min(1, dt * 3.5);
        p.r += dt * 2.4;
      } else if (p.kind === 'spark') {
        p.vy += 1.2 * dt;
        p.vx *= 1 - Math.min(1, dt * 1.6);
        p.r += dt * 0.08;
      } else if (p.kind === 'smoke') {
        p.vy += 1.8 * dt;
        p.vx *= 1 - Math.min(1, dt * 0.7);
        p.r += dt * 1.15;
      } else if (p.kind === 'debris') {
        p.vy -= 18 * dt;
        p.vx *= 1 - Math.min(1, dt * 0.35);
        p.rot = (p.rot || 0) + (p.vr || 0) * dt;
      } else if (p.kind === 'glob') {
        p.vy -= 14 * dt;
        p.vx *= 1 - Math.min(1, dt * 0.5);
        p.r += dt * 0.04;
      } else if (p.kind === 'boom') {
        p.vy += 4.2 * dt;
        p.vx *= 1 - Math.min(1, dt * 1.4);
        p.r += dt * 0.7;
      } else {
        p.vy -= 0.5 * dt;
        p.r += dt * 0.4;
      }
    }
  }

  // ================= RENDER =================
  function toScreen(x, y) {
    const c = world.cam;
    return { x: W / 2 + (x - c.x) * c.s, y: H / 2 - (y - c.y) * c.s };
  }

  function farRidge(shift, color, base, amp) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, H);
    for (let x = 0; x <= W + 24; x += 18) {
      const y = H * base + Math.sin((x + shift) * 0.008) * amp + Math.sin((x + shift) * 0.021 + 2) * amp * 0.45;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(W, H);
    ctx.closePath();
    ctx.fill();
  }

  function skyClouds(shift) {
    ctx.fillStyle = 'rgba(255,255,255,0.78)';
    const ox = -((shift * 0.55) % 280);
    for (let i = -1; i < 6; i++) {
      const x = ox + i * 280;
      const y = H * (0.14 + (Math.abs(i) % 3) * 0.055);
      ctx.beginPath();
      ctx.arc(x, y, 26, 0, TAU);
      ctx.arc(x + 24, y + 4, 20, 0, TAU);
      ctx.arc(x + 46, y - 2, 16, 0, TAU);
      ctx.fill();
    }
  }

  function drawElizabethTower(c, cx, baseY, scale, opts) {
    opts = opts || {};
    const s = scale;
    const lw = Math.max(1, 1.8 * s);
    const shaftH = 105 * s;
    const wBot = 20 * s;
    const wMid = 17 * s;
    const wTop = 14 * s;
    const yBot = baseY;
    const yShaftTop = yBot - shaftH;
    c.save();
    c.lineJoin = 'round';
    c.fillStyle = '#8f7a5c';
    c.beginPath();
    c.moveTo(cx - wBot / 2, yBot);
    c.lineTo(cx - wMid / 2, yShaftTop + 42 * s);
    c.lineTo(cx - wTop / 2, yShaftTop + 18 * s);
    c.lineTo(cx, yShaftTop);
    c.lineTo(cx, yBot);
    c.closePath();
    c.fill();
    c.fillStyle = '#c4b08a';
    c.beginPath();
    c.moveTo(cx, yShaftTop);
    c.lineTo(cx + wTop / 2, yShaftTop + 18 * s);
    c.lineTo(cx + wMid / 2, yShaftTop + 42 * s);
    c.lineTo(cx + wBot / 2, yBot);
    c.lineTo(cx, yBot);
    c.closePath();
    c.fill();
    c.strokeStyle = '#2a2418';
    c.lineWidth = lw;
    c.beginPath();
    c.moveTo(cx - wBot / 2, yBot);
    c.lineTo(cx - wMid / 2, yShaftTop + 42 * s);
    c.lineTo(cx - wTop / 2, yShaftTop + 18 * s);
    c.lineTo(cx, yShaftTop);
    c.lineTo(cx + wTop / 2, yShaftTop + 18 * s);
    c.lineTo(cx + wMid / 2, yShaftTop + 42 * s);
    c.lineTo(cx + wBot / 2, yBot);
    c.closePath();
    c.stroke();
    c.strokeStyle = 'rgba(42,36,24,0.35)';
    c.lineWidth = Math.max(0.5, s);
    for (let g = 0; g < 5; g++) {
      const gx = cx - wBot * 0.35 + g * wBot * 0.17;
      c.beginPath();
      c.moveTo(gx, yBot - 8 * s);
      c.lineTo(gx - 1 * s, yShaftTop + 25 * s);
      c.stroke();
    }
    c.fillStyle = '#1a2030';
    for (let w = 0; w < 3; w++) {
      const wy = yShaftTop + 55 * s + w * 14 * s;
      c.fillRect(cx - 2.5 * s, wy, 5 * s, 10 * s);
    }
    const yBel = yShaftTop + 12 * s;
    const belH = 22 * s;
    const belW = 26 * s;
    c.fillStyle = '#b8a078';
    c.fillRect(cx - belW / 2, yBel - belH, belW, belH);
    c.fillStyle = '#9a8868';
    c.fillRect(cx - belW / 2, yBel - belH, belW * 0.35, belH);
    c.strokeStyle = '#2a2418';
    c.lineWidth = lw;
    c.strokeRect(cx - belW / 2, yBel - belH, belW, belH);
    c.strokeStyle = '#3a3228';
    c.lineWidth = Math.max(0.8, 1.2 * s);
    for (let a = 0; a < 4; a++) {
      const ax = cx - belW * 0.32 + a * belW * 0.21;
      c.beginPath();
      c.moveTo(ax, yBel - 4 * s);
      c.quadraticCurveTo(ax + 2 * s, yBel - belH + 4 * s, ax + 4 * s, yBel - 4 * s);
      c.stroke();
    }
    const yClk = yBel - belH - 28 * s;
    const clkR = 14 * s;
    const frame = clkR + 5 * s;
    c.fillStyle = '#b8a078';
    c.fillRect(cx - frame, yClk - frame, frame * 2, frame * 2);
    c.fillStyle = '#234a6e';
    c.beginPath();
    c.arc(cx, yClk, clkR, 0, TAU);
    c.fill();
    c.strokeStyle = '#d4af37';
    c.lineWidth = Math.max(1, 1.5 * s);
    c.beginPath();
    c.arc(cx, yClk, clkR, 0, TAU);
    c.stroke();
    c.strokeStyle = 'rgba(230,240,255,0.35)';
    c.lineWidth = Math.max(0.5, s * 0.6);
    c.beginPath();
    c.arc(cx, yClk, clkR * 0.82, 0, TAU);
    c.stroke();
    c.strokeStyle = '#d4af37';
    c.lineWidth = Math.max(1, 1.8 * s);
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(cx, yClk);
    c.lineTo(cx - clkR * 0.35, yClk - clkR * 0.55);
    c.stroke();
    c.lineWidth = Math.max(0.8, 1.3 * s);
    c.beginPath();
    c.moveTo(cx, yClk);
    c.lineTo(cx + clkR * 0.5, yClk - clkR * 0.45);
    c.stroke();
    c.fillStyle = '#d4af37';
    c.beginPath();
    c.arc(cx, yClk, 1.8 * s, 0, TAU);
    c.fill();
    const yLan = yClk - frame - 8 * s;
    c.fillStyle = '#3a3a42';
    c.fillRect(cx - 8 * s, yLan - 14 * s, 16 * s, 14 * s);
    c.fillStyle = '#5a5a62';
    c.fillRect(cx - 6 * s, yLan - 12 * s, 4 * s, 10 * s);
    for (const px of [-7, 7]) {
      c.fillStyle = '#2a2830';
      c.beginPath();
      c.moveTo(cx + px * s - 2 * s, yLan - 14 * s);
      c.lineTo(cx + px * s, yLan - 20 * s);
      c.lineTo(cx + px * s + 2 * s, yLan - 14 * s);
      c.fill();
    }
    c.fillStyle = '#35353c';
    c.beginPath();
    c.moveTo(cx - 9 * s, yLan - 14 * s);
    c.lineTo(cx, yLan - 38 * s);
    c.lineTo(cx + 9 * s, yLan - 14 * s);
    c.closePath();
    c.fill();
    c.strokeStyle = '#2a2418';
    c.lineWidth = lw;
    c.stroke();
    c.fillStyle = '#c9a227';
    c.beginPath();
    c.arc(cx, yLan - 38 * s, 2.5 * s, 0, TAU);
    c.fill();
    if (opts.showGlow) {
      c.fillStyle = 'rgba(255,220,140,0.55)';
      c.fillRect(cx - 2 * s, yLan - 28 * s, 4 * s, 5 * s);
    }
    c.strokeStyle = 'rgba(255,255,255,0.15)';
    c.lineWidth = Math.max(0.5, s);
    c.beginPath();
    c.moveTo(cx + wBot * 0.42, yBot - 5 * s);
    c.lineTo(cx + wTop * 0.35, yShaftTop + 30 * s);
    c.stroke();
    c.restore();
  }

  function drawSkyHero(st, cam) {
    const id = st.id;
    const shift = cam.x * 0.15;
    if (id === 'retro') {
      ctx.fillStyle = '#081808';
      for (let i = 0; i < 5; i++) ctx.fillRect((i * 70 - (shift % 70)), H * 0.62, 28, H * 0.38);
      ctx.fillStyle = '#0f380f';
      for (let i = 0; i < 4; i++) ctx.fillRect((i * 96 - ((shift * 0.55) % 96)) + 18, H * 0.46, 14, H * 0.2);
      return;
    }
    if (id === 'countryside' || id === 'supercountry' || id === 'seasons') {
      skyClouds(shift);
      farRidge(shift * 0.4, 'rgba(150,200,160,0.35)', 0.5, 16);
      const seasonBand = id === 'seasons' ? Math.floor(Math.max(0, cam.x) / 380) % 4 : 0;
      const ridge = ['rgba(60,160,70,0.5)', 'rgba(210,180,50,0.48)', 'rgba(190,90,30,0.48)', 'rgba(236,244,252,0.6)'][seasonBand];
      farRidge(shift, id === 'seasons' ? ridge : 'rgba(60,168,78,0.5)', 0.64, 34);
    } else if (id === 'forest' || id === 'jungle') {
      if (id === 'forest') skyClouds(shift * 0.3);
      farRidge(shift * 0.4, id === 'jungle' ? 'rgba(8,40,16,0.45)' : 'rgba(40,90,48,0.35)', 0.46, 20);
      farRidge(shift, id === 'jungle' ? 'rgba(10,60,24,0.62)' : 'rgba(16,70,28,0.55)', 0.58, 42);
    } else if (id === 'desert' || id === 'megadesert' || id === 'mars') {
      farRidge(shift * 0.4, id === 'mars' ? 'rgba(90,30,16,0.35)' : 'rgba(230,170,90,0.3)', 0.52, 18);
      farRidge(shift, id === 'mars' ? 'rgba(140,48,22,0.55)' : 'rgba(210,140,60,0.5)', 0.66, id === 'megadesert' ? 58 : 40);
    } else if (id === 'arctic' || id === 'xmas' || id === 'northpole') {
      farRidge(shift * 0.4, 'rgba(190,220,240,0.4)', 0.52, 14);
      farRidge(shift, 'rgba(255,255,255,0.62)', 0.68, 30);
    }
    else if (id === 'beach') {
      skyClouds(shift);
      ctx.fillStyle = 'rgba(20,120,170,0.45)';
      ctx.fillRect(0, H * 0.62, W, H * 0.08);
      ctx.fillStyle = 'rgba(40,180,210,0.7)';
      ctx.fillRect(0, H * 0.68, W, H * 0.14);
      farRidge(shift, 'rgba(240,210,140,0.4)', 0.78, 16);
    } else if (id === 'highway' || id === 'megahighway') {
      ctx.fillStyle = 'rgba(50,60,78,0.28)';
      const bx = -((shift * 0.25) % 70);
      for (let i = -1; i < 16; i++) ctx.fillRect(bx + i * 70, H * (0.38 + (i % 4) * 0.02), 36, H * 0.28);
      ctx.fillStyle = 'rgba(40,50,60,0.45)';
      const ox = -((shift * 0.4) % 220);
      for (let i = -1; i < 6; i++) {
        ctx.fillRect(ox + i * 220, H * 0.42, 70, 10);
        ctx.fillRect(ox + i * 220 + 28, H * 0.42, 8, H * 0.2);
      }
    } else if (id === 'rooftops' || id === 'suburbs') {
      if (id === 'suburbs') skyClouds(shift);
      ctx.fillStyle = id === 'suburbs' ? 'rgba(90,110,140,0.28)' : 'rgba(30,40,55,0.4)';
      const ox = -((shift * 0.35) % 90);
      for (let i = -1; i < 12; i++) ctx.fillRect(ox + i * 90, H * (0.5 + (i % 3) * 0.04), 48, H * 0.5);
    } else if (id === 'moon') {
      farRidge(shift, 'rgba(90,96,110,0.55)', 0.7, 22);
      ctx.fillStyle = '#d8e4f0';
      ctx.beginPath(); ctx.arc(W * 0.18 - shift * 0.05, H * 0.22, Math.min(W, H) * 0.07, 0, TAU); ctx.fill();
      ctx.fillStyle = '#9eb0c4';
      ctx.beginPath(); ctx.arc(W * 0.16 - shift * 0.05, H * 0.2, 8, 0, TAU); ctx.fill();
      ctx.fillStyle = '#7fbf6a';
      ctx.beginPath(); ctx.arc(W * 0.78, H * 0.28, Math.min(W, H) * 0.028, 0, TAU); ctx.fill();
      ctx.fillStyle = '#3a6ea8';
      ctx.beginPath(); ctx.arc(W * 0.772, H * 0.272, Math.min(W, H) * 0.012, 0, TAU); ctx.fill();
    } else if (id === 'alien' || id === 'prognosis') {
      const px = W * 0.22 - shift * 0.04, py = H * 0.2;
      ctx.fillStyle = id === 'alien' ? '#c46bff' : '#7af0ff';
      ctx.beginPath(); ctx.arc(px, py, 28, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.ellipse(px, py, 52, 14, id === 'prognosis' ? -0.5 : 0.3, 0, TAU); ctx.stroke();
    } else if (id === 'rainbow') {
      const cols = ['#ff4d4d', '#ff9f1a', '#ffe14a', '#3ddc6a', '#3aa0ff', '#b06bff'];
      cols.forEach((col, k) => {
        ctx.strokeStyle = col; ctx.globalAlpha = 0.35; ctx.lineWidth = 8;
        ctx.beginPath(); ctx.arc(W * 0.5, H * 0.85, 180 - k * 12, Math.PI, 0); ctx.stroke();
      });
      ctx.globalAlpha = 1;
    } else if (id === 'neon') {
      ctx.strokeStyle = 'rgba(57,243,255,0.18)'; ctx.lineWidth = 1;
      const ox = -((shift) % 40);
      for (let x = ox; x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H * 0.7); ctx.stroke(); }
      ctx.strokeStyle = 'rgba(255,79,216,0.28)';
      for (let y = 20; y < H * 0.7; y += 36) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    } else if (id === 'ragnarok' || id === 'haunted') {
      farRidge(shift, id === 'haunted' ? 'rgba(40,16,60,0.55)' : 'rgba(30,24,28,0.6)', 0.62, 28);
      ctx.fillStyle = id === 'haunted' ? 'rgba(40,20,60,0.35)' : 'rgba(20,16,28,0.4)';
      ctx.fillRect(0, H * 0.18, W, H * 0.16);
      if (id === 'ragnarok') {
        ctx.strokeStyle = 'rgba(230,230,255,0.55)'; ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(W * 0.62, H * 0.08); ctx.lineTo(W * 0.58, H * 0.18); ctx.lineTo(W * 0.66, H * 0.2); ctx.lineTo(W * 0.6, H * 0.32);
        ctx.stroke();
      }
    } else if (id === 'volcano') {
      farRidge(shift, 'rgba(40,16,12,0.7)', 0.58, 36);
      ctx.fillStyle = '#2a120e';
      ctx.beginPath();
      ctx.moveTo(W * 0.72, H * 0.62); ctx.lineTo(W * 0.84, H * 0.28); ctx.lineTo(W * 0.96, H * 0.62); ctx.fill();
      ctx.fillStyle = '#ff6a22';
      ctx.beginPath(); ctx.arc(W * 0.84, H * 0.3, 10, 0, TAU); ctx.fill();
      const vg = ctx.createLinearGradient(0, H * 0.5, 0, H);
      vg.addColorStop(0, 'rgba(255,80,20,0)'); vg.addColorStop(1, 'rgba(255,70,20,0.4)');
      ctx.fillStyle = vg; ctx.fillRect(0, H * 0.5, W, H * 0.5);
    } else if (id === 'arena') {
      skyClouds(shift);
      farRidge(shift, 'rgba(180,150,100,0.35)', 0.66, 18);
      ctx.fillStyle = 'rgba(120,20,28,0.85)';
      ctx.fillRect(0, H * 0.34, W, H * 0.12);
      ctx.fillStyle = 'rgba(180,40,40,0.9)';
      ctx.fillRect(W * 0.22, H * 0.16, W * 0.56, 10);
      ctx.fillStyle = '#f5e27a';
      ctx.fillRect(W * 0.3, H * 0.185, W * 0.12, 6);
      ctx.fillStyle = '#3aa0ff';
      ctx.fillRect(W * 0.52, H * 0.185, W * 0.12, 6);
    } else if (id === 'space') {
      farRidge(shift * 0.35, 'rgba(12,16,28,0.7)', 0.58, 12);
      farRidge(shift, 'rgba(20,24,36,0.85)', 0.72, 22);
    } else if (id === 'bootcamp') {
      farRidge(shift, 'rgba(70,80,40,0.4)', 0.62, 22);
    } else if (id === 'mudpool' || id === 'bogland') {
      farRidge(shift, 'rgba(70,60,30,0.4)', 0.64, 18);
    } else if (id === 'mountain') {
      farRidge(shift * 0.4, 'rgba(180,200,220,0.45)', 0.42, 16);
      farRidge(shift, 'rgba(90,100,110,0.55)', 0.58, 40);
    } else if (id === 'factory' || id === 'nuclear') {
      ctx.fillStyle = id === 'nuclear' ? 'rgba(20,60,30,0.45)' : 'rgba(30,34,40,0.5)';
      const ox = -((shift * 0.3) % 80);
      for (let i = -1; i < 14; i++) {
        ctx.fillRect(ox + i * 80, H * 0.28, 8, H * 0.3);
        ctx.fillRect(ox + i * 80, H * 0.36, 50, 6);
      }
    } else if (id === 'cave' || id === 'arcticcave') {
      ctx.fillStyle = id === 'arcticcave' ? 'rgba(180,220,240,0.12)' : 'rgba(80,50,30,0.18)';
      for (let i = 0; i < 8; i++) ctx.fillRect(i * (W / 7), H * 0.2, 18, H * 0.5);
    } else if (id === 'night') {
      farRidge(shift, 'rgba(8,12,22,0.85)', 0.62, 30);
    } else if (id === 'junkyard' || id === 'action') {
      farRidge(shift, id === 'action' ? 'rgba(80,30,16,0.35)' : 'rgba(60,60,64,0.35)', 0.6, 16);
      ctx.strokeStyle = id === 'action' ? 'rgba(40,20,16,0.7)' : 'rgba(40,42,46,0.7)';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(W * 0.78, H * 0.62); ctx.lineTo(W * 0.9, H * 0.22); ctx.lineTo(W * 0.98, H * 0.34);
      ctx.stroke();
    } else if (id === 'construction') {
      farRidge(shift, 'rgba(180,140,60,0.28)', 0.62, 16);
    } else if (id === 'roller') {
      skyClouds(shift);
      ctx.strokeStyle = 'rgba(180,30,40,0.35)'; ctx.lineWidth = 4;
      const ox = -((shift * 0.3) % 120);
      for (let i = -1; i < 8; i++) {
        ctx.beginPath();
        ctx.moveTo(ox + i * 120, H * 0.7); ctx.lineTo(ox + i * 120 + 20, H * 0.42); ctx.lineTo(ox + i * 120 + 70, H * 0.36); ctx.lineTo(ox + i * 120 + 100, H * 0.7);
        ctx.stroke();
      }
    } else if (id === 'skottland') {
      skyClouds(shift);
      farRidge(shift * 0.22, 'rgba(156,158,148,0.55)', 0.38, 12);
      const mistHi = ctx.createLinearGradient(0, H * 0.32, 0, H * 0.52);
      mistHi.addColorStop(0, 'rgba(214,218,214,0)');
      mistHi.addColorStop(0.6, 'rgba(214,218,214,0.45)');
      mistHi.addColorStop(1, 'rgba(198,204,200,0.2)');
      ctx.fillStyle = mistHi;
      ctx.fillRect(0, H * 0.32, W, H * 0.2);
      farRidge(shift * 0.45, 'rgba(92,104,70,0.82)', 0.5, 22);
      ctx.fillStyle = '#1a4550';
      ctx.fillRect(0, H * 0.56, W, H * 0.075);
      ctx.fillStyle = 'rgba(210,220,214,0.45)';
      ctx.fillRect(0, H * 0.562, W, 2);
      farRidge(shift, 'rgba(62,74,46,0.94)', 0.66, 28);
      ctx.fillStyle = '#2a3c28';
      const ox = -((shift) % 70);
      for (let i = -1; i < W / 70 + 2; i++) {
        if (i % 2 === 0) continue;
        const x = ox + i * 70;
        const y = H * 0.66 + Math.sin((x + shift) * 0.008) * 28 + Math.sin((x + shift) * 0.021 + 2) * 12.6;
        ctx.beginPath();
        ctx.moveTo(x, y - 14);
        ctx.lineTo(x - 6, y);
        ctx.lineTo(x + 6, y);
        ctx.fill();
      }
    } else if (id === 'china') {
      const sunX = W * 0.8, sunY = H * 0.16, sunR = Math.min(W, H) * 0.055;
      const creamBank = (parallax, yBase, alpha) => {
        ctx.fillStyle = `rgba(255,252,245,${alpha})`;
        const span = 340;
        const ox = -((shift * parallax) % span);
        for (let i = -1; i < 7; i++) {
          const x = ox + i * span;
          if (Math.abs(x + 40 - sunX) < sunR * 3.2 && Math.abs(yBase - sunY) < sunR * 2.2) continue;
          ctx.beginPath();
          ctx.ellipse(x, yBase, 62, 14, 0, 0, TAU);
          ctx.ellipse(x + 40, yBase + 3, 36, 11, 0, 0, TAU);
          ctx.fill();
        }
      };
      creamBank(0.1, H * 0.1, 0.8);
      creamBank(0.18, H * 0.24, 0.45);
      const bScroll = shift * 0.05;
      ctx.strokeStyle = '#2c342c'; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      for (let i = 0; i < 3; i++) {
        const bx = ((hash(st.seed + 80, i) * 0.5 + 0.5) * (W + 120) - bScroll) % (W + 120);
        const by = H * (0.08 + i * 0.05);
        const x = bx < 0 ? bx + W + 120 : bx;
        ctx.beginPath();
        ctx.moveTo(x, by + 2); ctx.quadraticCurveTo(x + 8, by - 7, x + 16, by + 2);
        ctx.moveTo(x + 16, by + 2); ctx.quadraticCurveTo(x + 24, by - 6, x + 32, by + 3);
        ctx.stroke();
      }
      const drawRange = (parallax, step, base, minH, maxH, body, shade, kind) => {
        const scroll = shift * parallax;
        const first = Math.floor(scroll / step) - 2;
        const peaks = [];
        for (let n = first; n < first + Math.ceil(W / step) + 6; n++) {
          const hv = hash(st.seed + Math.round(parallax * 100), n);
          const h = minH + (hv * 0.5 + 0.5) * (maxH - minH);
          const half = step * (kind === 'karst' ? 0.22 : kind === 'far' ? 0.4 : 0.28);
          peaks.push({ x: n * step - scroll + step * 0.5, h, half, top: base - h, n });
        }
        const drop = kind === 'far' ? 0.2 : kind === 'soft' ? 0.38 : kind === 'mid' ? 0.55 : 0.8;
        ctx.fillStyle = body;
        ctx.beginPath();
        ctx.moveTo(-100, base + 40);
        for (let i = 0; i < peaks.length; i++) {
          const p = peaks[i];
          const next = peaks[Math.min(i + 1, peaks.length - 1)];
          const valleyY = base - Math.min(p.h, next.h) * (1 - drop);
          ctx.lineTo(p.x - p.half, valleyY);
          ctx.lineTo(p.x - p.half * 0.46, p.top + p.h * 0.22);
          ctx.lineTo(p.x - p.half * 0.1, p.top + 4);
          ctx.lineTo(p.x, p.top);
          ctx.lineTo(p.x + p.half * 0.12, p.top + 6);
          ctx.lineTo(p.x + p.half * 0.4, p.top + p.h * 0.28);
          ctx.lineTo(p.x + p.half * 0.78, valleyY);
        }
        ctx.lineTo(W + 100, base + 40);
        ctx.closePath();
        ctx.fill();
        for (const p of peaks) {
          ctx.fillStyle = shade;
          ctx.beginPath();
          ctx.moveTo(p.x + 1, p.top + 2);
          ctx.lineTo(p.x + p.half * 0.12, p.top + 6);
          ctx.lineTo(p.x + p.half * 0.4, p.top + p.h * 0.28);
          ctx.lineTo(p.x + p.half * 0.62, base - p.h * (1 - drop) * 0.45);
          ctx.lineTo(p.x + p.half * 0.08, p.top + p.h * 0.62);
          ctx.closePath();
          ctx.fill();
          if (kind === 'far' && p.h > minH + (maxH - minH) * 0.72) {
            ctx.fillStyle = '#f7fbff';
            ctx.beginPath();
            ctx.moveTo(p.x - 7, p.top + 8);
            ctx.lineTo(p.x, p.top);
            ctx.lineTo(p.x + 6, p.top + 9);
            ctx.closePath();
            ctx.fill();
          }
          if (kind === 'mid' || kind === 'karst') {
            ctx.fillStyle = kind === 'karst' ? 'rgba(255,228,170,0.28)' : 'rgba(255,255,255,0.14)';
            ctx.beginPath();
            ctx.moveTo(p.x - 1, p.top + 2);
            ctx.lineTo(p.x - p.half * 0.28, p.top + p.h * 0.42);
            ctx.lineTo(p.x - p.half * 0.06, p.top + p.h * 0.48);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = 'rgba(236,246,234,0.62)';
            ctx.lineWidth = kind === 'karst' ? 2.4 : 1.4;
            ctx.beginPath();
            ctx.moveTo(p.x - p.half * 0.05, p.top + 14);
            ctx.lineTo(p.x - p.half * 0.14, p.top + p.h * 0.7);
            ctx.moveTo(p.x + p.half * 0.1, p.top + 20);
            ctx.lineTo(p.x + p.half * 0.02, p.top + p.h * 0.5);
            ctx.stroke();
            ctx.fillStyle = kind === 'karst' ? '#143824' : '#1d4a30';
            ctx.beginPath();
            ctx.ellipse(p.x, p.top + 8, Math.max(7, p.half * 0.2), 5.5, 0, Math.PI, TAU);
            ctx.fill();
          }
        }
        const fogTop = base - maxH * 0.42;
        const fog = ctx.createLinearGradient(0, fogTop, 0, base + 18);
        fog.addColorStop(0, 'rgba(255,246,230,0)');
        fog.addColorStop(0.62, kind === 'far' ? 'rgba(255,246,230,0.5)' : 'rgba(255,246,230,0.26)');
        fog.addColorStop(1, 'rgba(255,246,230,0)');
        ctx.fillStyle = fog;
        ctx.fillRect(0, fogTop, W, base + 18 - fogTop);
        return peaks;
      };
      drawRange(0.045, 180, H * 0.5, 24, 58, 'rgba(198,214,220,0.9)', 'rgba(158,180,190,0.4)', 'far');
      drawRange(0.09, 200, H * 0.58, 40, 90, '#a9d0be', '#6ea492', 'soft');
      drawRange(0.15, 220, H * 0.66, 70, Math.max(120, H * 0.22), '#347454', '#1a4632', 'mid');
      const wallPeaks = drawRange(0.22, 250, H * 0.8, 110, Math.max(180, H * 0.4), '#1f5438', '#0e2818', 'karst');
      ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.setLineDash([]);
      const crestCut = 110 + Math.max(180, H * 0.4);
      for (const peak of wallPeaks) {
        if (peak.h < crestCut * 0.48) continue;
        const y = peak.top + 16;
        const span = 34;
        ctx.strokeStyle = '#5c5040'; ctx.lineWidth = 10;
        ctx.beginPath(); ctx.moveTo(peak.x - span, y + 5); ctx.lineTo(peak.x + span * 0.7, y + 5); ctx.stroke();
        ctx.strokeStyle = '#f0e4cc'; ctx.lineWidth = 5;
        ctx.beginPath(); ctx.moveTo(peak.x - span, y); ctx.lineTo(peak.x + span * 0.7, y); ctx.stroke();
        ctx.fillStyle = '#f3e7d0';
        ctx.fillRect(peak.x - 4, y - 8, 8, 7);
        const tw = 16, th = 22;
        ctx.fillStyle = '#6a5e4e';
        ctx.fillRect(peak.x - tw / 2 + 2, y - th + 3, tw, th);
        ctx.fillStyle = '#efe3cc';
        ctx.fillRect(peak.x - tw / 2, y - th, tw, th);
        ctx.fillStyle = '#2a241c';
        ctx.beginPath();
        ctx.moveTo(peak.x - tw * 0.85, y - th + 2);
        ctx.lineTo(peak.x, y - th - 12);
        ctx.lineTo(peak.x + tw * 0.85, y - th + 2);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#1c1814';
        ctx.fillRect(peak.x - 3, y - 8, 6, 10);
        ctx.fillStyle = '#ffcc70';
        ctx.fillRect(peak.x + 2, y - 16, 4, 5);
        if (hash(st.seed + 91, peak.n) > 0.2) {
          ctx.fillStyle = '#e23b32';
          ctx.beginPath(); ctx.ellipse(peak.x + 12, y + 8, 3.5, 5, 0, 0, TAU); ctx.fill();
        }
      }
      const halo = ctx.createRadialGradient(sunX, sunY, sunR * 0.4, sunX, sunY, sunR * 2.6);
      halo.addColorStop(0, 'rgba(255,220,140,0.45)');
      halo.addColorStop(1, 'rgba(255,220,140,0)');
      ctx.fillStyle = halo;
      ctx.beginPath(); ctx.arc(sunX, sunY, sunR * 2.6, 0, TAU); ctx.fill();
      ctx.fillStyle = '#ffe56a';
      ctx.beginPath(); ctx.arc(sunX, sunY, sunR, 0, TAU); ctx.fill();
      ctx.lineCap = 'butt'; ctx.lineJoin = 'miter'; ctx.setLineDash([]);
    } else if (id === 'london') {
      const drift = shift * 0.04;
      ctx.fillStyle = 'rgba(210,218,226,0.55)';
      const cox = -((shift * 0.25) % 320);
      for (let i = -1; i < 8; i++) {
        const cx = cox + i * 320 + 40;
        const cy = H * (0.1 + (Math.abs(i) % 3) * 0.04);
        ctx.fillRect(cx, cy, 88, 14);
        ctx.fillRect(cx + 24, cy - 6, 64, 12);
        ctx.fillRect(cx + 72, cy + 2, 48, 10);
      }
      farRidge(shift * 0.35, 'rgba(100,110,120,0.28)', 0.52, 12);
      const bx = (x) => x + drift;
      const tScale = Math.min(W, H) * 0.0011;
      drawElizabethTower(ctx, bx(W * 0.14), H * 0.62, tScale, { showGlow: true });
      const tbX = bx(W * 0.38);
      const tbY = H * 0.4;
      ctx.fillStyle = '#c8ccd4';
      ctx.fillRect(tbX - 32, tbY, 16, H * 0.2);
      ctx.fillRect(tbX + 16, tbY, 16, H * 0.2);
      ctx.fillStyle = '#e0e4ea';
      ctx.fillRect(tbX - 34, tbY - 6, 18, 8);
      ctx.fillRect(tbX + 16, tbY - 6, 18, 8);
      ctx.fillStyle = '#3d7ab8';
      ctx.fillRect(tbX - 34, tbY + H * 0.08, 68, 10);
      ctx.strokeStyle = 'rgba(70,80,95,0.55)';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(tbX - 36, tbY + H * 0.12);
      ctx.quadraticCurveTo(tbX - 20, tbY + H * 0.2, tbX - 36, tbY + H * 0.28);
      ctx.moveTo(tbX + 36, tbY + H * 0.12);
      ctx.quadraticCurveTo(tbX + 20, tbY + H * 0.2, tbX + 36, tbY + H * 0.28);
      ctx.stroke();
      const eyeX = bx(W * 0.62);
      const eyeY = H * 0.52;
      ctx.strokeStyle = '#f0f2f5';
      ctx.lineWidth = 2.8;
      ctx.beginPath();
      ctx.arc(eyeX, eyeY, 30, 0, TAU);
      ctx.stroke();
      ctx.fillStyle = '#e8ecf0';
      ctx.beginPath();
      ctx.arc(eyeX, eyeY, 4, 0, TAU);
      ctx.fill();
      for (let sp = 0; sp < 12; sp++) {
        const ang = (sp / 12) * TAU;
        ctx.beginPath();
        ctx.moveTo(eyeX, eyeY);
        ctx.lineTo(eyeX + Math.cos(ang) * 28, eyeY + Math.sin(ang) * 28);
        ctx.stroke();
      }
      const spX = bx(W * 0.82);
      ctx.fillStyle = '#d8d4cc';
      ctx.beginPath();
      ctx.arc(spX, H * 0.46, 24, Math.PI, 0);
      ctx.lineTo(spX + 24, H * 0.58);
      ctx.lineTo(spX - 24, H * 0.58);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(120,115,108,0.5)';
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.strokeStyle = 'rgba(180,175,168,0.6)';
      ctx.beginPath();
      ctx.moveTo(spX - 24, H * 0.5);
      ctx.quadraticCurveTo(spX, H * 0.42, spX + 24, H * 0.5);
      ctx.stroke();
      ctx.fillStyle = '#a8a49c';
      ctx.fillRect(spX - 3, H * 0.42, 6, 12);
      ctx.fillStyle = '#8a8680';
      ctx.fillRect(spX - 1, H * 0.4, 2, 6);
      const horizonBand = ctx.createLinearGradient(0, H * 0.48, 0, H * 0.72);
      horizonBand.addColorStop(0, 'rgba(235,240,246,0)');
      horizonBand.addColorStop(0.45, 'rgba(220,228,236,0.35)');
      horizonBand.addColorStop(1, 'rgba(200,210,220,0.15)');
      ctx.fillStyle = horizonBand;
      ctx.fillRect(0, H * 0.48, W, H * 0.24);
    } else farRidge(shift, 'rgba(255,255,255,0.14)', 0.7, 26);
  }

  function drawSky(st, cam) {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, st.sky[0]);
    g.addColorStop(1, st.sky[1]);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    const glow = ctx.createLinearGradient(0, H * 0.42, 0, H);
    glow.addColorStop(0, 'rgba(255,255,255,0)');
    glow.addColorStop(1, 'rgba(255,255,255,0.08)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, H * 0.42, W, H * 0.58);
    if (st.shift) {
      const hue = (performance.now() / 40) % 360;
      ctx.fillStyle = `hsla(${hue}, 75%, 55%, 0.22)`;
      ctx.fillRect(0, 0, W, H);
    }
    drawSkyHero(st, cam);
    if (st.id === 'london') {
      ctx.lineCap = 'round';
      const t = performance.now() / 1000;
      const rainLayer = (alpha, count, seedBase, speedMul) => {
        ctx.strokeStyle = `rgba(160,175,190,${alpha})`;
        ctx.lineWidth = 1.2;
        for (let i = 0; i < count; i++) {
          const hx = (hash(st.seed + seedBase, i) * 0.5 + 0.5) * W;
          const len = 4 + (hash(st.seed + seedBase + 1, i) * 0.5 + 0.5) * 8;
          const spd = (80 + (hash(st.seed + seedBase + 2, i) * 0.5 + 0.5) * 120) * speedMul;
          const y0 = ((hash(st.seed + seedBase + 3, i) * 0.5 + 0.5) * H * 0.75 + t * spd) % (H * 0.78);
          ctx.beginPath();
          ctx.moveTo(hx, y0);
          ctx.lineTo(hx, y0 + len);
          ctx.stroke();
        }
      };
      rainLayer(0.22, 55, 60, 0.75);
      rainLayer(0.48, 95, 160, 1);
    }
    if (st.stars) {
      const n = (st.id === 'space' || st.id === 'night') ? 120 : 70;
      ctx.fillStyle = '#fff';
      for (let i = 0; i < n; i++) {
        const px = ((hash(st.seed + 4, i) * 0.5 + 0.5) * W * 1.6 - cam.x * 0.35) % W;
        const py = (hash(st.seed + 5, i) * 0.5 + 0.5) * H * 0.72;
        let r = (hash(st.seed + 6, i) * 0.5 + 0.5) * 1.7 + 0.4;
        if (i % 11 === 0) r *= 2.2;
        const tw = 0.62 + 0.38 * Math.sin(performance.now() / 520 + i);
        ctx.globalAlpha = (0.35 + (hash(st.seed + 7, i) * 0.5 + 0.5) * 0.65) * tw;
        ctx.beginPath(); ctx.arc(px < 0 ? px + W : px, py, r, 0, TAU); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    if (st.aurora) {
      const cols = ['#7dffb3', '#7af0ff', '#d2b0ff'];
      ctx.lineCap = 'round';
      for (let k = 0; k < 3; k++) {
        ctx.beginPath();
        ctx.strokeStyle = cols[k];
        ctx.globalAlpha = 0.28;
        ctx.lineWidth = 28;
        const t = performance.now() / 1800;
        for (let x = 0; x <= W; x += 18) {
          const y = H * (0.2 + k * 0.07) + Math.sin(x * 0.008 + t + k) * 32;
          if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
    const id = st.id;
    if (id === 'arctic' || id === 'xmas' || id === 'northpole') {
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      const t = performance.now() / 40;
      for (let i = 0; i < 48; i++) {
        const px = ((hash(st.seed + 12, i) * 0.5 + 0.5) * W * 1.4 + t * (0.4 + (i % 5) * 0.15)) % W;
        const py = ((hash(st.seed + 13, i) * 0.5 + 0.5) * H + t * 0.35) % (H * 0.72);
        ctx.fillRect(px, py, 2, 2);
      }
    }
    if (id === 'desert' || id === 'megadesert') {
      ctx.strokeStyle = 'rgba(255,220,140,0.16)';
      ctx.lineWidth = 2;
      const t = performance.now() / 700;
      for (let k = 0; k < 3; k++) {
        ctx.beginPath();
        for (let x = 0; x <= W; x += 16) {
          const y = H * (0.52 + k * 0.06) + Math.sin(x * 0.02 + t + k) * 6;
          if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
    }
    const wantMoon = st.id === 'xmas' || st.id === 'haunted' || (!st.sun && st.stars && st.id !== 'retro');
    if (st.sun && st.id !== 'xmas' && st.id !== 'china') {
      const R = Math.min(W, H) * 0.055, sx = W * 0.8, sy = H * 0.16;
      ctx.fillStyle = 'rgba(255,236,160,0.35)';
      ctx.beginPath(); ctx.arc(sx, sy, R * 1.85, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(255,250,210,0.85)'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(sx, sy, R * 1.28, 0, TAU); ctx.stroke();
      ctx.fillStyle = '#ffe56a';
      ctx.beginPath(); ctx.arc(sx, sy, R, 0, TAU); ctx.fill();
    } else if (wantMoon) {
      const R = Math.min(W, H) * 0.04;
      ctx.fillStyle = '#f4f7fb';
      ctx.beginPath(); ctx.arc(W * 0.78, H * 0.16, R, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(180,190,205,0.7)';
      ctx.beginPath(); ctx.arc(W * 0.76, H * 0.145, R * 0.28, 0, TAU); ctx.fill();
    }
  }

  function shade(hex, amt) {
    const n = parseInt(hex.slice(1), 16);
    const f = (v) => clamp(Math.round(amt < 0 ? v * (1 + amt) : v + (255 - v) * amt), 0, 255);
    return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`;
  }

  // Lightening mixes toward white. Keep each material close to its own color.
  function groundFill(st) {
    const mat = groundMat(st);
    const lift = mat === 'retro' ? 0 : mat === 'ice' ? 0.1 : mat === 'tar' ? 0.05 : 0.07;
    return shade(st.ground, lift);
  }

  const LIQUID_OVERLAP = 0.85;
  function liquidXs(g) {
    const x0 = g.start - LIQUID_OVERLAP, x1 = g.end + LIQUID_OVERLAP;
    const xs = [x0];
    for (let x = x0 + 0.25; x < x1 - 1e-4; x += 0.25) xs.push(x);
    xs.push(x1);
    return xs;
  }
  function traceLiquid(T, g, topAt) {
    const xs = liquidXs(g);
    ctx.beginPath();
    ctx.moveTo(xs[0], topAt(xs[0]));
    for (let i = 1; i < xs.length; i++) ctx.lineTo(xs[i], topAt(xs[i]));
    for (let i = xs.length - 1; i >= 0; i--) ctx.lineTo(xs[i], solidHeight(T, xs[i]) - GAP_DROP - LIQUID_OVERLAP);
    ctx.closePath();
  }
  function gapLiquidFill(st, top, bot) {
    if (st.id === 'london') return '#5a6d7a';
    const grd = ctx.createLinearGradient(0, top, 0, bot);
    if (st.lava) {
      grd.addColorStop(0, '#ffe14a');
      grd.addColorStop(0.16, '#ff7a12');
      grd.addColorStop(0.5, '#e03010');
      grd.addColorStop(1, '#6a1406');
      return grd;
    }
    if (st.id === 'china') {
      grd.addColorStop(0, '#e7f7f1');
      grd.addColorStop(0.06, '#8fd4c2');
      grd.addColorStop(0.22, '#1f7a62');
      grd.addColorStop(1, '#0b3a30');
    } else if (st.id === 'skottland') {
      grd.addColorStop(0, '#4a7a78');
      grd.addColorStop(0.12, '#1c4a52');
      grd.addColorStop(0.4, '#0e3038');
      grd.addColorStop(1, '#071c24');
    } else if (st.id === 'countryside') {
      grd.addColorStop(0, '#b8e4f4');
      grd.addColorStop(0.12, '#5aafd4');
      grd.addColorStop(1, '#1a6088');
    } else if (st.surface === 'sand' || st.id === 'desert' || st.id === 'megadesert' || st.id === 'mars') {
      grd.addColorStop(0, '#d4b890');
      grd.addColorStop(0.2, '#8a6840');
      grd.addColorStop(1, '#3a2818');
    } else if (st.id === 'arctic' || st.id === 'xmas' || st.id === 'northpole' || st.snowcap) {
      grd.addColorStop(0, '#dceef8');
      grd.addColorStop(0.15, '#7ab0d0');
      grd.addColorStop(1, '#2a5080');
    } else if (st.id === 'moon' || st.id === 'space') {
      grd.addColorStop(0, '#4a5060');
      grd.addColorStop(0.2, '#282c38');
      grd.addColorStop(1, '#0a0c14');
    } else if (st.dark || st.id === 'cave' || st.id === 'haunted') {
      grd.addColorStop(0, '#5a5048');
      grd.addColorStop(0.2, '#322820');
      grd.addColorStop(1, '#120e0c');
    } else {
      grd.addColorStop(0, '#b8dce8');
      grd.addColorStop(0.14, '#6aaccc');
      grd.addColorStop(1, '#1a5070');
    }
    return grd;
  }
  function strokePoolSurface(g, topAt, style, amp) {
    const xs = liquidXs(g);
    const t = performance.now() / 1000;
    ctx.beginPath();
    for (let i = 0; i < xs.length; i++) {
      const x = xs[i];
      const y = topAt(x) + Math.sin(x * 1.7 + t * 2.1) * amp;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = style;
    ctx.lineWidth = 0.12;
    ctx.stroke();
  }
  function drawGapLiquids(T, st, cam) {
    const hw = W / 2 / cam.s + 2;
    const x0 = cam.x - hw, x1 = cam.x + hw;
    for (let s = Math.floor(x0 / RAMP_GAP) - 1; s <= Math.floor(x1 / RAMP_GAP) + 1; s++) {
      const g = gapForRamp(T, s);
      if (!g || g.end < x0 || g.start > x1) continue;
      const yL = solidHeight(T, g.start), yR = solidHeight(T, g.end);
      const top = Math.max(yL, yR);
      const bot = Math.min(yL, yR) - GAP_DROP - LIQUID_OVERLAP;
      if (st.lava) {
        const lavaTop = Math.max(lavaSurface(T, g, g.start), lavaSurface(T, g, g.end));
        ctx.fillStyle = gapLiquidFill(st, lavaTop, bot);
        traceLiquid(T, g, (x) => lavaSurface(T, g, x));
        ctx.fill();
        strokePoolSurface(g, (x) => lavaSurface(T, g, x), 'rgba(255,244,180,0.95)', 0.09);
        continue;
      }
      ctx.fillStyle = gapLiquidFill(st, top, bot);
      traceLiquid(T, g, (x) => solidHeight(T, x));
      ctx.fill();
      strokePoolSurface(g, (x) => solidHeight(T, x), 'rgba(255,255,255,0.72)', 0.045);
    }
  }

  function drawTerrain(T, st, cam) {
    const hw = W / 2 / cam.s, hh = H / 2 / cam.s;
    const x0 = cam.x - hw - 1, x1 = cam.x + hw + 1, yb = cam.y - hh - 5;
    const i0 = Math.floor(x0 / STEP), i1 = Math.ceil(x1 / STEP);
    ctx.beginPath();
    ctx.moveTo(i0 * STEP, yb);
    for (let i = i0; i <= i1; i++) ctx.lineTo(i * STEP, hIdx(T, i));
    ctx.lineTo(i1 * STEP, yb);
    ctx.closePath();
    ctx.fillStyle = groundFill(st); ctx.fill();
    ctx.save();
    ctx.clip();
    drawGroundTexture(T, st, i0, i1);
    strokeSurface(T, st, i0, i1);
    ctx.restore();
    if (st.snowcap) {
      ctx.beginPath();
      let on = false;
      for (let i = i0; i <= i1; i++) {
        const y = hIdx(T, i);
        if (y < 7 || gapContaining(T, i * STEP)) { on = false; continue; }
        if (!on) { ctx.moveTo(i * STEP, y + 0.05); on = true; } else ctx.lineTo(i * STEP, y + 0.05);
      }
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 0.18; ctx.stroke();
    }
    if (st.stripes === 'road') {
      ctx.save();
      if (st.id === 'roller') {
        ctx.beginPath();
        for (let i = i0; i <= i1; i++) { const y = hIdx(T, i) + 0.08; i === i0 ? ctx.moveTo(i * STEP, y) : ctx.lineTo(i * STEP, y); }
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 0.08; ctx.stroke();
        ctx.beginPath();
        for (let i = i0; i <= i1; i++) { const y = hIdx(T, i) - 0.02; i === i0 ? ctx.moveTo(i * STEP, y) : ctx.lineTo(i * STEP, y); }
        ctx.strokeStyle = '#fff4f6'; ctx.lineWidth = 0.05; ctx.stroke();
      } else {
        ctx.setLineDash([2.2, 1.4]);
        ctx.beginPath();
        for (let i = i0; i <= i1; i++) { const y = hIdx(T, i) + 0.05; i === i0 ? ctx.moveTo(i * STEP, y) : ctx.lineTo(i * STEP, y); }
        ctx.strokeStyle = '#f5e27a'; ctx.lineWidth = 0.14; ctx.stroke();
      }
      ctx.restore();
    } else if (st.stripes === 'rainbow') {
      const cols = ['#ff4d4d', '#ff9f1a', '#ffe14a', '#3ddc6a', '#3aa0ff', '#b06bff'];
      cols.forEach((col, k) => {
        ctx.beginPath();
        for (let i = i0; i <= i1; i++) { const y = hIdx(T, i) + 0.06 + k * 0.07; i === i0 ? ctx.moveTo(i * STEP, y) : ctx.lineTo(i * STEP, y); }
        ctx.strokeStyle = col; ctx.lineWidth = 0.06; ctx.stroke();
      });
    } else if (st.stripes === 'warn') {
      for (let i = i0; i <= i1; i += 2) {
        ctx.fillStyle = ((i / 2) & 1) ? '#171717' : '#f5e27a';
        ctx.fillRect(i * STEP, hIdx(T, i), 1, 0.16);
      }
    }
    if (st.id === 'roller') {
      ctx.beginPath();
      for (let i = i0; i <= i1; i++) { const y = hIdx(T, i) + 0.16; i === i0 ? ctx.moveTo(i * STEP, y) : ctx.lineTo(i * STEP, y); }
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 0.05; ctx.stroke();
    }
    for (let s = Math.max(0, Math.floor(x0 / RAMP_GAP)); s <= Math.floor(x1 / RAMP_GAP); s++) {
      const r = rampInfo(T, s * RAMP_GAP + 1), xa = r.start, xb = r.start + RAMP_LEN;
      const base = (x) => hAt(T, x) - rampBump(T, x);
      const paint = rampPaint(st);
      ctx.fillStyle = paint[0]; ctx.strokeStyle = paint[1]; ctx.lineWidth = 0.08;
      ctx.beginPath(); ctx.moveTo(xa, base(xa));
      for (let x = xa + 0.25; x <= xb + 0.001; x += 0.25) ctx.lineTo(x, hAt(T, x));
      ctx.lineTo(xb + 0.1, base(xb) - 0.3); ctx.closePath();
      ctx.fill(); ctx.stroke();
      for (let k = 1; k <= RAMP_LEN; k++) {
        const x = Math.min(xa + k, xb - 0.05);
        ctx.beginPath(); ctx.moveTo(x, hAt(T, x)); ctx.lineTo(x, base(x) - 0.3); ctx.stroke();
      }
      ctx.strokeStyle = paint[2]; ctx.lineWidth = 0.15;
      ctx.beginPath(); ctx.moveTo(xa, base(xa));
      for (let x = xa + 0.25; x <= xb + 0.001; x += 0.25) ctx.lineTo(x, hAt(T, x));
      ctx.stroke();
    }
    drawGapBeds(T, st, cam);
    drawGapLiquids(T, st, cam);
    drawHazards(T, st, cam);
  }

  function drawGapBeds(T, st, cam) {
    const hw = W / 2 / cam.s + 2;
    const x0 = cam.x - hw, x1 = cam.x + hw;
    for (let s = Math.floor(x0 / RAMP_GAP) - 1; s <= Math.floor(x1 / RAMP_GAP) + 1; s++) {
      const g = gapForRamp(T, s);
      if (!g || g.end < x0 || g.start > x1) continue;
      const yL = solidHeight(T, g.start), yR = solidHeight(T, g.end);
      const bedTint = st.lava ? 'rgba(48,22,10,0.82)'
        : st.id === 'london' ? 'rgba(32,40,48,0.78)'
        : st.id === 'china' ? 'rgba(14,42,34,0.8)'
        : 'rgba(22,40,38,0.75)';
      drawGapFloorBed(g, yL, yR, bedTint);
    }
  }

  function drawHazards(T, st, cam) {
    const hw = W / 2 / cam.s + 2;
    const x0 = cam.x - hw, x1 = cam.x + hw;
    for (let s = Math.floor(x0 / RAMP_GAP) - 1; s <= Math.floor(x1 / RAMP_GAP) + 1; s++) {
      const g = gapForRamp(T, s);
      if (!g || g.end < x0 || g.start > x1) continue;
      const yL = solidHeight(T, g.start), yR = solidHeight(T, g.end);
      if (st.lava) {
        const ySL = lavaSurface(T, g, g.start);
        const ySR = lavaSurface(T, g, g.end);
        ctx.save();
        ctx.globalAlpha = 0.32;
        ctx.fillStyle = '#ffd24a';
        ctx.beginPath();
        ctx.moveTo(g.start + 0.35, ySL);
        ctx.lineTo(g.end - 0.35, ySR);
        ctx.lineTo(g.end - 0.55, ySR - 1.5);
        ctx.lineTo(g.start + 0.55, ySL - 1.5);
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = 0.35 + 0.28 * Math.sin(performance.now() / 260);
        ctx.fillStyle = '#fff1a0';
        ctx.beginPath();
        ctx.moveTo(g.start + 0.7, ySL + 0.05);
        ctx.lineTo(g.end - 0.7, ySR + 0.05);
        ctx.lineTo(g.end - 0.9, ySR - 0.65);
        ctx.lineTo(g.start + 0.9, ySL - 0.65);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
        ctx.strokeStyle = '#2a160c'; ctx.lineWidth = 0.16;
        ctx.beginPath();
        ctx.moveTo(g.start, yL); ctx.lineTo(g.start, ySL);
        ctx.moveTo(g.end, yR); ctx.lineTo(g.end, ySR);
        ctx.stroke();
      } else if (st.id === 'london') {
        const floorL = yL - GAP_DROP;
        const floorR = yR - GAP_DROP;
        ctx.fillStyle = 'rgba(130,155,175,0.45)';
        ctx.beginPath();
        ctx.moveTo(g.start + 1.2, floorL + (yL - floorL) * 0.35);
        ctx.lineTo(g.end - 1.2, floorR + (yR - floorR) * 0.35);
        ctx.lineTo(g.end - 2, floorR + (yR - floorR) * 0.55);
        ctx.lineTo(g.start + 2, floorL + (yL - floorL) * 0.55);
        ctx.closePath();
        ctx.fill();
      } else if (st.id === 'china') {
        const ySL = yL, ySR = yR;
        ctx.fillStyle = 'rgba(255,248,230,0.32)';
        ctx.beginPath();
        ctx.moveTo(g.start, ySL);
        ctx.lineTo(g.start, ySL - 0.7);
        ctx.lineTo(g.end, ySR - 0.7);
        ctx.lineTo(g.end, ySR);
        ctx.closePath();
        ctx.fill();
        const span = g.end - g.start;
        const n = Math.max(6, Math.ceil(span / 1.2));
        const t = performance.now() / 1000;
        const wave = (y0, y1, inset, amp, freq, phase) => {
          ctx.beginPath();
          for (let i = 0; i <= n; i++) {
            const u = i / n;
            const x = g.start + inset + (span - inset * 2) * u;
            const y = y0 + (y1 - y0) * u + Math.sin(u * Math.PI * freq + phase) * amp;
            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
          }
          ctx.stroke();
        };
        ctx.lineCap = 'round';
        ctx.strokeStyle = 'rgba(236,255,248,0.9)';
        ctx.lineWidth = 0.09;
        wave(ySL - 0.85, ySR - 0.85, 0.55, 0.05, 3, t * 1.05);
        ctx.strokeStyle = 'rgba(150,214,190,0.5)';
        ctx.lineWidth = 0.06;
        wave(ySL - 1.7, ySR - 1.7, 0.9, 0.04, 2, -t * 0.65);
        ctx.lineCap = 'butt';
      } else if (st.id === 'skottland') {
        const ySL = yL;
        const ySR = yR;
        const span = g.end - g.start;
        const n = Math.max(6, Math.ceil(span / 1.2));
        const t = performance.now() / 1000;
        const wave = (y0, y1, inset, amp, freq, phase) => {
          ctx.beginPath();
          for (let i = 0; i <= n; i++) {
            const u = i / n;
            const x = g.start + inset + (span - inset * 2) * u;
            const y = y0 + (y1 - y0) * u + Math.sin(u * Math.PI * freq + phase) * amp;
            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
          }
          ctx.stroke();
        };
        ctx.strokeStyle = 'rgba(210,220,214,0.55)';
        ctx.lineWidth = 0.08;
        wave(ySL, ySR, 0.15, 0.05, 3, t * 1.4);
        ctx.strokeStyle = 'rgba(150,176,168,0.4)';
        ctx.lineWidth = 0.06;
        wave(ySL - 0.85, ySR - 0.85, 0.7, 0.04, 4, -t * 0.9);
        ctx.strokeStyle = 'rgba(90,120,118,0.35)';
        ctx.lineWidth = 0.05;
        wave(ySL - 1.7, ySR - 1.7, 1.1, 0.03, 2.5, t * 0.7);
        ctx.strokeStyle = '#6a7840';
        ctx.lineWidth = 0.04;
        ctx.lineCap = 'round';
        for (let side = 0; side < 2; side++) {
          const dir = side === 0 ? -1 : 1;
          const x0 = side === 0 ? g.start : g.end;
          const y0 = side === 0 ? yL : yR;
          for (let k = 0; k < 5; k++) {
            const x = x0 + dir * (0.12 + k * 0.22);
            const h = 0.48 + (k % 3) * 0.16;
            const lean = dir * 0.06;
            ctx.beginPath();
            ctx.moveTo(x, y0);
            ctx.quadraticCurveTo(x + lean, y0 + h * 0.6, x + lean * 2, y0 + h);
            ctx.stroke();
          }
        }
        ctx.lineCap = 'butt';
      } else if (st.id === 'countryside') {
        const ySL = yL, ySR = yR;
        const span = g.end - g.start;
        const n = Math.max(6, Math.ceil(span / 1.2));
        const t = performance.now() / 1000;
        const wave = (y0, y1, inset, amp, freq, phase) => {
          ctx.beginPath();
          for (let i = 0; i <= n; i++) {
            const u = i / n;
            const x = g.start + inset + (span - inset * 2) * u;
            const y = y0 + (y1 - y0) * u + Math.sin(u * Math.PI * freq + phase) * amp;
            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
          }
          ctx.stroke();
        };
        ctx.lineCap = 'round';
        ctx.strokeStyle = 'rgba(240,252,255,0.85)';
        ctx.lineWidth = 0.08;
        wave(ySL - 0.5, ySR - 0.5, 0.5, 0.04, 2.5, t * 1.2);
        ctx.strokeStyle = 'rgba(170,210,230,0.45)';
        ctx.lineWidth = 0.05;
        wave(ySL - 1.1, ySR - 1.1, 0.85, 0.03, 3.5, -t * 0.9);
        ctx.lineCap = 'butt';
      }
    }
    const cell = 88;
    for (let ci = Math.floor(x0 / cell) - 1; ci <= Math.floor(x1 / cell) + 1; ci++) {
      const p = patchInfo(T, ci);
      if (!p || p.end < x0 || p.start > x1) continue;
      ctx.beginPath();
      let moved = false;
      for (let x = Math.max(p.start, x0); x <= Math.min(p.end, x1); x += 0.5) {
        if (rampBump(T, x) > 0.05 || gapContaining(T, x)) { moved = false; continue; }
        const y = hAt(T, x) + 0.08;
        if (!moved) { ctx.moveTo(x, y); moved = true; } else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = p.kind === 'mud' ? 'rgba(90,58,28,0.85)' : 'rgba(230,248,255,0.92)';
      ctx.lineWidth = 0.28;
      ctx.stroke();
    }
    drawCeiling(T, st, cam);
  }

  const SEASON_TOP = ['#1ed41c', '#e2c84a', '#e07a28', '#f7fbff'];
  const SEASON_BOT = ['#0e8c12', '#a89028', '#8d4512', '#d5e4f2'];
  function strokeSurface(T, st, i0, i1) {
    const mat = groundMat(st);
    const thick = st.id === 'retro' ? [0.16, 0.14]
      : mat === 'tar' ? [0.2, 0.12]
      : mat === 'ice' ? [0.46, 0.3]
      : mat === 'sand' ? [0.36, 0.22]
      : mat === 'rock' ? [0.28, 0.16]
      : mat === 'mud' ? [0.34, 0.2]
      : [0.46, 0.3];
    const bands = [];
    let start = i0;
    let key = st.season ? Math.floor(Math.max(0, i0 * STEP) / 380) % 4 : -1;
    for (let i = i0; i <= i1; i++) {
      const k = st.season ? Math.floor(Math.max(0, i * STEP) / 380) % 4 : -1;
      if (k !== key) { bands.push([start, i - 1, key]); start = i; key = k; }
    }
    bands.push([start, i1, key]);
    for (const band of bands) {
      const a = band[0], b = band[1], k = band[2];
      if (b < a) continue;
      ctx.beginPath();
      for (let i = a; i <= b; i++) { const y = hIdx(T, i); i === a ? ctx.moveTo(i * STEP, y) : ctx.lineTo(i * STEP, y); }
      ctx.lineJoin = st.id === 'retro' ? 'miter' : 'round';
      ctx.strokeStyle = k < 0 ? st.grassDark : SEASON_BOT[k]; ctx.lineWidth = thick[0]; ctx.stroke();
      ctx.strokeStyle = k < 0 ? st.grass : SEASON_TOP[k]; ctx.lineWidth = thick[1]; ctx.stroke();
    }
    if (mat === 'retro') return;
    const hi = mat === 'mud' ? 'rgba(255,214,160,0.22)'
      : mat === 'tar' ? 'rgba(255,255,255,0.16)'
      : mat === 'ice' ? 'rgba(255,255,255,0.85)'
      : mat === 'sand' ? 'rgba(255,236,190,0.5)'
      : mat === 'rock' ? 'rgba(255,255,255,0.22)'
      : mat === 'slime' ? 'rgba(255,255,255,0.38)'
      : (mat === 'grass' || mat === 'season') ? 'rgba(186,255,160,0.38)'
      : 'rgba(255,255,255,0.4)';
    ctx.strokeStyle = hi; ctx.lineWidth = mat === 'ice' ? 0.12 : 0.1;
    ctx.beginPath();
    for (let i = i0; i <= i1; i++) { const y = hIdx(T, i) + 0.04; i === i0 ? ctx.moveTo(i * STEP, y) : ctx.lineTo(i * STEP, y); }
    ctx.stroke();
    if (st.id === 'skottland') {
      const bands = [[0.12, 0.18, '#46c24e'], [0.34, 0.22, '#1f7a32']];
      for (const band of bands) {
        const drop = band[0], thick = band[1], col = band[2];
        ctx.beginPath();
        for (let i = i0; i <= i1; i++) {
          const y = hIdx(T, i) - drop;
          i === i0 ? ctx.moveTo(i * STEP, y) : ctx.lineTo(i * STEP, y);
        }
        for (let i = i1; i >= i0; i--) ctx.lineTo(i * STEP, hIdx(T, i) - drop - thick);
        ctx.closePath();
        ctx.fillStyle = col;
        ctx.fill();
      }
    }
    if (st.id === 'china') {
      const bands = [[0.45, 0.32, '#8ed45a'], [1.05, 0.32, '#3f7a32'], [1.65, 0.28, '#6aaa3c']];
      for (const band of bands) {
        const drop = band[0], thick = band[1], col = band[2];
        ctx.beginPath();
        for (let i = i0; i <= i1; i++) {
          const y = hIdx(T, i) - drop;
          i === i0 ? ctx.moveTo(i * STEP, y) : ctx.lineTo(i * STEP, y);
        }
        for (let i = i1; i >= i0; i--) ctx.lineTo(i * STEP, hIdx(T, i) - drop - thick);
        ctx.closePath();
        ctx.fillStyle = col;
        ctx.fill();
        ctx.strokeStyle = 'rgba(242,210,90,0.9)';
        ctx.lineWidth = 0.035;
        ctx.beginPath();
        for (let i = i0; i <= i1; i++) {
          const y = hIdx(T, i) - drop;
          i === i0 ? ctx.moveTo(i * STEP, y) : ctx.lineTo(i * STEP, y);
        }
        ctx.stroke();
      }
    }
    if (mat === 'ice') {
      ctx.strokeStyle = 'rgba(80,130,180,0.55)'; ctx.lineWidth = 0.08;
      ctx.beginPath();
      for (let i = i0; i <= i1; i++) { const y = hIdx(T, i) - 0.08; i === i0 ? ctx.moveTo(i * STEP, y) : ctx.lineTo(i * STEP, y); }
      ctx.stroke();
    }
  }

  function groundMat(st) {
    if (st.id === 'retro') return 'retro';
    if (st.season) return 'season';
    if (st.surface === 'sand' || st.id === 'beach') return 'sand';
    if (st.surface === 'tar') return 'tar';
    if (st.surface === 'ice' || st.surface === 'patches-ice') return 'ice';
    if (st.surface === 'mud') return 'mud';
    if (st.surface === 'slime') return 'slime';
    if (st.snowcap || st.id === 'moon' || st.id === 'space' || st.id === 'cave' || st.id === 'volcano' || st.id === 'ragnarok' || st.id === 'mars') return 'rock';
    return 'grass';
  }

  function rampPaint(st) {
    const id = st.id;
    if (id === 'volcano') return ['#4a3028', '#2a1612', '#ffb15a'];
    if (id === 'neon' || id === 'rainbow' || id === 'prognosis') return ['#2a1848', '#ff4fd8', '#f6ff4a'];
    if (id === 'highway' || id === 'megahighway' || id === 'rooftops') return ['#3a3e46', '#1c1e22', '#f5e27a'];
    if (id === 'london') return ['#2e343c', '#1a1e24', '#c8d0d8'];
    if (id === 'construction' || id === 'factory' || id === 'nuclear') return ['#f5e27a', '#171717', '#f5e27a'];
    if (id === 'desert' || id === 'megadesert' || id === 'beach' || id === 'mars') return ['#e6c98a', '#a88448', '#fff1c2'];
    if (id === 'arctic' || id === 'xmas' || id === 'northpole' || id === 'arcticcave') return ['#f7fbff', '#9bb4c8', '#ffffff'];
    if (id === 'arena') return ['#d7b07a', '#6a4420', '#ffd84a'];
    return ['#c48a3a', '#6a4420', '#ffd84a'];
  }

  function drawGroundTexture(T, st, i0, i1) {
    const mat = groundMat(st);
    if (st.id === 'china') {
      for (let i = i0; i <= i1; i += 11) {
        const hv = hash(T.seed + 12, i);
        if (hv < 0.45) continue;
        const rx = i * STEP, ry = hIdx(T, i) - 0.85 - Math.abs(hv) * 0.4;
        ctx.fillStyle = '#7d887c';
        ctx.beginPath(); ctx.ellipse(rx, ry, 0.28, 0.14, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = '#c5d0c2';
        ctx.beginPath(); ctx.ellipse(rx - 0.06, ry + 0.03, 0.1, 0.05, 0, 0, TAU); ctx.fill();
      }
      return;
    }
    if (mat === 'sand') {
      const mars = st.id === 'mars';
      ctx.strokeStyle = mars ? 'rgba(255,140,80,0.38)' : 'rgba(255,236,190,0.5)';
      ctx.lineWidth = 0.05;
      for (let row = 0; row < 5; row++) {
        ctx.beginPath();
        for (let i = i0; i <= i1; i += 2) {
          const y = hIdx(T, i) - 0.4 - row * 0.7 + Math.sin(i * 0.18 + row) * 0.12;
          i === i0 ? ctx.moveTo(i * STEP, y) : ctx.lineTo(i * STEP, y);
        }
        ctx.stroke();
      }
      ctx.fillStyle = mars ? 'rgba(120,40,16,0.35)' : 'rgba(160,110,40,0.28)';
      for (let i = i0; i <= i1; i += 6) {
        const hv = hash(T.seed + 5, i);
        if (hv < 0.2) continue;
        ctx.beginPath();
        ctx.ellipse(i * STEP, hIdx(T, i) - 0.8 - Math.abs(hv), 0.16, 0.07, 0, 0, TAU);
        ctx.fill();
      }
    } else if (mat === 'tar') {
      ctx.strokeStyle = 'rgba(0,0,0,0.28)'; ctx.lineWidth = 0.03;
      for (let i = i0; i <= i1; i += 5) {
        const hv = hash(T.seed + 5, i);
        if (hv < 0.1) continue;
        const x = i * STEP, y = hIdx(T, i) - 0.4 - Math.abs(hv) * 1.8;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 0.55, y - 0.15); ctx.stroke();
      }
      ctx.strokeStyle = 'rgba(220,220,230,0.45)'; ctx.lineWidth = 0.08;
      ctx.beginPath();
      for (let i = i0; i <= i1; i++) { const y = hIdx(T, i) - 0.02; i === i0 ? ctx.moveTo(i * STEP, y) : ctx.lineTo(i * STEP, y); }
      ctx.stroke();
      if (st.id === 'london') {
        ctx.setLineDash([1.4, 1.0]);
        ctx.strokeStyle = 'rgba(220,220,228,0.5)';
        ctx.lineWidth = 0.06;
        ctx.beginPath();
        for (let i = i0; i <= i1; i++) { const y = hIdx(T, i) + 0.04; i === i0 ? ctx.moveTo(i * STEP, y) : ctx.lineTo(i * STEP, y); }
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = 'rgba(30,36,42,0.35)';
        for (let i = i0; i <= i1; i += 5) {
          const hv = hash(T.seed + 7, i);
          if (hv < 0.08) continue;
          const x = i * STEP, y = hIdx(T, i) - 0.35 - Math.abs(hv) * 1.2;
          ctx.beginPath();
          ctx.ellipse(x, y, 0.35, 0.1, 0, 0, TAU);
          ctx.fill();
        }
        ctx.strokeStyle = 'rgba(20,24,28,0.4)';
        ctx.lineWidth = 0.05;
        ctx.beginPath();
        for (let i = i0; i <= i1; i++) { const y = hIdx(T, i) + 0.12; i === i0 ? ctx.moveTo(i * STEP, y) : ctx.lineTo(i * STEP, y); }
        ctx.stroke();
        ctx.strokeStyle = 'rgba(100,120,140,0.12)';
        ctx.lineWidth = 0.04;
        for (let i = i0; i <= i1; i += 7) {
          if (hash(T.seed + 8, i) < 0.12) continue;
          const x = i * STEP, y = hIdx(T, i) - 0.28;
          ctx.beginPath();
          ctx.moveTo(x - 0.2, y);
          ctx.lineTo(x + 0.55, y - 0.05);
          ctx.stroke();
        }
      }
    } else if (mat === 'ice') {
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      for (let i = i0; i <= i1; i += 3) {
        const hv = hash(T.seed + 5, i);
        if (hv < 0.05) continue;
        ctx.fillRect(i * STEP, hIdx(T, i) - 0.2 - (hv * 0.5 + 0.5) * 1.8, 0.06, 0.06);
      }
      ctx.strokeStyle = 'rgba(120,170,210,0.35)'; ctx.lineWidth = 0.03;
      for (let i = i0; i <= i1; i += 7) {
        const x = i * STEP, y = hIdx(T, i) - 0.5;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 0.4, y - 0.25); ctx.stroke();
      }
    } else if (mat === 'mud') {
      ctx.fillStyle = 'rgba(30,18,8,0.45)';
      for (let i = i0; i <= i1; i += 5) {
        const hv = hash(T.seed + 5, i);
        if (hv < -0.1) continue;
        ctx.beginPath();
        ctx.ellipse(i * STEP, hIdx(T, i) - 0.4 - Math.abs(hv) * 0.5, 0.5, 0.16, 0, 0, TAU);
        ctx.fill();
      }
      ctx.fillStyle = 'rgba(180,140,80,0.25)';
      for (let i = i0; i <= i1; i += 5) {
        const hv = hash(T.seed + 6, i);
        if (hv < 0.2) continue;
        ctx.beginPath();
        ctx.ellipse(i * STEP - 0.1, hIdx(T, i) - 0.32, 0.18, 0.06, 0, 0, TAU);
        ctx.fill();
      }
    } else if (mat === 'slime') {
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      for (let i = i0; i <= i1; i += 6) {
        ctx.beginPath();
        ctx.ellipse(i * STEP, hIdx(T, i) - 1.2, 0.55, 0.24, 0, 0, TAU);
        ctx.fill();
      }
      ctx.fillStyle = 'rgba(255,255,255,0.28)';
      for (let i = i0; i <= i1; i += 4) {
        ctx.beginPath();
        ctx.ellipse(i * STEP, hIdx(T, i) - 0.25, 0.36, 0.1, 0, 0, TAU);
        ctx.fill();
      }
    } else if (mat === 'rock') {
      ctx.strokeStyle = 'rgba(0,0,0,0.28)'; ctx.lineWidth = 0.04;
      for (let i = i0; i <= i1; i += 4) {
        const hv = hash(T.seed + 8, i);
        const x = i * STEP, y = hIdx(T, i) - 0.55;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + hv * 0.8, y - 0.85); ctx.stroke();
      }
      if (st.id === 'volcano') {
        ctx.fillStyle = 'rgba(255,90,20,0.55)';
        for (let i = i0; i <= i1; i += 6) ctx.fillRect(i * STEP, hIdx(T, i) - 0.35 - Math.abs(hash(T.seed + 9, i)) * 1.2, 0.4, 0.1);
      }
    } else if (st.id === 'roller') {
      ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 0.04;
      ctx.beginPath();
      for (let i = i0; i <= i1; i++) { const y = hIdx(T, i) - 0.12; i === i0 ? ctx.moveTo(i * STEP, y) : ctx.lineTo(i * STEP, y); }
      ctx.stroke();
    } else if (mat !== 'retro') {
      ctx.fillStyle = st.groundDark;
      for (let i = i0; i <= i1; i += 4) {
        const hv = hash(T.seed + 5, i);
        if (hv < 0.15) continue;
        ctx.beginPath();
        ctx.arc(i * STEP, hIdx(T, i) - 0.7 - Math.abs(hv) * 1.4, 0.08, 0, TAU);
        ctx.fill();
      }
      if (st.id === 'bootcamp') {
        ctx.fillStyle = 'rgba(50,70,24,0.45)';
        for (let i = i0; i <= i1; i += 4) ctx.fillRect(i * STEP, hIdx(T, i) - 0.55, 0.55, 0.16);
      }
      if (st.id === 'action') {
        ctx.fillStyle = 'rgba(40,22,16,0.5)';
        for (let i = i0; i <= i1; i += 6) if (hash(T.seed + 6, i) > 0.15) ctx.fillRect(i * STEP, hIdx(T, i) - 0.18, 0.9, 0.14);
      }
    }
  }

  function drawCeiling(T, st, cam) {
    if (!st.ceiling) return;
    const hw = W / 2 / cam.s + 2;
    const x0 = cam.x - hw, x1 = cam.x + hw;
    const rock = st.ceilingColor || '#14161c';
    ctx.fillStyle = rock;
    let prev = null;
    for (let x = x0; x <= x1; x += 1) {
      const c0 = ceilingAt(T, x);
      const bump = c0 == null || st.id === 'retro' ? 0 : hash(T.seed + 90, Math.floor(x * 2)) * 0.28;
      const c = c0 == null ? null : c0 + bump;
      const cut = c != null && marsRoofClearance(T, x) > st.ceiling + 0.35;
      if (prev && c != null && prev.c != null) {
        ctx.fillStyle = rock;
        ctx.beginPath();
        ctx.moveTo(prev.x, prev.c);
        ctx.lineTo(x, c);
        ctx.lineTo(x, c + 28);
        ctx.lineTo(prev.x, prev.c + 28);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = st.id === 'arcticcave' ? 'rgba(210,240,255,0.5)' : st.id === 'nuclear' ? 'rgba(90,220,120,0.4)' : 'rgba(0,0,0,0.35)';
        ctx.lineWidth = 0.05;
        ctx.beginPath();
        ctx.moveTo(prev.x, prev.c);
        ctx.lineTo(x, c);
        ctx.stroke();
        if (cut && prev.cut) {
          ctx.fillStyle = '#e7a36a';
          ctx.beginPath();
          ctx.moveTo(prev.x, prev.c);
          ctx.lineTo(x, c);
          ctx.lineTo(x, c - 0.42);
          ctx.lineTo(prev.x, prev.c - 0.42);
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = 'rgba(255,232,206,0.95)';
          ctx.lineWidth = 0.07;
          ctx.beginPath();
          ctx.moveTo(prev.x, prev.c + 0.03);
          ctx.lineTo(x, c + 0.03);
          ctx.stroke();
          ctx.fillStyle = rock;
        }
        if (st.id === 'nuclear' && (Math.floor(x) % 4) === 0) {
          ctx.strokeStyle = 'rgba(120,220,140,0.35)'; ctx.lineWidth = 0.04;
          ctx.beginPath(); ctx.moveTo(x, c); ctx.lineTo(x, c + 2.2); ctx.stroke();
        }
        if ((st.id === 'factory' || st.id === 'nuclear') && hash(T.seed + 91, Math.floor(x)) > 0.72) {
          ctx.fillStyle = st.id === 'nuclear' ? '#7dff9a' : '#ffe08a';
          ctx.fillRect(x - 0.12, c - 0.35, 0.24, 0.16);
          ctx.fillStyle = rock;
        }
      }
      if (c != null && cut && !(prev && prev.cut)) {
        ctx.strokeStyle = '#e7a36a';
        ctx.lineWidth = 0.22;
        ctx.beginPath();
        ctx.moveTo(x, c);
        ctx.lineTo(x, c - 1.15);
        ctx.stroke();
      } else if (prev && prev.cut && !cut && prev.c != null) {
        ctx.strokeStyle = '#e7a36a';
        ctx.lineWidth = 0.22;
        ctx.beginPath();
        ctx.moveTo(prev.x, prev.c);
        ctx.lineTo(prev.x, prev.c - 1.15);
        ctx.stroke();
      }
      if (st.stalactites && c != null && hash(T.seed + 96, Math.floor(x * 2)) > 0.35) {
        const long = hash(T.seed + 97, Math.floor(x * 2)) > 0.4;
        const drop = (st.id === 'arcticcave' ? 0.85 : 1.15) * (long ? 1.35 : 0.75);
        const col = st.id === 'arcticcave' ? '#d7f2ff' : (st.ceilingColor || '#14161c');
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.moveTo(x - 0.16, c);
        ctx.lineTo(x, c - drop);
        ctx.lineTo(x + 0.16, c);
        ctx.fill();
      }
      prev = { x, c, cut };
    }
  }

  function decorSpan(cam, cell) {
    const hw = W / 2 / cam.s + 5;
    return [Math.max(1, Math.floor((cam.x - hw) / cell)), Math.floor((cam.x + hw) / cell)];
  }
  function decorX(T, ci, cell) {
    return ci * cell + (hash(T.seed + 22, ci) * 0.5 + 0.5) * (cell * 0.62);
  }
  function decorShadow(x, y, w) {
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.beginPath();
    ctx.ellipse(x, y + 0.05, w, 0.09, 0, 0, TAU);
    ctx.fill();
  }
  function drawDecor(T, st, cam) {
    if (st.tufts) {
      const hw = W / 2 / cam.s + 1;
      const i0 = Math.floor((cam.x - hw) / STEP), i1 = Math.ceil((cam.x + hw) / STEP);
      const lush = st.id === 'skottland';
      const strokeTufts = (seed, color, width, gate, tall) => {
        ctx.strokeStyle = color; ctx.lineWidth = width; ctx.lineCap = 'round';
        ctx.beginPath();
        for (let i = i0; i <= i1; i++) {
          const hv = hash(T.seed + seed, i);
          if (hv < gate) continue;
          const x = i * STEP;
          if (gapContaining(T, x)) continue;
          const y = hIdx(T, i), hgt = (tall ? 0.36 : 0.22) + Math.abs(hv) * (tall ? 0.4 : 0.22);
          ctx.moveTo(x, y); ctx.lineTo(x - 0.08, y + hgt);
          ctx.moveTo(x + 0.1, y); ctx.lineTo(x + 0.14, y + hgt * 0.8);
        }
        ctx.stroke();
      };
      strokeTufts(31, lush ? '#1c7a2c' : st.grassDark, lush ? 0.06 : 0.06, st.tufts, lush);
      if (lush) strokeTufts(38, '#7ed46a', 0.04, 0.2, true);
    }
    if (st.id === 'mudpool' || st.id === 'bogland') {
      const cell = 6, [a, b] = decorSpan(cam, cell);
      ctx.strokeStyle = '#3e5c28'; ctx.lineWidth = 0.05;
      for (let ci = a; ci <= b; ci++) {
        if (hash(T.seed + 33, ci) < 0.35) continue;
        const x = decorX(T, ci, cell);
        if (gapContaining(T, x) || rampBump(T, x) > 0.2) continue;
        const y = hAt(T, x);
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 0.08, y + 0.55); ctx.moveTo(x + 0.1, y); ctx.lineTo(x + 0.16, y + 0.4); ctx.stroke();
      }
    }
    const kind = st.decor;
    if (kind === 'trees' || kind === 'jungle') {
      const cell = kind === 'jungle' ? 7 : (st.id === 'skottland' ? 16 : (st.slowTrees ? 9 : 14));
      const minH = kind === 'jungle' ? -0.25 : (st.id === 'skottland' ? 0.15 : (st.slowTrees ? 0.02 : 0.05));
        const leaf = kind === 'jungle' ? '#128824' : '#22c434';
      const [a, b] = decorSpan(cam, cell);
      for (let ci = a; ci <= b; ci++) {
        const hv = hash(T.seed + 21, ci);
        if (hv < minH) continue;
        const x = decorX(T, ci, cell);
        if (rampBump(T, x) > 0.2 || gapContaining(T, x)) continue;
        const y = hAt(T, x);
        let s = (kind === 'jungle' ? 1.25 : 1) * (0.85 + (hv * 0.5 + 0.5) * 0.35);
        if (st.id === 'skottland') s *= 0.92;
        let leafCol = leaf, leafHi = '#7ee36a';
        if (st.id === 'skottland') { leafCol = '#3f6a32'; leafHi = '#c6d48a'; }
        if (st.season) {
          const band = Math.floor(Math.max(0, x) / 380) % 4;
          leafCol = ['#1ed41c', '#e2c84a', '#e07a28', '#d5e8f4'][band];
          leafHi = ['#b8ff9a', '#fff1a8', '#ffd27a', '#ffffff'][band];
        }
        if (st.id === 'skottland' && hash(T.seed + 44, ci) > -0.15) {
          decorShadow(x, y, 0.38 * s);
          ctx.fillStyle = '#3d2814';
          ctx.fillRect(x - 0.08 * s, y, 0.16 * s, 0.55 * s);
          ctx.fillStyle = '#0e4a22';
          ctx.beginPath(); ctx.moveTo(x, y + 2.15 * s); ctx.lineTo(x - 0.55 * s, y + 0.45 * s); ctx.lineTo(x + 0.55 * s, y + 0.45 * s); ctx.fill();
          ctx.fillStyle = '#1f7a34';
          ctx.beginPath(); ctx.moveTo(x, y + 2.05 * s); ctx.lineTo(x - 0.42 * s, y + 0.72 * s); ctx.lineTo(x + 0.42 * s, y + 0.72 * s); ctx.fill();
          ctx.fillStyle = '#9aaa62';
          ctx.beginPath(); ctx.moveTo(x, y + 1.55 * s); ctx.lineTo(x - 0.2 * s, y + 0.98 * s); ctx.lineTo(x + 0.16 * s, y + 0.98 * s); ctx.fill();
          continue;
        }
        decorShadow(x, y, 0.45 * s);
        ctx.fillStyle = '#4a2e16';
        ctx.fillRect(x - 0.14 * s, y, 0.28 * s, 1.2 * s);
        ctx.fillStyle = '#6a4424';
        ctx.fillRect(x - 0.1 * s, y, 0.16 * s, 1.15 * s);
        const winter = st.season && Math.floor(Math.max(0, x) / 380) % 4 === 3;
        if (!winter) {
          if (st.id === 'skottland') {
            ctx.fillStyle = '#0c4e16';
            ctx.beginPath();
            ctx.arc(x, y + 1.55 * s, 0.78 * s, 0, TAU);
            ctx.arc(x - 0.42 * s, y + 1.2 * s, 0.48 * s, 0, TAU);
            ctx.arc(x + 0.4 * s, y + 1.25 * s, 0.5 * s, 0, TAU);
            ctx.fill();
          }
          ctx.fillStyle = '#146016';
          ctx.beginPath();
          ctx.arc(x, y + 1.42 * s, 0.62 * s, 0, TAU);
          ctx.arc(x - 0.34 * s, y + 1.16 * s, 0.4 * s, 0, TAU);
          ctx.arc(x + 0.34 * s, y + 1.16 * s, 0.4 * s, 0, TAU);
          ctx.fill();
          ctx.fillStyle = leafCol;
          ctx.beginPath();
          ctx.arc(x, y + 1.48 * s, 0.5 * s, 0, TAU);
          ctx.arc(x - 0.3 * s, y + 1.22 * s, 0.32 * s, 0, TAU);
          ctx.arc(x + 0.3 * s, y + 1.22 * s, 0.32 * s, 0, TAU);
          ctx.fill();
          ctx.fillStyle = leafHi;
          ctx.beginPath(); ctx.arc(x - 0.12 * s, y + 1.62 * s, 0.16 * s, 0, TAU); ctx.fill();
          if (st.id === 'skottland') {
            ctx.fillStyle = '#d8d090';
            ctx.beginPath(); ctx.arc(x - 0.08 * s, y + 1.78 * s, 0.12 * s, 0, TAU); ctx.fill();
          }
        } else {
          ctx.fillStyle = '#f7fbff';
          ctx.beginPath(); ctx.ellipse(x, y + 1.15 * s, 0.22 * s, 0.1 * s, 0, 0, TAU); ctx.fill();
        }
        if (kind === 'jungle') {
          ctx.strokeStyle = '#146b28'; ctx.lineWidth = 0.05;
          ctx.beginPath(); ctx.moveTo(x + 0.2 * s, y + 1.5 * s); ctx.quadraticCurveTo(x + 0.5 * s, y + 0.8 * s, x + 0.15 * s, y + 0.3 * s); ctx.stroke();
        }
        if (st.id === 'skottland' && ci % 2 === 0) {
          ctx.fillStyle = '#5a6830';
          ctx.beginPath(); ctx.arc(x + 0.7 * s, y + 0.16, 0.18, 0, TAU); ctx.fill();
        } else if ((st.id === 'countryside' || st.id === 'supercountry' || st.id === 'forest') && ci % 3 === 0) {
          ctx.fillStyle = st.id === 'forest' ? '#147a22' : '#1aaa22';
          ctx.beginPath(); ctx.arc(x + 0.7 * s, y + 0.22, 0.22, 0, TAU); ctx.fill();
          ctx.fillStyle = st.id === 'forest' ? '#0e5c16' : '#128818';
          ctx.beginPath(); ctx.arc(x + 0.95 * s, y + 0.12, 0.14, 0, TAU); ctx.fill();
        }
        if (st.id === 'countryside' && ci % 4 === 1) {
          ctx.fillStyle = ci % 8 === 1 ? '#f2e14a' : '#f25aa0';
          ctx.beginPath(); ctx.arc(x - 0.55, y + 0.12, 0.07, 0, TAU); ctx.fill();
        }
      }
    } else if (kind === 'cactus') {
      const cell = 16, [a, b] = decorSpan(cam, cell);
      for (let ci = a; ci <= b; ci++) {
        if (hash(T.seed + 21, ci) < 0.15) continue;
        const x = decorX(T, ci, cell);
        if (gapContaining(T, x)) continue;
        const y = hAt(T, x);
        decorShadow(x, y, 0.4);
        ctx.fillStyle = '#1d5c22';
        ctx.fillRect(x - 0.16, y, 0.32, 1.35);
        ctx.fillStyle = '#3cb84a';
        ctx.fillRect(x - 0.1, y + 0.08, 0.16, 1.2);
        ctx.fillStyle = '#1d5c22';
        ctx.fillRect(x - 0.52, y + 0.5, 0.4, 0.2);
        ctx.fillRect(x - 0.52, y + 0.5, 0.2, 0.48);
        ctx.fillRect(x + 0.1, y + 0.3, 0.42, 0.2);
        ctx.fillRect(x + 0.32, y + 0.3, 0.2, 0.42);
        ctx.fillStyle = '#7ee36a';
        ctx.fillRect(x - 0.08, y + 0.9, 0.06, 0.3);
        ctx.fillStyle = '#e23b4a';
        ctx.beginPath(); ctx.arc(x, y + 1.32, 0.08, 0, TAU); ctx.fill();
        if (hash(T.seed + 28, ci) > 0.2) {
          ctx.fillStyle = '#c9a24a';
          ctx.beginPath(); ctx.ellipse(x + 0.55, y + 0.15, 0.22, 0.08, 0, 0, TAU); ctx.fill();
        }
      }
    } else if (kind === 'pines') {
      const cell = 13, [a, b] = decorSpan(cam, cell);
      for (let ci = a; ci <= b; ci++) {
        const hv = hash(T.seed + 21, ci);
        if (hv < 0.05) continue;
        const x = decorX(T, ci, cell);
        if (gapContaining(T, x)) continue;
        let s = 0.8 + (hv * 0.5 + 0.5) * 0.5;
        if (st.id === 'arcticcave') {
          if (hv < 0.45) continue;
          s *= 0.72;
        }
        const y = hAt(T, x);
        const snow = st.id === 'mountain' ? '#3d6b4a' : '#e8f4ff';
        const snow2 = st.id === 'mountain' ? '#2a5238' : '#d5ecfb';
        decorShadow(x, y, 0.4 * s);
        ctx.fillStyle = '#3d2814';
        ctx.fillRect(x - 0.1 * s, y, 0.2 * s, 0.6 * s);
        ctx.fillStyle = '#1b3a28';
        ctx.beginPath(); ctx.moveTo(x, y + 2.35 * s); ctx.lineTo(x - 0.62 * s, y + 0.5 * s); ctx.lineTo(x + 0.62 * s, y + 0.5 * s); ctx.fill();
        ctx.fillStyle = snow;
        ctx.beginPath(); ctx.moveTo(x, y + 2.3 * s); ctx.lineTo(x - 0.5 * s, y + 0.58 * s); ctx.lineTo(x + 0.5 * s, y + 0.58 * s); ctx.fill();
        ctx.fillStyle = snow2;
        ctx.beginPath(); ctx.moveTo(x, y + 1.7 * s); ctx.lineTo(x - 0.38 * s, y + 0.4 * s); ctx.lineTo(x + 0.38 * s, y + 0.4 * s); ctx.fill();
        if (st.id === 'xmas' && ci % 2 === 0) {
          ctx.fillStyle = ci % 4 === 0 ? '#e23b2f' : '#ffd84a';
          ctx.beginPath(); ctx.arc(x + 0.12 * s, y + 1.15 * s, 0.08 * s, 0, TAU); ctx.fill();
          ctx.fillStyle = '#3a8a3a';
          ctx.beginPath(); ctx.arc(x - 0.16 * s, y + 0.7 * s, 0.07 * s, 0, TAU); ctx.fill();
        }
        if (st.id === 'xmas' && ci % 5 === 0) {
          ctx.fillStyle = '#c4473a';
          ctx.fillRect(x + 0.45, y, 0.32, 0.28);
          ctx.fillStyle = '#ffd84a';
          ctx.fillRect(x + 0.56, y, 0.08, 0.28);
          ctx.fillRect(x + 0.45, y + 0.1, 0.32, 0.08);
        }
      }
    } else if (kind === 'craters' || kind === 'asteroids') {
      const cell = 14, [a, b] = decorSpan(cam, cell);
      for (let ci = a; ci <= b; ci++) {
        const hv = hash(T.seed + 21, ci);
        if (hv < -0.15) continue;
        const x = decorX(T, ci, cell);
        if (rampBump(T, x) > 0.2 || gapContaining(T, x)) continue;
        const y = hAt(T, x), s = 0.75 + (hv + 0.15) * 0.45;
        ctx.fillStyle = st.groundDark;
        ctx.beginPath(); ctx.ellipse(x, y + 0.15, 0.9 * s, 0.45 * s, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.18)';
        ctx.beginPath(); ctx.ellipse(x - 0.2 * s, y + 0.28 * s, 0.35 * s, 0.16 * s, 0, 0, TAU); ctx.fill();
        if (hv > 0.2) {
          ctx.fillStyle = st.ground;
          ctx.beginPath(); ctx.ellipse(x + 0.7 * s, y + 0.12, 0.22 * s, 0.14 * s, 0, 0, TAU); ctx.fill();
        }
        if (kind === 'asteroids') {
          const ay = y + 1.3 + (hash(T.seed + 24, ci) * 0.5 + 0.5) * 2.2;
          ctx.fillStyle = '#5c6270';
          ctx.beginPath(); ctx.ellipse(x + 0.48, ay, 0.5, 0.34, hv, 0, TAU); ctx.fill();
          ctx.fillStyle = '#c5cad4';
          ctx.beginPath(); ctx.ellipse(x + 0.4, ay + 0.06, 0.28, 0.16, hv, 0, TAU); ctx.fill();
        }
      }
    } else if (kind === 'barriers') {
      const cell = 18, [a, b] = decorSpan(cam, cell);
      for (let ci = a; ci <= b; ci++) {
        if (hash(T.seed + 21, ci) < 0.2) continue;
        const x = decorX(T, ci, cell);
        if (gapContaining(T, x)) continue;
        const y = hAt(T, x);
        decorShadow(x, y, 0.7);
        ctx.fillStyle = '#6a4424';
        ctx.fillRect(x - 0.85, y, 0.12, 0.85);
        ctx.fillRect(x + 0.73, y, 0.12, 0.85);
        ctx.fillStyle = '#222';
        ctx.fillRect(x - 0.7, y + 0.12, 1.4, 0.7);
        for (let k = 0; k < 4; k++) {
          ctx.fillStyle = k % 2 ? '#f5d20a' : '#222';
          ctx.fillRect(x - 0.7 + k * 0.35, y + 0.27, 0.35, 0.4);
        }
        if (st.id === 'construction') {
          ctx.fillStyle = '#f5d20a';
          ctx.beginPath(); ctx.moveTo(x + 1.05, y); ctx.lineTo(x + 1.2, y + 0.45); ctx.lineTo(x + 0.9, y + 0.45); ctx.fill();
        }
        if (st.id === 'bootcamp') {
          ctx.fillStyle = '#6a6840';
          ctx.fillRect(x - 1.15, y, 0.7, 0.28);
          ctx.fillRect(x - 1.05, y + 0.22, 0.7, 0.22);
          ctx.fillStyle = '#4a4a28';
          ctx.fillRect(x - 1.1, y + 0.08, 0.55, 0.08);
        }
      }
    } else if (kind === 'buildings') {
      const cell = 8, [a, b] = decorSpan(cam, cell);
      for (let ci = a; ci <= b; ci++) {
        const x = ci * cell + 0.4;
        if (gapContaining(T, x) || gapContaining(T, x + 2)) continue;
        const y = hAt(T, x);
        const bw = 2.6, bh = 1.5 + (hash(T.seed + 23, ci) * 0.5 + 0.5) * 2;
        decorShadow(x + bw / 2, y, bw * 0.45);
        ctx.fillStyle = '#3a4048';
        ctx.fillRect(x - 0.06, y, bw + 0.12, bh + 0.08);
        ctx.fillStyle = ci % 2 ? '#8b939e' : '#6d7380';
        ctx.fillRect(x, y, bw, bh);
        ctx.fillStyle = '#d7e6f2';
        ctx.fillRect(x, y + bh - 0.12, bw, 0.12);
        ctx.fillStyle = '#9ad7ff';
        ctx.fillRect(x + 0.3, y + 0.4, 0.4, 0.35);
        ctx.fillRect(x + 1.1, y + 0.4, 0.4, 0.35);
        ctx.fillStyle = '#16324a';
        ctx.fillRect(x + 0.38, y + 0.48, 0.16, 0.16);
        ctx.fillRect(x + 1.18, y + 0.48, 0.16, 0.16);
      }
    } else if (kind === 'london') {
      const cell = 16, [a, b] = decorSpan(cam, cell);
      const drawTerrace = (x, y, w) => {
        decorShadow(x + w / 2, y, w * 0.5);
        ctx.fillStyle = '#2a2018';
        ctx.fillRect(x - 0.06, y, w + 0.12, 1.35);
        ctx.fillStyle = '#8b4a38';
        ctx.fillRect(x, y + 0.06, w, 1.22);
        ctx.fillStyle = '#a05842';
        ctx.fillRect(x + 0.08, y + 0.12, w - 0.16, 0.35);
        ctx.fillStyle = '#f0ece4';
        for (let wi = 0; wi < 4; wi++) ctx.fillRect(x + 0.2 + wi * 0.42, y + 0.55, 0.28, 0.32);
        ctx.fillStyle = '#2a2420';
        ctx.fillRect(x + w * 0.38, y + 0.88, 0.32, 0.4);
        ctx.fillStyle = '#6a5a50';
        for (let cp = 0; cp < 3; cp++) ctx.fillRect(x + 0.35 + cp * 0.55, y + 1.28, 0.12, 0.14);
        ctx.strokeStyle = '#2a2018';
        ctx.lineWidth = 0.05;
        ctx.strokeRect(x, y + 0.06, w, 1.22);
      };
      const drawPhoneBox = (x, y) => {
        decorShadow(x + 0.22, y, 0.35);
        ctx.fillStyle = '#1a1010';
        ctx.fillRect(x - 0.04, y, 0.52, 1.05);
        ctx.fillStyle = '#c81828';
        ctx.fillRect(x, y + 0.06, 0.44, 0.92);
        ctx.fillStyle = '#e8e4dc';
        ctx.fillRect(x + 0.08, y + 0.22, 0.28, 0.48);
        ctx.strokeStyle = '#a01018';
        ctx.lineWidth = 0.04;
        ctx.strokeRect(x + 0.08, y + 0.22, 0.28, 0.48);
        ctx.fillStyle = '#c81828';
        ctx.beginPath();
        ctx.arc(x + 0.22, y + 0.06, 0.24, Math.PI, 0);
        ctx.fill();
      };
      const drawBus = (x, y) => {
        decorShadow(x + 1.1, y, 1.0);
        ctx.fillStyle = '#1a1010';
        ctx.fillRect(x - 0.06, y + 0.12, 2.32, 0.88);
        ctx.fillStyle = '#c81828';
        ctx.fillRect(x, y + 0.18, 2.2, 0.76);
        ctx.fillStyle = '#8ec8e8';
        for (let wi = 0; wi < 5; wi++) ctx.fillRect(x + 0.18 + wi * 0.38, y + 0.28, 0.28, 0.38);
        ctx.fillStyle = '#1a1010';
        ctx.beginPath(); ctx.arc(x + 0.35, y + 0.12, 0.18, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.arc(x + 1.85, y + 0.12, 0.18, 0, TAU); ctx.fill();
      };
      const drawTaxi = (x, y) => {
        decorShadow(x + 0.55, y, 0.5);
        ctx.fillStyle = '#0a0a0c';
        ctx.fillRect(x - 0.04, y + 0.08, 1.18, 0.72);
        ctx.fillStyle = '#1a1a1e';
        ctx.fillRect(x, y + 0.14, 1.1, 0.62);
        ctx.fillStyle = '#2a2a30';
        ctx.fillRect(x + 0.12, y + 0.28, 0.55, 0.32);
        ctx.fillStyle = '#f5e050';
        ctx.fillRect(x + 0.38, y + 0.78, 0.34, 0.1);
        ctx.fillStyle = '#0a0a0c';
        ctx.beginPath(); ctx.arc(x + 0.22, y + 0.08, 0.14, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.arc(x + 0.88, y + 0.08, 0.14, 0, TAU); ctx.fill();
      };
      const drawPlaneTree = (x, y) => {
        decorShadow(x, y, 0.55);
        ctx.fillStyle = '#4a4038';
        ctx.fillRect(x - 0.1, y, 0.2, 1.05);
        ctx.fillStyle = '#6a5a48';
        ctx.fillRect(x - 0.06, y + 0.15, 0.12, 0.75);
        ctx.fillStyle = '#1a4028';
        ctx.beginPath();
        ctx.arc(x, y + 1.35, 0.75, 0, TAU);
        ctx.fill();
        ctx.fillStyle = '#2a5838';
        ctx.beginPath();
        ctx.arc(x - 0.2, y + 1.25, 0.45, 0, TAU);
        ctx.arc(x + 0.25, y + 1.28, 0.4, 0, TAU);
        ctx.fill();
      };
      const drawLamp = (x, y) => {
        decorShadow(x, y, 0.2);
        ctx.fillStyle = '#1a1a1e';
        ctx.fillRect(x - 0.05, y, 0.1, 1.15);
        ctx.fillStyle = '#f5d850';
        ctx.beginPath();
        ctx.arc(x, y + 1.18, 0.14, 0, TAU);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,230,140,0.35)';
        ctx.beginPath();
        ctx.arc(x, y + 1.18, 0.22, 0, TAU);
        ctx.fill();
      };
      for (let ci = a; ci <= b; ci++) {
        const x = decorX(T, ci, cell);
        if (gapContaining(T, x) || rampBump(T, x) > 0.2) continue;
        const y = hAt(T, x);
        const slot = ((ci % 6) + 6) % 6;
        if (slot === 0) drawTerrace(x, y, 2.8);
        else if (slot === 1) drawPhoneBox(x + 0.3, y);
        else if (slot === 2) drawBus(x, y);
        else if (slot === 3) drawTaxi(x + 0.5, y);
        else if (slot === 4) drawPlaneTree(x + 0.4, y);
        else drawLamp(x + 0.6, y);
      }
    } else if (kind === 'houses') {
      const cell = 16, [a, b] = decorSpan(cam, cell);
      for (let ci = a; ci <= b; ci++) {
        if (hash(T.seed + 21, ci) < -0.2) continue;
        const x = decorX(T, ci, cell);
        if (gapContaining(T, x)) continue;
        const y = hAt(T, x), bw = 2.1, bh = 1.25;
        decorShadow(x + bw / 2, y, bw * 0.5);
        ctx.fillStyle = '#6a4424';
        ctx.fillRect(x - 0.04, y, bw + 0.08, bh);
        ctx.fillStyle = ci % 2 ? '#f4efe4' : '#f7f3ea';
        ctx.fillRect(x, y + 0.06, bw, bh - 0.06);
        ctx.fillStyle = ci % 3 ? '#c4473a' : '#3a6ec4';
        ctx.beginPath();
        ctx.moveTo(x - 0.15, y + bh); ctx.lineTo(x + bw / 2, y + bh + 0.85); ctx.lineTo(x + bw + 0.15, y + bh);
        ctx.fill();
        ctx.fillStyle = '#9ad7ff';
        ctx.fillRect(x + 0.28, y + 0.55, 0.4, 0.35);
        ctx.fillStyle = '#222';
        ctx.fillRect(x + bw * 0.42, y, 0.38, 0.7);
      }
    } else if (kind === 'palms') {
      const cell = 15, [a, b] = decorSpan(cam, cell);
      for (let ci = a; ci <= b; ci++) {
        if (hash(T.seed + 21, ci) < 0.1) continue;
        const x = decorX(T, ci, cell);
        if (gapContaining(T, x)) continue;
        const y = hAt(T, x);
        ctx.strokeStyle = '#6a4420'; ctx.lineWidth = 0.16;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + 0.45, y + 0.7, x + 0.1, y + 1.85); ctx.stroke();
        ctx.strokeStyle = '#c48a3a'; ctx.lineWidth = 0.06;
        ctx.beginPath(); ctx.moveTo(x + 0.04, y); ctx.quadraticCurveTo(x + 0.4, y + 0.7, x + 0.12, y + 1.7); ctx.stroke();
        ctx.fillStyle = '#1f8a38';
        for (let k = 0; k < 6; k++) {
          const ang = -1.05 + k * 0.42;
          ctx.beginPath();
          ctx.ellipse(x + 0.1 + Math.cos(ang) * 0.48, y + 1.85 + Math.sin(ang) * 0.2, 0.48, 0.13, ang, 0, TAU);
          ctx.fill();
        }
        ctx.fillStyle = '#2fbf52';
        ctx.beginPath(); ctx.ellipse(x + 0.1, y + 1.9, 0.16, 0.1, 0, 0, TAU); ctx.fill();
      }
    } else if (kind === 'crates') {
      const cell = 12, [a, b] = decorSpan(cam, cell);
      for (let ci = a; ci <= b; ci++) {
        if (hash(T.seed + 21, ci) < 0.05) continue;
        const x = decorX(T, ci, cell);
        if (gapContaining(T, x)) continue;
        const y = hAt(T, x);
        ctx.fillStyle = st.id === 'nuclear' ? '#7a8a48' : '#c48a3a';
        ctx.strokeStyle = st.id === 'nuclear' ? '#2a4a22' : '#6a4a18';
        ctx.lineWidth = 0.05;
        ctx.beginPath(); ctx.rect(x, y, 0.7, 0.7); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x, y + 0.35); ctx.lineTo(x + 0.7, y + 0.35); ctx.moveTo(x + 0.35, y); ctx.lineTo(x + 0.35, y + 0.7); ctx.stroke();
      }
    } else if (kind === 'scrap') {
      const cell = 11, [a, b] = decorSpan(cam, cell);
      for (let ci = a; ci <= b; ci++) {
        if (hash(T.seed + 21, ci) < -0.05) continue;
        const x = decorX(T, ci, cell);
        if (gapContaining(T, x)) continue;
        const y = hAt(T, x);
        const warm = st.id === 'action';
        decorShadow(x + 0.5, y, 0.6);
        ctx.fillStyle = warm ? '#a86848' : '#8a929a'; ctx.fillRect(x, y + 0.08, 1.15, 0.4);
        ctx.fillStyle = warm ? '#6a4030' : '#5c656e'; ctx.fillRect(x, y, 1.15, 0.28);
        ctx.fillStyle = '#3a1c18'; ctx.beginPath(); ctx.arc(x + 0.35, y + 0.5, 0.3, 0, TAU); ctx.fill();
        ctx.fillStyle = warm ? '#e05028' : '#a33b32'; ctx.beginPath(); ctx.arc(x + 0.35, y + 0.5, 0.22, 0, TAU); ctx.fill();
        ctx.fillStyle = warm ? '#f0c8a0' : '#d7dde4'; ctx.fillRect(x + 0.55, y + 0.32, 0.7, 0.28);
        ctx.fillStyle = warm ? '#4a2820' : '#3e4650'; ctx.fillRect(x + 0.6, y + 0.36, 0.55, 0.16);
      }
    } else if (kind === 'neon') {
      const cell = 10, [a, b] = decorSpan(cam, cell);
      const cols = ['#ff4fd8', '#39f3ff', '#f6ff4a'];
      for (let ci = a; ci <= b; ci++) {
        const x = decorX(T, ci, cell);
        if (gapContaining(T, x)) continue;
        const y = hAt(T, x);
        ctx.fillStyle = '#120816'; ctx.fillRect(x, y, 0.12, 2.1);
        ctx.fillStyle = cols[Math.abs(ci) % 3];
        ctx.fillRect(x - 0.28, y + 1.95, 0.68, 0.16);
      }
    } else if (kind === 'dead') {
      const cell = 12, [a, b] = decorSpan(cam, cell);
      for (let ci = a; ci <= b; ci++) {
        if (hash(T.seed + 21, ci) < 0.05) continue;
        const x = decorX(T, ci, cell);
        if (gapContaining(T, x)) continue;
        const y = hAt(T, x);
        decorShadow(x, y, 0.35);
        ctx.strokeStyle = '#1a1210'; ctx.lineWidth = 0.16; ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(x, y); ctx.lineTo(x + 0.08, y + 1.15); ctx.lineTo(x - 0.45, y + 1.6);
        ctx.moveTo(x + 0.08, y + 0.7); ctx.lineTo(x + 0.48, y + 1.2);
        ctx.moveTo(x + 0.08, y + 0.95); ctx.lineTo(x - 0.2, y + 1.25);
        ctx.stroke();
        ctx.strokeStyle = '#5a4038'; ctx.lineWidth = 0.07;
        ctx.stroke();
      }
    } else if (kind === 'blobs') {
      const cell = 10, [a, b] = decorSpan(cam, cell);
      for (let ci = a; ci <= b; ci++) {
        const hv = hash(T.seed + 21, ci);
        if (hv < -0.1) continue;
        const x = decorX(T, ci, cell);
        if (gapContaining(T, x)) continue;
        const y = hAt(T, x), s = 0.7 + (hv + 0.1) * 0.4;
        decorShadow(x + 0.35 * s, y, 0.4 * s);
        ctx.fillStyle = st.grassDark;
        ctx.beginPath(); ctx.ellipse(x + 0.4 * s, y + 0.2 * s, 0.55 * s, 0.32 * s, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = st.grass;
        ctx.beginPath(); ctx.ellipse(x, y + 0.28 * s, 0.7 * s, 0.4 * s, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.28)';
        ctx.beginPath(); ctx.ellipse(x - 0.15 * s, y + 0.4 * s, 0.2 * s, 0.1 * s, 0, 0, TAU); ctx.fill();
      }
    } else if (kind === 'veggies') {
      const cell = 8, cols = ['#e23b2f', '#f28b20', '#f2d23a', '#3cae3a'];
      const [a, b] = decorSpan(cam, cell);
      for (let ci = a; ci <= b; ci++) {
        if (hash(T.seed + 21, ci) < 0.1) continue;
        const x = decorX(T, ci, cell);
        if (gapContaining(T, x)) continue;
        const y = hAt(T, x);
        ctx.fillStyle = cols[Math.abs(ci) % 4];
        ctx.beginPath(); ctx.arc(x, y + 0.26, 0.26, 0, TAU); ctx.fill();
        ctx.fillStyle = '#2f8a28';
        ctx.fillRect(x - 0.04, y, 0.08, 0.2);
      }
    }
    const extraCell = 20;
    const [ea, eb] = decorSpan(cam, extraCell);
    if (st.id === 'highway' || st.id === 'megahighway') {
      for (let ci = ea; ci <= eb; ci++) {
        if (hash(T.seed + 40, ci) < 0.35) continue;
        const x = decorX(T, ci, extraCell);
        if (gapContaining(T, x)) continue;
        const y = hAt(T, x);
        ctx.fillStyle = '#2a2e34';
        ctx.fillRect(x, y, 0.08, 1.7);
        ctx.fillStyle = '#f5e27a';
        ctx.beginPath(); ctx.arc(x + 0.04, y + 1.75, 0.16, 0, TAU); ctx.fill();
      }
    } else if (st.id === 'volcano') {
      for (let ci = ea; ci <= eb; ci++) {
        if (hash(T.seed + 40, ci) < 0.4) continue;
        const x = decorX(T, ci, extraCell);
        if (gapContaining(T, x)) continue;
        const y = hAt(T, x);
        ctx.fillStyle = '#1a1210';
        ctx.beginPath();
        ctx.moveTo(x - 0.2, y); ctx.lineTo(x, y + 0.7); ctx.lineTo(x + 0.22, y); ctx.fill();
        ctx.fillStyle = '#ff6a22';
        ctx.fillRect(x - 0.05, y + 0.5, 0.1, 0.12);
      }
    } else if (st.id === 'arena') {
      for (let ci = ea; ci <= eb; ci += 2) {
        const x = ci * extraCell + 1;
        if (gapContaining(T, x)) continue;
        const y = hAt(T, x);
        ctx.fillStyle = '#f4efe4';
        ctx.fillRect(x, y, 0.06, 1.3);
        ctx.fillStyle = ci % 4 === 0 ? '#e23b2f' : '#3a6ec4';
        ctx.beginPath();
        ctx.moveTo(x + 0.06, y + 1.3); ctx.lineTo(x + 0.5, y + 1.05); ctx.lineTo(x + 0.06, y + 0.8); ctx.fill();
      }
    } else if (st.id === 'suburbs') {
      for (let ci = ea; ci <= eb; ci++) {
        if (hash(T.seed + 40, ci) < 0.2) continue;
        const x = decorX(T, ci, extraCell) + 2.4;
        if (gapContaining(T, x)) continue;
        const y = hAt(T, x);
        ctx.fillStyle = '#4a4a4e';
        ctx.fillRect(x, y, 0.06, 0.7);
        ctx.fillStyle = '#1a4a8a';
        ctx.fillRect(x - 0.12, y + 0.55, 0.32, 0.22);
      }
    } else if (st.id === 'forest') {
      for (let ci = ea; ci <= eb; ci++) {
        if (hash(T.seed + 41, ci) < 0.25) continue;
        const x = decorX(T, ci, 9);
        if (gapContaining(T, x)) continue;
        const y = hAt(T, x);
        ctx.fillStyle = '#e8e4dc';
        ctx.beginPath(); ctx.arc(x, y + 0.1, 0.1, 0, TAU); ctx.fill();
        ctx.fillStyle = '#c44a3a';
        ctx.beginPath(); ctx.arc(x + 0.16, y + 0.08, 0.08, 0, TAU); ctx.fill();
      }
    } else if (st.id === 'beach') {
      for (let ci = ea; ci <= eb; ci++) {
        if (hash(T.seed + 40, ci) < 0.45) continue;
        const x = decorX(T, ci, extraCell);
        if (gapContaining(T, x)) continue;
        const y = hAt(T, x);
        ctx.strokeStyle = '#f4efe4'; ctx.lineWidth = 0.05;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 1.15); ctx.stroke();
        ctx.fillStyle = ci % 2 ? '#e23b4a' : '#3a8ad4';
        ctx.beginPath();
        ctx.arc(x, y + 1.15, 0.42, Math.PI, 0); ctx.fill();
      }
    } else if (st.id === 'roller') {
      for (let ci = ea; ci <= eb; ci += 2) {
        const x = ci * extraCell;
        if (gapContaining(T, x)) continue;
        const y = hAt(T, x);
        ctx.fillStyle = '#f5e27a';
        ctx.beginPath();
        ctx.moveTo(x, y + 0.9); ctx.lineTo(x + 0.28, y + 0.7); ctx.lineTo(x, y + 0.5); ctx.fill();
      }
    } else if (st.id === 'skottland') {
      const cell = 11, [a, b] = decorSpan(cam, cell);
      for (let ci = a; ci <= b; ci++) {
        const hv = hash(T.seed + 40, ci);
        const x = decorX(T, ci, cell);
        if (gapContaining(T, x) || rampBump(T, x) > 0.2) continue;
        const y = hAt(T, x);
        if (hv > -0.2) {
          ctx.fillStyle = '#5a3068';
          ctx.beginPath(); ctx.arc(x - 0.18, y + 0.08, 0.12, 0, TAU); ctx.fill();
          ctx.fillStyle = '#8a4a98';
          ctx.beginPath(); ctx.arc(x, y + 0.14, 0.14, 0, TAU); ctx.fill();
          ctx.fillStyle = '#b06cc4';
          ctx.beginPath(); ctx.arc(x + 0.18, y + 0.1, 0.12, 0, TAU); ctx.fill();
        }
        if (hv < -0.35) {
          ctx.strokeStyle = '#6a6430';
          ctx.lineWidth = 0.035;
          ctx.lineCap = 'round';
          const fx = x + 0.55;
          for (let k = 0; k < 3; k++) {
            const lean = (k - 1) * 0.14;
            ctx.beginPath();
            ctx.moveTo(fx, y);
            ctx.quadraticCurveTo(fx + lean, y + 0.22, fx + lean * 1.2, y + 0.4);
            ctx.stroke();
          }
          ctx.lineCap = 'butt';
        }
        if (ci % 5 === 0) {
          const gx = x - 0.75;
          ctx.fillStyle = '#5a7030';
          ctx.beginPath(); ctx.arc(gx, y + 0.18, 0.16, 0, TAU); ctx.fill();
          ctx.fillStyle = '#e2c44a';
          ctx.beginPath(); ctx.arc(gx - 0.05, y + 0.24, 0.04, 0, TAU); ctx.fill();
          ctx.beginPath(); ctx.arc(gx + 0.06, y + 0.2, 0.035, 0, TAU); ctx.fill();
        }
        if (hv > 0.72) {
          const bx = x + 1.05;
          ctx.strokeStyle = '#d8efe0';
          ctx.lineWidth = 0.02;
          ctx.beginPath(); ctx.moveTo(bx, y); ctx.lineTo(bx, y + 0.32); ctx.stroke();
          ctx.fillStyle = '#f7fbf8';
          ctx.beginPath(); ctx.arc(bx, y + 0.36, 0.06, 0, TAU); ctx.fill();
        }
        if (hv > 0.62) {
          const sx = x + 1.6;
          ctx.fillStyle = '#111';
          ctx.fillRect(sx - 0.1, y, 0.05, 0.1);
          ctx.fillRect(sx + 0.1, y, 0.05, 0.1);
          ctx.fillStyle = '#f7f7f4';
          ctx.beginPath(); ctx.ellipse(sx, y + 0.18, 0.34, 0.2, 0, 0, TAU); ctx.fill();
          ctx.beginPath(); ctx.ellipse(sx + 0.28, y + 0.24, 0.12, 0.1, 0, 0, TAU); ctx.fill();
          ctx.fillStyle = '#111';
          ctx.beginPath(); ctx.arc(sx + 0.34, y + 0.26, 0.03, 0, TAU); ctx.fill();
        }
      }
    } else if (st.id === 'china') {
      const cell = 14, [a, b] = decorSpan(cam, cell);
      for (let ci = a; ci <= b; ci++) {
        const hv = hash(T.seed + 40, ci);
        const x = decorX(T, ci, cell);
        if (gapContaining(T, x) || rampBump(T, x) > 0.2) continue;
        const y = hAt(T, x);
        decorShadow(x + 0.45, y, 0.85);
        if (hv > -0.35) {
          const stems = 5 + Math.floor((hv * 0.5 + 0.5) * 3);
          for (let k = 0; k < stems; k++) {
            const bx = x - 0.25 + k * 0.15;
            const bend = hash(T.seed + 52 + k, ci) * 0.12;
            const top = y + 1.7 + (k % 3) * 0.3 + Math.abs(hv) * 0.35;
            ctx.strokeStyle = '#174f24'; ctx.lineWidth = 0.09;
            ctx.beginPath(); ctx.moveTo(bx, y); ctx.lineTo(bx + bend, top); ctx.stroke();
            ctx.strokeStyle = '#59a64f'; ctx.lineWidth = 0.045;
            ctx.beginPath(); ctx.moveTo(bx - 0.015, y + 0.06); ctx.lineTo(bx + bend - 0.015, top); ctx.stroke();
            ctx.strokeStyle = '#d7b45e'; ctx.lineWidth = 0.028;
            for (let n = 1; n <= 3; n++) {
              const ny = y + n * (top - y) / 4;
              ctx.beginPath(); ctx.moveTo(bx - 0.06, ny); ctx.lineTo(bx + 0.08, ny); ctx.stroke();
            }
            ctx.fillStyle = k % 2 ? '#367f39' : '#4aa347';
            ctx.beginPath(); ctx.ellipse(bx + bend + 0.18, top - 0.12, 0.27, 0.075, -0.48, 0, TAU); ctx.fill();
            ctx.fillStyle = '#75bd62';
            ctx.beginPath(); ctx.ellipse(bx + bend - 0.13, top - 0.34, 0.22, 0.06, 0.5, 0, TAU); ctx.fill();
          }
        }
        if (ci % 4 === 1) {
          const lx = x + 1.3;
          const ly = y + 1.2;
          ctx.fillStyle = 'rgba(255,196,72,0.18)';
          ctx.beginPath(); ctx.arc(lx, ly - 0.03, 0.35, 0, TAU); ctx.fill();
          ctx.fillStyle = '#8f151c';
          ctx.beginPath(); ctx.ellipse(lx, ly, 0.21, 0.3, 0, 0, TAU); ctx.fill();
          ctx.fillStyle = '#e52f32';
          ctx.beginPath(); ctx.ellipse(lx - 0.04, ly + 0.05, 0.14, 0.24, 0, 0, TAU); ctx.fill();
          ctx.fillStyle = '#f6d76a';
          ctx.fillRect(lx - 0.13, ly + 0.24, 0.26, 0.055);
          ctx.fillRect(lx - 0.11, ly - 0.28, 0.22, 0.05);
          ctx.strokeStyle = '#f6d76a'; ctx.lineWidth = 0.025;
          ctx.beginPath(); ctx.moveTo(lx, ly - 0.28); ctx.lineTo(lx, ly - 0.42); ctx.stroke();
          ctx.fillStyle = '#e8c35a';
          ctx.beginPath();
          ctx.moveTo(lx - 0.05, ly - 0.3); ctx.lineTo(lx, ly - 0.48); ctx.lineTo(lx + 0.05, ly - 0.3);
          ctx.closePath(); ctx.fill();
        }
        if (ci % 8 === 3) {
          const px = x + 2.25;
          ctx.fillStyle = '#5a2c18';
          ctx.fillRect(px - 0.55, y, 1.1, 0.43);
          ctx.fillStyle = '#f0d7a0';
          ctx.fillRect(px - 0.38, y + 0.08, 0.28, 0.25);
          ctx.fillRect(px + 0.1, y + 0.08, 0.28, 0.25);
          for (let k = 0; k < 3; k++) {
            const w = 0.95 - k * 0.18;
            const py = y + 0.42 + k * 0.48;
            ctx.fillStyle = '#7e1f25';
            ctx.beginPath();
            ctx.moveTo(px - w, py); ctx.lineTo(px - w * 0.28, py + 0.14);
            ctx.lineTo(px, py + 0.36); ctx.lineTo(px + w * 0.28, py + 0.14);
            ctx.lineTo(px + w, py);
            ctx.closePath(); ctx.fill();
            ctx.fillStyle = '#f2d56a';
            ctx.fillRect(px - w * 0.13, py + 0.03, w * 0.26, 0.055);
            if (k < 2) {
              ctx.fillStyle = '#6a3218';
              ctx.fillRect(px - 0.34 + k * 0.08, py, 0.12, 0.43);
              ctx.fillRect(px + 0.22 - k * 0.08, py, 0.12, 0.43);
            }
          }
          ctx.fillStyle = '#f2d56a';
          ctx.beginPath(); ctx.arc(px, y + 1.88, 0.075, 0, TAU); ctx.fill();
        } else if (ci % 3 === 0) {
          const rx = x + 1.7, rs = 0.35 + Math.abs(hv) * 0.25;
          ctx.fillStyle = '#4f665b';
          ctx.beginPath();
          ctx.moveTo(rx - rs, y); ctx.quadraticCurveTo(rx - rs * 0.7, y + rs * 0.75, rx, y + rs);
          ctx.quadraticCurveTo(rx + rs * 0.7, y + rs * 0.7, rx + rs, y);
          ctx.closePath(); ctx.fill();
          ctx.fillStyle = '#819b88';
          ctx.beginPath(); ctx.ellipse(rx - rs * 0.2, y + rs * 0.62, rs * 0.28, rs * 0.12, -0.4, 0, TAU); ctx.fill();
        }
        if (ci % 5 === 2) {
          const fx = x - 0.65;
          ctx.strokeStyle = '#744022'; ctx.lineWidth = 0.045;
          ctx.beginPath(); ctx.moveTo(fx, y); ctx.lineTo(fx + 0.05, y + 0.7); ctx.stroke();
          const petals = ['#ffcad8', '#f6a8bf', '#fff0f4'];
          for (let k = 0; k < 5; k++) {
            const a = k * TAU / 5;
            ctx.fillStyle = petals[(ci + k) % petals.length];
            ctx.beginPath();
            ctx.ellipse(fx + 0.05 + Math.cos(a) * 0.12, y + 0.7 + Math.sin(a) * 0.12, 0.09, 0.045, a, 0, TAU);
            ctx.fill();
          }
          ctx.fillStyle = '#f0c43c';
          ctx.beginPath(); ctx.arc(fx + 0.05, y + 0.7, 0.035, 0, TAU); ctx.fill();
        }
        if (hash(T.seed + 77, ci) > 0.55 && ci % 8 !== 3) {
          const wx = x - 1.5;
          ctx.strokeStyle = '#6a4020'; ctx.lineWidth = 0.08;
          ctx.beginPath(); ctx.moveTo(wx, y); ctx.quadraticCurveTo(wx + 0.25, y + 0.85, wx, y + 1.55); ctx.stroke();
          ctx.strokeStyle = '#3f8a3a'; ctx.lineWidth = 0.03;
          for (let k = 0; k < 6; k++) {
            const ox = (k - 2.5) * 0.14;
            ctx.beginPath();
            ctx.moveTo(wx + ox * 0.25, y + 1.25);
            ctx.quadraticCurveTo(wx + ox, y + 0.55, wx + ox * 1.3, y + 0.12);
            ctx.stroke();
          }
        }
        if (ci % 13 === 0) {
          const mx = x + 3.1;
          ctx.fillStyle = '#b4232c';
          ctx.fillRect(mx - 0.95, y, 0.32, 1.2);
          ctx.fillRect(mx + 0.63, y, 0.32, 1.2);
          ctx.strokeStyle = '#b4232c'; ctx.lineWidth = 0.22;
          ctx.beginPath(); ctx.arc(mx, y + 0.85, 0.55, 0, TAU); ctx.stroke();
          ctx.fillStyle = '#e8c36a';
          ctx.fillRect(mx - 0.95, y + 1.2, 0.32, 0.07);
          ctx.fillRect(mx + 0.63, y + 1.2, 0.32, 0.07);
        }
      }
    }
  }

  function drawShadow(w) {
    const b = w.body;
    if (gapContaining(w.T, b.x)) return;
    const gy = rideHeight(w.T, b.x), hgt = Math.max(0, b.y - gy);
    const n = normalAt(w.T, b.x);
    let span = 0;
    for (const p of w.def.hull) span = Math.max(span, Math.abs(p[0]));
    ctx.fillStyle = `rgba(0,0,0,${clamp(0.3 - hgt * 0.035, 0, 0.3)})`;
    ctx.beginPath(); ctx.ellipse(b.x, gy + 0.05, span * (1 + hgt * 0.05), 0.2, Math.atan2(-n.x, n.y), 0, TAU); ctx.fill();
  }

  function drawPickups(T, cam) {
    const hw = W / 2 / cam.s + 2;
    const t = performance.now() / 1000;
    for (const p of T.pickups) {
      if (p.taken || p.x < cam.x - hw || p.x > cam.x + hw) continue;
      if (p.type === 'coin') {
        const r = p.v === 100 ? 0.72 : p.v === 25 ? 0.48 : 0.28;
        const sx = Math.abs(Math.cos(t * 3 + p.x));
        ctx.save(); ctx.translate(p.x, p.y); ctx.scale(Math.max(0.15, sx), 1);
        ctx.fillStyle = '#f5c518';
        ctx.strokeStyle = '#8a6300';
        ctx.lineWidth = 0.07;
        ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.arc(0, 0, r * 0.6, 0, TAU); ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.beginPath(); ctx.arc(-r * 0.35, r * 0.35, r * 0.18, 0, TAU); ctx.fill();
        ctx.restore();
        const gl = (t * 1.5 + p.x * 0.37) % 3;
        if (gl < 0.25) {
          const g = Math.sin((gl / 0.25) * Math.PI) * r * 0.9;
          ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 0.05;
          ctx.beginPath(); ctx.moveTo(p.x + r * 0.4 - g, p.y + r * 0.4); ctx.lineTo(p.x + r * 0.4 + g, p.y + r * 0.4);
          ctx.moveTo(p.x + r * 0.4, p.y + r * 0.4 - g); ctx.lineTo(p.x + r * 0.4, p.y + r * 0.4 + g); ctx.stroke();
        }
      } else if (p.type === 'veg') {
        ctx.save(); ctx.translate(p.x, p.y + Math.sin(t * 3) * 0.06);
        ctx.fillStyle = '#3cb82e'; ctx.strokeStyle = '#1d5c20'; ctx.lineWidth = 0.04;
        ctx.beginPath(); ctx.arc(0, 0, 0.22, 0, TAU); ctx.fill(); ctx.stroke();
        ctx.strokeStyle = '#217818'; ctx.lineWidth = 0.05;
        ctx.beginPath(); ctx.moveTo(0, 0.16); ctx.quadraticCurveTo(0.12, 0.32, 0.02, 0.42); ctx.stroke();
        ctx.restore();
      } else if (p.type === 'nitro') {
        ctx.save(); ctx.translate(p.x, p.y + Math.sin(t * 4) * 0.08);
        ctx.fillStyle = '#e8521a'; ctx.strokeStyle = '#7a2a08'; ctx.lineWidth = 0.06;
        ctx.beginPath(); ctx.rect(-0.28, -0.4, 0.56, 0.78); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#ffd84a';
        ctx.beginPath();
        ctx.moveTo(0, -0.22); ctx.lineTo(0.16, 0.02); ctx.lineTo(0.02, 0.02); ctx.lineTo(0.1, 0.28); ctx.lineTo(-0.12, 0.02); ctx.lineTo(0.02, 0.02); ctx.closePath();
        ctx.fill();
        ctx.restore();
      } else {
        ctx.save(); ctx.translate(p.x, p.y + Math.sin(t * 3) * 0.08);
        ctx.fillStyle = '#3dce45'; ctx.strokeStyle = '#146b18'; ctx.lineWidth = 0.06;
        ctx.beginPath(); ctx.rect(-0.32, -0.42, 0.64, 0.8); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#146b18'; ctx.fillRect(0.06, 0.38, 0.18, 0.14);
        ctx.strokeStyle = '#0d4a10'; ctx.lineWidth = 0.08;
        ctx.beginPath(); ctx.moveTo(-0.22, 0.38); ctx.lineTo(-0.22, 0.5); ctx.lineTo(0, 0.5); ctx.stroke();
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 0.08;
        ctx.beginPath(); ctx.moveTo(-0.1, -0.25); ctx.lineTo(-0.1, 0.2); ctx.lineTo(0.15, 0.2);
        ctx.moveTo(-0.1, 0); ctx.lineTo(0.1, 0); ctx.stroke();
        ctx.restore();
      }
    }
  }

  function drawParticles(ps, blastPass) {
    for (const p of ps) {
      const blast = blastKind(p.kind);
      if (blastPass !== blast) continue;
      const alpha = (p.life / p.max) * (p.kind === 'blood' ? 0.92 : p.kind === 'smoke' ? 0.55 : blast ? 0.94 : 0.7);
      if (p.kind === 'debris') {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot || 0);
        ctx.fillStyle = p.fill || '#888';
        ctx.strokeStyle = 'rgba(20,16,12,0.55)';
        ctx.lineWidth = 0.04;
        if (p.wheel) {
          ctx.beginPath();
          ctx.arc(0, 0, p.r, 0, TAU);
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = '#1a1a1a';
          ctx.beginPath();
          ctx.arc(0, 0, p.r * 0.35, 0, TAU);
          ctx.fill();
        } else {
          ctx.fillRect(-p.rw, -p.rh, p.rw * 2, p.rh * 2);
          ctx.strokeRect(-p.rw, -p.rh, p.rw * 2, p.rh * 2);
        }
        ctx.restore();
        continue;
      }
      if (p.kind === 'shock') {
        ctx.strokeStyle = `rgba(${p.c},${alpha})`;
        ctx.lineWidth = 0.16 + (p.life / p.max) * 0.42;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, TAU);
        ctx.stroke();
        continue;
      }
      ctx.fillStyle = `rgba(${p.c},${alpha})`;
      if (p.kind === 'blood' && !p.ground && Math.hypot(p.vx, p.vy) > 1.8) {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(Math.atan2(p.vy, p.vx));
        ctx.beginPath();
        ctx.ellipse(0, 0, p.r * 2.4, p.r * 0.65, 0, 0, TAU);
        ctx.fill();
        ctx.restore();
      } else if (p.kind === 'glob') {
        ctx.fillStyle = `rgba(${p.c},${alpha * 0.35})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * 1.8, 0, TAU);
        ctx.fill();
        ctx.fillStyle = `rgba(${p.c},${alpha})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, TAU);
        ctx.fill();
      } else if (blast) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, TAU);
        ctx.fill();
        if (p.kind === 'boom' || p.kind === 'boomCore' || p.kind === 'smoke') {
          ctx.fillStyle = `rgba(${p.c},${alpha * (p.kind === 'smoke' ? 0.22 : 0.4)})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r * (p.kind === 'boomCore' ? 1.7 : 1.45), 0, TAU);
          ctx.fill();
        }
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, TAU);
        ctx.fill();
      }
    }
  }

  function mathArc(c, x, y, r, a0, a1, n) {
    const steps = n || 10;
    c.beginPath();
    for (let i = 0; i <= steps; i++) {
      const a = a0 + (a1 - a0) * (i / steps);
      const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r;
      if (i === 0) c.moveTo(px, py); else c.lineTo(px, py);
    }
  }

  function drawWheel(c, x, y, r, ang, def) {
    const bike = def.bike;
    const knobby = !!def.treads;
    const chevron = knobby && r > 0.7;
    c.save();
    c.translate(x, y);
    c.rotate(ang);
    c.fillStyle = '#14161a';
    c.beginPath(); c.arc(0, 0, r, 0, TAU); c.fill();
    c.strokeStyle = '#3a414a';
    c.lineWidth = r * 0.09;
    c.beginPath(); c.arc(0, 0, r * 0.9, 0, TAU); c.stroke();
    c.strokeStyle = bike ? '#3c424a' : '#4a515a';
    c.lineWidth = r * (bike ? 0.07 : 0.1);
    c.beginPath(); c.arc(0, 0, r * (bike ? 0.84 : 0.8), 0, TAU); c.stroke();
    c.fillStyle = '#101114';
    const n = chevron ? 8 : knobby ? 10 : bike ? 14 : 12;
    for (let i = 0; i < n; i++) {
      c.save();
      c.rotate((i / n) * TAU);
      if (chevron) {
        c.strokeStyle = '#0c0d10';
        c.lineWidth = r * 0.07;
        c.lineCap = 'round';
        c.beginPath();
        c.moveTo(-r * 0.16, r * 0.78);
        c.lineTo(0, r * 0.98);
        c.lineTo(r * 0.16, r * 0.78);
        c.stroke();
      } else {
        const bw = knobby ? r * 0.26 : r * (bike ? 0.07 : 0.13);
        const bh = knobby ? r * 0.14 : r * (bike ? 0.08 : 0.1);
        c.fillRect(-bw / 2, r - bh, bw, bh);
      }
      c.restore();
    }
    if (bike) {
      c.fillStyle = '#22262c';
      c.beginPath(); c.arc(0, 0, r * 0.7, 0, TAU); c.fill();
      c.strokeStyle = shade(def.rim, -0.25);
      c.lineWidth = r * 0.035;
      c.beginPath(); c.arc(0, 0, r * 0.58, 0, TAU); c.stroke();
      const rg = c.createRadialGradient(-r * 0.1, r * 0.12, r * 0.02, 0, 0, r * 0.4);
      rg.addColorStop(0, shade(def.rim, 0.45));
      rg.addColorStop(0.6, def.rim);
      rg.addColorStop(1, shade(def.rim, -0.35));
      c.fillStyle = rg;
      c.beginPath(); c.arc(0, 0, r * 0.22, 0, TAU); c.fill();
      c.strokeStyle = 'rgba(226,232,238,0.8)';
      c.lineWidth = Math.max(0.015, r * 0.03);
      c.lineCap = 'round';
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * TAU;
        c.beginPath();
        c.moveTo(Math.cos(a) * r * 0.24, Math.sin(a) * r * 0.24);
        c.lineTo(Math.cos(a) * r * 0.66, Math.sin(a) * r * 0.66);
        c.stroke();
      }
    } else if (def.wheelStyle === 'aero') {
      c.strokeStyle = '#d5dbe1';
      c.lineWidth = r * 0.055;
      c.beginPath(); c.arc(0, 0, r * 0.78, 0, TAU); c.stroke();
      const dish = c.createRadialGradient(-r * 0.08, r * 0.1, r * 0.05, 0, 0, r * 0.72);
      dish.addColorStop(0, '#d5dce3');
      dish.addColorStop(0.5, '#9aa3ac');
      dish.addColorStop(1, '#4e565e');
      c.fillStyle = dish;
      c.beginPath(); c.arc(0, 0, r * 0.72, 0, TAU); c.fill();
      c.fillStyle = '#14171b';
      for (let i = 0; i < 5; i++) {
        c.save();
        c.rotate((i / 5) * TAU + 0.15);
        c.beginPath();
        c.moveTo(-r * 0.09, r * 0.13);
        c.lineTo(-r * 0.2, r * 0.69);
        c.lineTo(r * 0.2, r * 0.69);
        c.lineTo(r * 0.09, r * 0.13);
        c.closePath();
        c.fill();
        c.restore();
      }
      c.fillStyle = '#101214';
      c.beginPath(); c.arc(0, 0, r * 0.14, 0, TAU); c.fill();
      c.fillStyle = '#e8eef3';
      c.beginPath(); c.arc(-r * 0.03, r * 0.035, r * 0.035, 0, TAU); c.fill();
    } else {
      c.fillStyle = '#2a3038';
      c.beginPath(); c.arc(0, 0, r * 0.58, 0, TAU); c.fill();
      const rg = c.createRadialGradient(-r * 0.16, r * 0.16, r * 0.04, 0, 0, r * 0.52);
      rg.addColorStop(0, shade(def.rim, 0.45));
      rg.addColorStop(0.55, def.rim);
      rg.addColorStop(1, shade(def.rim, -0.4));
      c.fillStyle = rg;
      c.beginPath(); c.arc(0, 0, r * 0.5, 0, TAU); c.fill();
      c.strokeStyle = shade(def.rim, -0.48);
      c.lineWidth = r * 0.085;
      c.lineCap = 'round';
      const spokes = knobby ? 6 : 5;
      for (let i = 0; i < spokes; i++) {
        const a = (i / spokes) * TAU + 0.15;
        c.beginPath();
        c.moveTo(Math.cos(a) * r * 0.16, Math.sin(a) * r * 0.16);
        c.lineTo(Math.cos(a) * r * 0.46, Math.sin(a) * r * 0.46);
        c.stroke();
      }
      c.fillStyle = shade(def.rim, -0.3);
      c.beginPath(); c.arc(0, 0, r * 0.15, 0, TAU); c.fill();
      c.fillStyle = shade(def.rim, 0.5);
      c.beginPath(); c.arc(-r * 0.04, r * 0.045, r * 0.055, 0, TAU); c.fill();
    }
    c.restore();
    c.save();
    c.translate(x, y);
    c.strokeStyle = 'rgba(255,255,255,0.55)';
    c.lineWidth = Math.max(0.018, r * 0.035);
    c.lineCap = 'round';
    mathArc(c, 0, 0, r * 0.9, Math.PI * 0.55, Math.PI * 0.95, 8);
    c.stroke();
    c.restore();
  }

  function bodyGradient(c, x0, y0, x1, y1, col) {
    const top = Math.max(y0, y1), bot = Math.min(y0, y1);
    const g = c.createLinearGradient(0, bot, 0, top);
    g.addColorStop(0, shade(col, -0.34));
    g.addColorStop(0.45, col);
    g.addColorStop(1, shade(col, 0.4));
    return g;
  }
  function metalGradient(c, y0, y1) {
    const top = Math.max(y0, y1), bot = Math.min(y0, y1);
    const g = c.createLinearGradient(0, bot, 0, top);
    g.addColorStop(0, '#6d7680');
    g.addColorStop(0.5, '#c5ced6');
    g.addColorStop(1, '#eef3f7');
    return g;
  }
  function fillShell(c, trace, col, y0, y1) {
    const top = Math.max(y0, y1), bot = Math.min(y0, y1);
    trace();
    c.fillStyle = bodyGradient(c, 0, bot, 0, top, col);
    c.fill();
    c.save();
    trace();
    c.clip();
    const shellH = top - bot;
    const bandH = Math.min(shellH * 0.22, 0.16);
    const band = c.createLinearGradient(0, top - bandH, 0, top);
    band.addColorStop(0, 'rgba(255,255,255,0)');
    band.addColorStop(1, 'rgba(255,255,255,0.35)');
    c.fillStyle = band;
    c.fillRect(-20, top - bandH, 40, bandH);
    if (shellH > 0.5) {
      c.strokeStyle = shade(col, -0.42);
      c.lineWidth = 0.028;
      c.beginPath();
      c.moveTo(-20, bot + (top - bot) * 0.36);
      c.lineTo(20, bot + (top - bot) * 0.36);
      c.stroke();
    }
    c.restore();
    trace();
    c.strokeStyle = '#1a1a1a';
    c.lineWidth = 0.055;
    c.lineJoin = 'round';
    c.lineCap = 'round';
    c.stroke();
  }
  function glass(c, pts) {
    c.beginPath();
    c.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]);
    c.closePath();
    c.fillStyle = 'rgba(150,205,230,0.92)';
    c.fill();
    c.strokeStyle = '#143044';
    c.lineWidth = 0.03;
    c.lineJoin = 'round';
    c.stroke();
    c.strokeStyle = '#1a1a1a';
    c.lineWidth = 0.045;
    c.stroke();
    const a = pts[0], b = pts[1];
    c.fillStyle = 'rgba(255,255,255,0.8)';
    c.beginPath();
    c.moveTo(a[0], a[1]);
    c.lineTo(a[0] * 0.84 + b[0] * 0.16, a[1] * 0.84 + b[1] * 0.16);
    c.lineTo(a[0] * 0.7 + b[0] * 0.3, a[1] * 0.52 + b[1] * 0.48);
    c.lineTo(a[0] * 0.92 + b[0] * 0.08, a[1] * 0.6 + b[1] * 0.4);
    c.closePath();
    c.fill();
  }
  function windshield(c, pts) { glass(c, pts); }

  function roundRect(c, x, y, w, h, r) {
    const rr = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
    c.beginPath();
    c.moveTo(x + rr, y); c.lineTo(x + w - rr, y); c.quadraticCurveTo(x + w, y, x + w, y + rr);
    c.lineTo(x + w, y + h - rr); c.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
    c.lineTo(x + rr, y + h); c.quadraticCurveTo(x, y + h, x, y + h - rr);
    c.lineTo(x, y + rr); c.quadraticCurveTo(x, y, x + rr, y); c.closePath();
  }

  function chassis(c, x0, x1, y) {
    c.fillStyle = '#1e2228';
    roundRect(c, x0, y, x1 - x0, 0.1, 0.04);
    c.fill();
    c.strokeStyle = '#8b939c';
    c.lineWidth = 0.02;
    c.beginPath();
    c.moveTo(x0 + 0.06, y + 0.08);
    c.lineTo(x1 - 0.06, y + 0.08);
    c.stroke();
  }
  function lamp(c, x, y, kind) {
    const warm = kind !== 'tail';
    c.fillStyle = warm ? '#3a4048' : '#5a2424';
    roundRect(c, x - 0.13, y - 0.09, 0.26, 0.18, 0.08);
    c.fill();
    c.strokeStyle = warm ? '#ffe7a8' : '#ff3b3b';
    c.lineWidth = 0.02;
    c.stroke();
    c.fillStyle = warm ? '#ffe7a8' : '#ff3b3b';
    roundRect(c, x - 0.09, y - 0.055, 0.18, 0.11, 0.05);
    c.fill();
    c.fillStyle = 'rgba(255,255,255,0.85)';
    c.beginPath(); c.arc(x - 0.03, y + 0.03, 0.022, 0, TAU); c.fill();
    if (warm) {
      c.fillStyle = 'rgba(255,236,170,0.16)';
      c.beginPath();
      c.moveTo(x + 0.08, y);
      c.lineTo(x + 0.85, y + 0.18);
      c.lineTo(x + 0.85, y - 0.2);
      c.closePath();
      c.fill();
    }
  }
  function headlight(c, x, y) { lamp(c, x, y, 'head'); }
  function taillight(c, x, y) { lamp(c, x, y, 'tail'); }
  function grille(c, x, y, w, h, slots) {
    c.fillStyle = '#2c3138';
    roundRect(c, x, y, w, h, 0.03);
    c.fill();
    c.strokeStyle = '#1a1a1a';
    c.lineWidth = 0.03;
    c.stroke();
    c.strokeStyle = '#9aa3ad';
    c.lineWidth = 0.03;
    c.lineCap = 'round';
    const n = Math.max(2, slots);
    for (let i = 0; i < n; i++) {
      const yy = y + 0.04 + (h - 0.08) * (n === 1 ? 0.5 : i / (n - 1));
      c.strokeStyle = i === n - 1 ? '#eef3f7' : '#9aa3ad';
      c.beginPath();
      c.moveTo(x + 0.03, yy);
      c.lineTo(x + w - 0.03, yy);
      c.stroke();
    }
  }
  function shock(c, x0, y0, x1, y1, kind) {
    const heavy = kind === 'heavy';
    const mode = heavy ? 'strut' : kind;
    const dx = x1 - x0, dy = y1 - y0;
    const L = Math.hypot(dx, dy) || 1;
    const px = -dy / L, py = dx / L;
    c.lineCap = 'round';
    c.lineJoin = 'round';
    c.strokeStyle = '#2a2e34';
    c.lineWidth = heavy ? 0.12 : mode === 'strut' ? 0.075 : 0.055;
    if (mode === 'fork') {
      c.beginPath();
      c.moveTo(x0 + px * 0.045, y0 + py * 0.045);
      c.lineTo(x1 + px * 0.045, y1 + py * 0.045);
      c.moveTo(x0 - px * 0.045, y0 - py * 0.045);
      c.lineTo(x1 - px * 0.045, y1 - py * 0.045);
      c.stroke();
      c.strokeStyle = '#c5ced6';
      c.lineWidth = 0.02;
      c.beginPath();
      c.moveTo(x0 + px * 0.02, y0 + py * 0.02);
      c.lineTo(x1 + px * 0.02, y1 + py * 0.02);
      c.stroke();
    } else if (mode === 'swing') {
      c.lineWidth = 0.08;
      c.beginPath();
      c.moveTo(x0, y0);
      c.quadraticCurveTo((x0 + x1) / 2, (y0 + y1) / 2 + py * 0.08, x1, y1);
      c.stroke();
    } else {
      const mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
      c.beginPath();
      c.moveTo(x0, y0);
      c.lineTo(mx, my);
      c.lineTo(x1, y1);
      c.stroke();
      c.strokeStyle = '#c5ced6';
      c.lineWidth = heavy ? 0.05 : 0.035;
      c.beginPath();
      for (let i = 0; i <= 7; i++) {
        const t = 0.48 + i * 0.06;
        const ox = (i % 2 ? 1 : -1) * (heavy ? 0.1 : 0.07);
        const sx = x0 + dx * t + px * ox;
        const sy = y0 + dy * t + py * ox;
        if (i === 0) c.moveTo(sx, sy); else c.lineTo(sx, sy);
      }
      c.stroke();
    }
    c.fillStyle = '#3a4048';
    c.beginPath(); c.arc(x0, y0, 0.045, 0, TAU); c.fill();
    c.beginPath(); c.arc(x1, y1, 0.04, 0, TAU); c.fill();
  }
  function flare(c, x, y, w, h, col) {
    c.beginPath();
    c.moveTo(x - w, y);
    c.quadraticCurveTo(x, y + h, x + w, y);
    c.lineTo(x + w * 0.78, y - 0.02);
    c.quadraticCurveTo(x, y + h * 0.55, x - w * 0.78, y - 0.02);
    c.closePath();
    c.fillStyle = bodyGradient(c, x - w, y - 0.02, x + w, y + h, col);
    c.fill();
    c.strokeStyle = '#1a1a1a';
    c.lineWidth = 0.04;
    c.stroke();
    c.strokeStyle = 'rgba(255,255,255,0.38)';
    c.lineWidth = 0.025;
    c.beginPath();
    c.moveTo(x - w * 0.4, y + h * 0.15);
    c.quadraticCurveTo(x, y + h * 0.7, x + w * 0.35, y + h * 0.12);
    c.stroke();
  }
  function bolts(c, pts) {
    for (const p of pts) {
      c.fillStyle = '#66707a';
      c.beginPath(); c.arc(p[0], p[1], 0.04, 0, TAU); c.fill();
      c.fillStyle = '#d5dde4';
      c.beginPath(); c.arc(p[0] - 0.008, p[1] + 0.008, 0.009, 0, TAU); c.fill();
    }
  }
  function doorHandle(c, x, y) {
    c.fillStyle = '#3e4650';
    roundRect(c, x, y, 0.16, 0.05, 0.02);
    c.fill();
    c.strokeStyle = '#c5ced6';
    c.lineWidth = 0.015;
    c.stroke();
  }
  function seatPad(c, x, y, w, h) {
    c.fillStyle = '#24282e';
    roundRect(c, x, y, w, h, 0.04);
    c.fill();
    c.strokeStyle = '#1a1a1a';
    c.lineWidth = 0.03;
    c.stroke();
    c.fillStyle = 'rgba(255,255,255,0.18)';
    c.fillRect(x + 0.04, y + h * 0.55, Math.max(0.08, w - 0.08), Math.max(0.02, h * 0.25));
  }
  function exhaustPipe(c, def) {
    if (!def.exhaust) return;
    const e = def.exhaust;
    c.strokeStyle = '#1a1a1a';
    c.lineWidth = 0.03;
    if (e.y > 0.7) {
      c.fillStyle = metalGradient(c, 0.45, e.y);
      roundRect(c, e.x - 0.05, 0.48, 0.1, e.y - 0.4, 0.04);
      c.fill(); c.stroke();
      c.fillStyle = '#2a2e32';
      c.beginPath(); c.ellipse(e.x, e.y + 0.06, 0.07, 0.04, 0, 0, TAU); c.fill();
      c.strokeStyle = '#eef3f7'; c.lineWidth = 0.015;
      c.beginPath(); c.moveTo(e.x - 0.02, 0.55); c.lineTo(e.x - 0.02, e.y - 0.05); c.stroke();
    } else {
      c.fillStyle = metalGradient(c, e.y - 0.06, e.y + 0.06);
      roundRect(c, e.x - 0.2, e.y - 0.045, 0.26, 0.09, 0.04);
      c.fill(); c.stroke();
      c.fillStyle = '#2a2e32';
      c.beginPath(); c.ellipse(e.x - 0.2, e.y, 0.035, 0.045, 0, 0, TAU); c.fill();
      c.strokeStyle = '#eef3f7'; c.lineWidth = 0.015;
      c.beginPath(); c.moveTo(e.x - 0.16, e.y + 0.02); c.lineTo(e.x - 0.02, e.y + 0.02); c.stroke();
    }
  }

  function drawJeep(c, def) {
    const ol = '#1a1a1a';
    c.lineWidth = 0.055; c.strokeStyle = ol; c.lineJoin = 'round'; c.lineCap = 'round';
    chassis(c, -1.5, 1.5, -0.28);
    c.fillStyle = bodyGradient(c, -1.55, -0.22, 1.6, 0.42, def.color);
    c.beginPath();
    c.moveTo(-1.55, -0.22); c.lineTo(1.48, -0.22); c.lineTo(1.62, 0.02); c.lineTo(1.5, 0.38);
    c.lineTo(0.55, 0.42); c.lineTo(-1.55, 0.38); c.closePath();
    c.fill(); c.stroke();
    c.fillStyle = shade(def.color, -0.18);
    c.fillRect(-1.5, 0.08, 2.95, 0.07);
    c.strokeStyle = '#444'; c.lineWidth = 0.07;
    c.beginPath(); c.moveTo(-0.55, 0.38); c.lineTo(-0.55, -0.1); c.stroke();
    c.fillStyle = '#3a3a3a'; roundRect(c, 0.55, -0.08, 0.85, 0.28, 0.04); c.fill();
    for (let i = 0; i < 4; i++) { c.fillStyle = '#222'; c.fillRect(0.62 + i * 0.18, -0.02, 0.1, 0.16); }
    c.fillStyle = '#666'; roundRect(c, 1.48, -0.18, 0.18, 0.16, 0.03); c.fill();
    glass(c, [[-1.02, 1.05], [-0.36, 1.05], [-0.34, 0.46], [-1.05, 0.44]]);
    glass(c, [[-0.18, 1.05], [0.42, 1.05], [0.32, 0.48], [-0.18, 0.46]]);
    c.strokeStyle = '#2a2e34'; c.lineWidth = 0.11; c.lineCap = 'round'; c.lineJoin = 'round';
    c.beginPath(); c.moveTo(-1.15, 0.38); c.lineTo(-1.05, 1.12); c.lineTo(0.5, 1.12); c.lineTo(0.38, 0.42); c.stroke();
    c.strokeStyle = '#c5ced6'; c.lineWidth = 0.035;
    c.beginPath(); c.moveTo(-1.08, 0.52); c.lineTo(-1.0, 1.06); c.lineTo(0.42, 1.06); c.stroke();
    c.strokeStyle = ol; c.lineWidth = 0.05;
    c.beginPath(); c.moveTo(-0.28, 0.38); c.lineTo(-0.28, 1.12); c.stroke();
    c.fillStyle = '#2a2a2a'; c.beginPath(); c.arc(-1.55, 0.12, 0.22, 0, TAU); c.fill(); c.strokeStyle = ol; c.lineWidth = 0.04; c.stroke();
    c.strokeStyle = '#888'; c.lineWidth = 0.025; c.beginPath(); c.arc(-1.55, 0.12, 0.1, 0, TAU); c.stroke();
    c.fillStyle = '#c5ced6'; c.beginPath(); c.arc(-1.55, 0.12, 0.04, 0, TAU); c.fill();
    for (let i = 0; i < 3; i++) {
      const a = -0.4 + (i / 3) * TAU;
      c.fillStyle = '#eef3f7';
      c.beginPath(); c.arc(-1.55 + Math.cos(a) * 0.1, 0.12 + Math.sin(a) * 0.1, 0.028, 0, TAU); c.fill();
    }
    c.fillStyle = '#444'; c.fillRect(-1.78, -0.12, 0.22, 0.1);
    headlight(c, 1.55, 0.14); taillight(c, -1.58, 0.22);
  }

  function drawDirtBike(c, def) {
    const col = def.color;
    c.strokeStyle = '#2a2e34';
    c.lineWidth = 0.07;
    c.lineCap = 'round';
    c.lineJoin = 'round';
    c.beginPath();
    c.moveTo(-0.72, -0.02);
    c.lineTo(-0.2, 0.36);
    c.lineTo(0.38, 0.34);
    c.lineTo(0.48, 0.08);
    c.lineTo(-0.15, -0.02);
    c.moveTo(-0.55, 0.28);
    c.lineTo(-0.85, -0.08);
    c.moveTo(0.4, 0.55);
    c.lineTo(0.85, -0.08);
    c.stroke();
    c.fillStyle = '#3a4048';
    roundRect(c, -0.32, -0.06, 0.5, 0.3, 0.04); c.fill();
    c.strokeStyle = '#1a1a1a'; c.lineWidth = 0.035; c.stroke();
    c.strokeStyle = '#1a1a1a'; c.lineWidth = 0.02;
    for (let i = 0; i < 4; i++) {
      c.beginPath();
      c.moveTo(-0.26, -0.01 + i * 0.06);
      c.lineTo(0.12, -0.01 + i * 0.06);
      c.stroke();
    }
    fillShell(c, () => {
      c.beginPath();
      c.moveTo(-0.48, 0.16);
      c.quadraticCurveTo(-0.15, 0.5, 0.28, 0.46);
      c.quadraticCurveTo(0.48, 0.28, 0.22, 0.16);
      c.quadraticCurveTo(-0.05, 0.1, -0.48, 0.16);
      c.closePath();
    }, col, 0.12, 0.5);
    seatPad(c, -0.78, 0.28, 0.62, 0.1);
    c.strokeStyle = shade(col, -0.15);
    c.lineWidth = 0.07;
    c.lineCap = 'round';
    mathArc(c, 0.85, -0.4, 0.52, Math.PI * 0.28, Math.PI * 0.82, 8);
    c.stroke();
    c.strokeStyle = '#1a1a1a';
    c.lineWidth = 0.055;
    c.beginPath();
    c.moveTo(0.32, 0.48);
    c.quadraticCurveTo(0.5, 0.7, def.hand.x, def.hand.y);
    c.moveTo(0.28, 0.42);
    c.lineTo(def.hand.x - 0.08, def.hand.y - 0.04);
    c.stroke();
    c.fillStyle = '#f4f4f4';
    roundRect(c, 0.52, 0.0, 0.32, 0.24, 0.03); c.fill();
    c.strokeStyle = '#1a1a1a'; c.lineWidth = 0.03; c.stroke();
    c.fillStyle = '#1a1a1a';
    c.fillRect(0.62, 0.08, 0.12, 0.04);
    c.fillRect(0.66, 0.06, 0.04, 0.1);
    bolts(c, [[-0.15, 0.08], [0.22, 0.1]]);
    c.strokeStyle = '#1a1a1a'; c.lineWidth = 0.025;
    c.beginPath(); c.moveTo(-0.72, -0.18); c.lineTo(-0.22, 0.08); c.stroke();
    c.strokeStyle = '#3a4048'; c.lineWidth = 0.05;
    mathArc(c, -0.85, -0.4, 0.5, Math.PI * 0.15, Math.PI * 0.7, 8); c.stroke();
  }

  function drawMonster(c, def) {
    const col = def.color;
    chassis(c, -1.6, 1.6, -0.16);
    fillShell(c, () => {
      c.beginPath();
      c.moveTo(-1.72, -0.02);
      c.lineTo(-1.72, 0.58);
      c.lineTo(-0.95, 0.64);
      c.lineTo(-1.05, 1.02);
      c.quadraticCurveTo(-0.72, 1.32, -0.15, 1.28);
      c.quadraticCurveTo(0.32, 1.22, 0.42, 0.82);
      c.lineTo(0.72, 0.6);
      c.quadraticCurveTo(1.3, 0.52, 1.68, 0.28);
      c.lineTo(1.72, -0.02);
      c.closePath();
    }, col, -0.02, 1.28);
    flare(c, -1.35, 0.02, 0.95, 0.34, col);
    flare(c, 1.35, 0.02, 0.95, 0.32, col);
    fillShell(c, () => {
      c.beginPath();
      c.moveTo(0.82, 0.48);
      c.quadraticCurveTo(1.05, 0.82, 1.32, 0.5);
      c.lineTo(0.95, 0.46);
      c.closePath();
    }, col, 0.46, 0.82);
    glass(c, [[-0.62, 1.14], [0.12, 1.1], [0.2, 0.74], [-0.55, 0.72]]);
    c.strokeStyle = shade(col, -0.4);
    c.lineWidth = 0.03;
    roundRect(c, -0.78, 0.08, 0.95, 0.52, 0.08);
    c.stroke();
    doorHandle(c, -0.05, 0.32);
    c.beginPath();
    c.moveTo(-1.2, 0.16);
    c.lineTo(-0.72, 0.4);
    c.lineTo(-0.15, 0.16);
    c.lineTo(0.35, 0.4);
    c.strokeStyle = '#1a1a1a';
    c.lineWidth = 0.09;
    c.lineJoin = 'round';
    c.lineCap = 'round';
    c.stroke();
    c.strokeStyle = '#ffd84a';
    c.lineWidth = 0.05;
    c.stroke();
    c.strokeStyle = '#d5dde6';
    c.lineWidth = 0.08;
    c.beginPath();
    c.moveTo(1.5, -0.02);
    c.quadraticCurveTo(1.92, 0.02, 1.9, 0.28);
    c.quadraticCurveTo(1.7, 0.1, 1.42, 0.16);
    c.stroke();
    grille(c, 1.42, 0.05, 0.2, 0.28, 4);
    c.strokeStyle = '#8b939c'; c.lineWidth = 0.035; c.lineCap = 'round'; c.lineJoin = 'round';
    for (const x of [-0.72, -0.52, 0.55, 0.75]) {
      c.beginPath();
      c.moveTo(x, 0.02);
      for (let i = 0; i < 5; i++) c.lineTo(x + (i % 2 ? 0.07 : -0.07), 0.08 + i * 0.05);
      c.lineTo(x, 0.34);
      c.stroke();
    }
    lamp(c, 1.58, 0.32, 'head');
    lamp(c, -1.62, 0.28, 'tail');
    c.strokeStyle = '#2a2e34'; c.lineWidth = 0.08; c.lineCap = 'round'; c.lineJoin = 'round';
    c.beginPath();
    c.moveTo(-1.68, 0.52); c.lineTo(-1.58, 0.98); c.lineTo(-0.9, 0.98); c.lineTo(-1.02, 0.58);
    c.stroke();
    c.strokeStyle = '#c5ced6'; c.lineWidth = 0.03;
    c.beginPath(); c.moveTo(-1.6, 0.68); c.lineTo(-1.52, 0.92); c.lineTo(-1.0, 0.9); c.stroke();
    c.fillStyle = '#2a2e34';
    roundRect(c, -0.62, 1.16, 0.95, 0.1, 0.03); c.fill();
    c.fillStyle = '#ffe7a8';
    for (let i = 0; i < 4; i++) { c.beginPath(); c.arc(-0.5 + i * 0.22, 1.21, 0.04, 0, TAU); c.fill(); }
    bolts(c, [[-1.4, 0.08], [1.15, 0.08]]);
    seatPad(c, -0.62, 0.46, 0.4, 0.1);
  }

  function drawRover(c, def) {
    const col = def.color;
    c.strokeStyle = '#8b949e';
    c.lineWidth = 0.06;
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(-1.55, -0.08); c.lineTo(1.55, -0.08);
    c.moveTo(-1.55, 0.2); c.lineTo(1.55, 0.2);
    c.moveTo(-1.25, -0.22); c.lineTo(-1.25, 0.36);
    c.moveTo(0, -0.22); c.lineTo(0, 0.32);
    c.moveTo(1.25, -0.22); c.lineTo(1.25, 0.36);
    c.stroke();
    fillShell(c, () => {
      roundRect(c, -1.45, -0.02, 2.9, 0.28, 0.06);
    }, col, -0.02, 0.26);
    c.strokeStyle = shade(col, -0.25);
    c.lineWidth = 0.025;
    c.beginPath();
    c.moveTo(-0.9, 0.0); c.lineTo(-0.9, 0.24);
    c.moveTo(-0.2, 0.0); c.lineTo(-0.2, 0.24);
    c.moveTo(0.55, 0.0); c.lineTo(0.55, 0.24);
    c.stroke();
    bolts(c, [[-1.35, 0.16], [-0.55, 0.16], [0.2, 0.16], [1.15, 0.16], [-1.35, 0.04], [1.15, 0.04]]);
    c.fillStyle = '#c9a24a';
    roundRect(c, 0.35, 0.24, 0.85, 0.28, 0.04); c.fill();
    c.strokeStyle = '#1a1a1a'; c.lineWidth = 0.04; c.stroke();
    c.fillStyle = 'rgba(255,255,255,0.35)';
    c.fillRect(0.42, 0.4, 0.7, 0.05);
    seatPad(c, -0.78, 0.22, 0.55, 0.1);
    c.strokeStyle = '#2a2e34';
    c.lineWidth = 0.05;
    c.beginPath();
    c.moveTo(-0.15, 0.32);
    c.lineTo(def.hand.x, def.hand.y);
    c.stroke();
    c.strokeStyle = '#8b949e';
    c.lineWidth = 0.04;
    c.beginPath(); c.moveTo(0.95, 0.28); c.lineTo(1.08, 1.12); c.stroke();
    c.fillStyle = '#d5dde6';
    c.beginPath(); c.ellipse(1.16, 1.16, 0.22, 0.07, 0.45, 0, TAU); c.fill();
    c.strokeStyle = '#1a1a1a'; c.lineWidth = 0.03; c.stroke();
    c.fillStyle = '#e8341c';
    c.beginPath(); c.arc(1.24, 1.2, 0.035, 0, TAU); c.fill();
    lamp(c, 1.48, 0.1, 'head');
    lamp(c, -1.48, 0.08, 'tail');
  }

  function drawQuad(c, def) {
    const col = def.color;
    chassis(c, -0.8, 0.85, -0.16);
    fillShell(c, () => {
      c.beginPath();
      c.moveTo(-0.85, -0.02);
      c.quadraticCurveTo(-0.95, 0.28, -0.45, 0.36);
      c.lineTo(0.35, 0.34);
      c.quadraticCurveTo(0.9, 0.28, 0.92, 0.05);
      c.quadraticCurveTo(0.2, -0.1, -0.85, -0.02);
      c.closePath();
    }, col, -0.08, 0.36);
    for (const w of def.wheels) flare(c, w.x, 0.02, 0.34, 0.2, col);
    seatPad(c, -0.62, 0.32, 0.55, 0.1);
    c.fillStyle = '#3a4048';
    c.strokeStyle = '#1a1a1a';
    c.lineWidth = 0.04;
    c.lineCap = 'round';
    roundRect(c, 0.48, 0.22, 0.42, 0.14, 0.03); c.fill(); c.stroke();
    roundRect(c, -0.98, 0.22, 0.38, 0.12, 0.03); c.fill(); c.stroke();
    c.beginPath();
    c.moveTo(-0.42, -0.02); c.lineTo(0.38, -0.02);
    c.moveTo(-0.42, -0.02); c.lineTo(-0.42, 0.08);
    c.moveTo(0.38, -0.02); c.lineTo(0.38, 0.08);
    c.stroke();
    c.lineWidth = 0.06;
    c.beginPath();
    c.moveTo(0.2, 0.34);
    c.quadraticCurveTo(0.4, 0.5, def.hand.x, def.hand.y);
    c.moveTo(0.12, 0.3);
    c.lineTo(def.hand.x - 0.06, def.hand.y - 0.02);
    c.stroke();
    grille(c, 0.62, 0.02, 0.18, 0.16, 3);
    lamp(c, 0.78, 0.14, 'head');
    lamp(c, -0.78, 0.1, 'tail');
  }

  function drawTractor(c, def) {
    const col = def.color;
    chassis(c, -1.2, 1.5, -0.16);
    c.strokeStyle = shade(col, -0.25);
    c.lineWidth = 0.14;
    c.lineCap = 'round';
    mathArc(c, -1.0, -0.4, 0.96, Math.PI * 0.12, Math.PI * 0.9, 12);
    c.stroke();
    c.strokeStyle = 'rgba(255,255,255,0.3)';
    c.lineWidth = 0.03;
    mathArc(c, -1.0, -0.4, 0.9, Math.PI * 0.4, Math.PI * 0.7, 6);
    c.stroke();
    fillShell(c, () => {
      c.beginPath();
      c.moveTo(-0.15, -0.02);
      c.lineTo(1.45, -0.04);
      c.quadraticCurveTo(1.68, 0.15, 1.5, 0.42);
      c.lineTo(0.15, 0.5);
      c.quadraticCurveTo(-0.15, 0.28, -0.15, -0.02);
      c.closePath();
    }, col, -0.04, 0.5);
    fillShell(c, () => {
      c.beginPath();
      c.moveTo(-1.28, 0.42);
      c.lineTo(-0.05, 0.42);
      c.lineTo(0.02, 1.42);
      c.quadraticCurveTo(-0.6, 1.55, -1.25, 1.4);
      c.closePath();
    }, col, 0.42, 1.5);
    c.fillStyle = '#1c2420';
    for (let i = 0; i < 4; i++) {
      roundRect(c, 0.25 + i * 0.26, 0.08, 0.14, 0.24, 0.03);
      c.fill();
    }
    glass(c, [[-1.12, 1.32], [-0.18, 1.34], [-0.12, 0.62], [-1.16, 0.58]]);
    glass(c, [[-0.85, 1.18], [-0.4, 1.2], [-0.38, 0.78], [-0.82, 0.76]]);
    c.fillStyle = '#ffd84a';
    roundRect(c, -1.22, 1.38, 1.2, 0.08, 0.03); c.fill();
    grille(c, 1.38, 0.02, 0.18, 0.32, 5);
    lamp(c, 1.5, 0.28, 'head');
    lamp(c, -1.2, 0.22, 'tail');
    c.fillStyle = '#2a2e34';
    roundRect(c, -1.48, 0.02, 0.28, 0.12, 0.03); c.fill();
    c.strokeStyle = '#1a1a1a'; c.lineWidth = 0.03; c.stroke();
    c.beginPath(); c.arc(-1.28, 0.08, 0.035, 0, TAU); c.stroke();
    seatPad(c, -0.85, 0.48, 0.4, 0.1);
    c.strokeStyle = '#2a2e34'; c.lineWidth = 0.06; c.lineCap = 'round';
    c.beginPath(); c.moveTo(-1.15, 0.5); c.lineTo(-1.15, 1.25); c.lineTo(-0.25, 1.25); c.stroke();
    bolts(c, [[0.4, 0.02], [1.1, 0.02]]);
  }

  function drawRaceCar(c, def) {
    const col = def.color;
    chassis(c, -1.7, 1.65, -0.2);
    c.fillStyle = '#1a1a1a';
    roundRect(c, -1.45, -0.18, 2.7, 0.07, 0.02); c.fill();
    roundRect(c, 1.25, -0.2, 0.62, 0.06, 0.02); c.fill();
    fillShell(c, () => {
      c.beginPath();
      c.moveTo(-1.78, 0.02);
      c.quadraticCurveTo(-1.7, 0.22, -1.15, 0.26);
      c.lineTo(-0.15, 0.3);
      c.quadraticCurveTo(0.55, 0.28, 1.15, 0.16);
      c.quadraticCurveTo(1.72, 0.05, 1.82, -0.06);
      c.lineTo(1.55, -0.14);
      c.lineTo(-1.72, -0.08);
      c.closePath();
    }, col, -0.14, 0.3);
    c.fillStyle = shade(col, 0.5);
    roundRect(c, 0.35, 0.1, 1.35, 0.045, 0.015); c.fill();
    c.fillStyle = '#1c2026';
    c.beginPath();
    c.moveTo(-0.55, 0.26);
    c.quadraticCurveTo(-0.32, 0.58, -0.02, 0.52);
    c.quadraticCurveTo(0.12, 0.36, 0.08, 0.24);
    c.closePath();
    c.fill();
    glass(c, [[0.02, 0.55], [0.22, 0.5], [0.16, 0.3], [-0.02, 0.28]]);
    c.fillStyle = '#d5dde6';
    roundRect(c, 0.2, 0.5, 0.1, 0.07, 0.02); c.fill();
    c.strokeStyle = '#1a1a1a'; c.lineWidth = 0.02; c.stroke();
    c.fillStyle = '#2a2e34';
    c.fillRect(-1.58, 0.22, 0.06, 0.32);
    c.fillRect(-1.18, 0.24, 0.06, 0.3);
    fillShell(c, () => {
      roundRect(c, -1.82, 0.5, 1.15, 0.1, 0.03);
    }, col, 0.5, 0.6);
    c.fillStyle = '#1c2026';
    roundRect(c, 0.55, 0.14, 0.2, 0.045, 0.015); c.fill();
    roundRect(c, 0.82, 0.14, 0.2, 0.045, 0.015); c.fill();
    c.fillStyle = '#fff';
    c.beginPath(); c.arc(-0.72, 0.12, 0.13, 0, TAU); c.fill();
    c.strokeStyle = '#1a1a1a'; c.lineWidth = 0.025; c.stroke();
    c.save();
    c.translate(-0.72, 0.125);
    c.scale(1, -1);
    c.fillStyle = '#1a1a1a';
    c.font = 'bold 0.16px Trebuchet MS, sans-serif';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText('1', 0, 0);
    c.restore();
    c.fillStyle = '#3a4048';
    roundRect(c, 1.48, 0.0, 0.32, 0.09, 0.03); c.fill();
    c.fillStyle = '#ffe7a8';
    roundRect(c, 1.51, 0.02, 0.26, 0.05, 0.02); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.75)';
    c.beginPath(); c.arc(1.58, 0.05, 0.015, 0, TAU); c.fill();
    c.fillStyle = 'rgba(255,236,170,0.16)';
    c.beginPath();
    c.moveTo(1.78, 0.045); c.lineTo(2.4, 0.16); c.lineTo(2.4, -0.08); c.closePath();
    c.fill();
    lamp(c, -1.7, 0.08, 'tail');
  }

  function drawBus(c, def) {
    const col = def.color;
    chassis(c, -2.4, 2.4, -0.36);
    fillShell(c, () => {
      roundRect(c, -2.5, -0.28, 5.0, 1.7, 0.16);
    }, col, -0.28, 1.42);
    c.save();
    roundRect(c, -2.5, -0.28, 5.0, 1.7, 0.16);
    c.clip();
    c.fillStyle = 'rgba(255,255,255,0.16)';
    c.fillRect(-2.5, 1.12, 5.0, 0.32);
    c.restore();
    c.fillStyle = shade(col, -0.28);
    roundRect(c, -2.42, -0.24, 4.84, 0.14, 0.03); c.fill();
    c.fillStyle = '#1a1a1a';
    roundRect(c, -2.5, 0.18, 5.0, 0.07, 0.02); c.fill();
    for (const wx of [-1.9, 0, 1.9]) {
      c.beginPath();
      c.moveTo(wx - 0.62, -0.22);
      c.quadraticCurveTo(wx, 0.28, wx + 0.62, -0.22);
      c.lineTo(wx + 0.46, -0.28);
      c.quadraticCurveTo(wx, 0.12, wx - 0.46, -0.28);
      c.closePath();
      c.fillStyle = '#24282e';
      c.fill();
      c.strokeStyle = '#1a1a1a';
      c.lineWidth = 0.04;
      c.stroke();
    }
    for (let x = -2.15; x <= 0.85; x += 0.72) {
      glass(c, [[x, 1.12], [x + 0.52, 1.12], [x + 0.52, 0.46], [x, 0.46]]);
    }
    glass(c, [[1.95, 1.2], [2.38, 1.16], [2.4, 0.4], [1.98, 0.46]]);
    c.strokeStyle = '#1a1a1a';
    c.lineWidth = 0.035;
    c.beginPath();
    c.moveTo(1.7, -0.05); c.lineTo(1.7, 1.05);
    c.moveTo(2.02, -0.05); c.lineTo(2.02, 1.05);
    c.moveTo(1.7, 0.5); c.lineTo(2.02, 0.5);
    c.stroke();
    c.fillStyle = '#e8341c';
    c.strokeStyle = '#1a1a1a';
    c.lineWidth = 0.025;
    c.beginPath(); c.arc(1.85, 1.3, 0.07, 0, TAU); c.fill(); c.stroke();
    c.beginPath(); c.arc(2.15, 1.3, 0.07, 0, TAU); c.fill(); c.stroke();
    c.fillStyle = '#d42525';
    roundRect(c, -0.42, 0.55, 0.32, 0.26, 0.04); c.fill();
    c.strokeStyle = '#fff'; c.lineWidth = 0.02; c.stroke();
    c.fillStyle = '#1a1a1a';
    roundRect(c, -2.66, -0.2, 0.16, 0.24, 0.03); c.fill();
    roundRect(c, 2.5, -0.2, 0.16, 0.24, 0.03); c.fill();
    c.fillStyle = '#1a1a1a';
    roundRect(c, 1.05, 1.26, 1.25, 0.16, 0.03); c.fill();
    c.fillStyle = '#f4efe0';
    roundRect(c, 1.12, 1.29, 1.1, 0.1, 0.02); c.fill();
    c.strokeStyle = '#3a4048'; c.lineWidth = 0.035;
    c.beginPath(); c.moveTo(-2.35, 1.38); c.lineTo(0.95, 1.38); c.stroke();
    lamp(c, 2.42, 0.12, 'head');
    lamp(c, -2.42, 0.16, 'tail');
    bolts(c, [[-2.2, 0.02], [2.2, 0.02]]);
  }

  function drawSuperBike(c, def) {
    const col = def.color;
    c.strokeStyle = '#2a2e34';
    c.lineWidth = 0.06;
    c.lineCap = 'round';
    c.lineJoin = 'round';
    c.beginPath();
    c.moveTo(-0.7, 0.02);
    c.lineTo(-0.15, 0.28);
    c.lineTo(0.35, 0.22);
    c.lineTo(-0.05, -0.02);
    c.moveTo(0.32, 0.4);
    c.lineTo(0.9, -0.08);
    c.moveTo(-0.35, 0.22);
    c.lineTo(-0.9, -0.08);
    c.stroke();
    fillShell(c, () => {
      c.beginPath();
      c.moveTo(-0.55, 0.05);
      c.quadraticCurveTo(-0.15, 0.42, 0.45, 0.36);
      c.quadraticCurveTo(0.85, 0.18, 0.7, 0.02);
      c.quadraticCurveTo(0.15, -0.06, -0.55, 0.05);
      c.closePath();
    }, col, 0.0, 0.42);
    c.fillStyle = shade(col, 0.35);
    c.beginPath();
    c.moveTo(-0.2, 0.22);
    c.lineTo(0.35, 0.32);
    c.lineTo(0.15, 0.14);
    c.closePath();
    c.fill();
    seatPad(c, -0.72, 0.3, 0.38, 0.08);
    seatPad(c, -0.38, 0.26, 0.28, 0.07);
    glass(c, [[0.48, 0.62], [0.72, 0.48], [0.58, 0.32], [0.4, 0.4]]);
    c.strokeStyle = '#1a1a1a';
    c.lineWidth = 0.05;
    c.beginPath();
    c.moveTo(0.4, 0.4);
    c.quadraticCurveTo(0.55, 0.55, def.hand.x, def.hand.y);
    c.stroke();
    c.fillStyle = '#3a4048';
    roundRect(c, -1.05, 0.02, 0.28, 0.08, 0.03); c.fill();
    c.strokeStyle = '#1a1a1a'; c.lineWidth = 0.03; c.stroke();
    bolts(c, [[0.05, 0.08]]);
  }

  function drawTank(c, def) {
    const col = def.color;
    c.fillStyle = '#1a1c18';
    roundRect(c, -1.88, -0.87, 3.76, 0.7, 0.28);
    c.fill();
    c.strokeStyle = '#0e0f0c';
    c.lineWidth = 0.06;
    c.stroke();
    c.fillStyle = '#2a2e28';
    roundRect(c, -1.72, -0.76, 3.44, 0.48, 0.2);
    c.fill();
    c.fillStyle = '#121412';
    for (let x = -1.7; x <= 1.7; x += 0.22) {
      c.fillRect(x, -0.87, 0.1, 0.08);
      c.fillRect(x + 0.08, -0.2, 0.1, 0.07);
    }
    chassis(c, -1.7, 1.7, -0.22);
    fillShell(c, () => {
      c.beginPath();
      c.moveTo(-1.85, -0.08);
      c.lineTo(-1.85, 0.42);
      c.quadraticCurveTo(-1.4, 0.55, -0.7, 0.5);
      c.lineTo(0.7, 0.48);
      c.lineTo(1.72, 0.08);
      c.quadraticCurveTo(1.92, -0.1, 1.6, -0.16);
      c.closePath();
    }, col, -0.16, 0.52);
    fillShell(c, () => {
      c.beginPath();
      c.moveTo(-0.62, 0.48);
      c.quadraticCurveTo(-0.72, 1.05, -0.15, 1.08);
      c.quadraticCurveTo(0.45, 1.02, 0.55, 0.7);
      c.lineTo(0.4, 0.5);
      c.closePath();
    }, col, 0.48, 1.08);
    c.fillStyle = shade(col, -0.2);
    roundRect(c, 0.35, 0.7, 0.7, 0.1, 0.04); c.fill();
    c.strokeStyle = '#1a1a1a'; c.lineWidth = 0.04; c.stroke();
    c.fillStyle = '#141810';
    c.beginPath(); c.ellipse(-0.12, 1.0, 0.2, 0.08, 0, 0, TAU); c.fill();
    c.strokeStyle = '#1a1a1a'; c.lineWidth = 0.03; c.stroke();
    c.strokeStyle = shade(col, -0.35); c.lineWidth = 0.02;
    c.beginPath(); c.arc(-0.12, 1.0, 0.12, 0, TAU); c.stroke();
    c.beginPath(); c.moveTo(-0.2, 1.0); c.lineTo(-0.04, 1.0); c.moveTo(-0.12, 0.94); c.lineTo(-0.12, 1.06); c.stroke();
    c.fillStyle = '#9ec8ea';
    roundRect(c, 0.28, 0.78, 0.16, 0.045, 0.015); c.fill();
    lamp(c, 1.62, 0.16, 'head');
    lamp(c, -1.72, 0.16, 'tail');
    bolts(c, [[-1.45, 0.05], [-0.4, 0.08], [0.85, 0.02]]);
  }

  function drawVan(c, def) {
    const col = def.color;
    chassis(c, -1.5, 1.45, -0.22);
    fillShell(c, () => {
      c.beginPath();
      c.moveTo(-1.55, -0.2);
      c.quadraticCurveTo(-1.78, 0.2, -1.55, 0.58);
      c.quadraticCurveTo(-1.42, 0.78, -0.7, 0.74);
      c.lineTo(1.05, 0.82);
      c.quadraticCurveTo(1.72, 0.8, 1.62, 0.28);
      c.quadraticCurveTo(1.68, -0.08, 1.42, -0.14);
      c.closePath();
    }, col, -0.2, 0.82);
    c.fillStyle = '#f7f7f7';
    c.beginPath();
    c.moveTo(-1.4, 0.62); c.quadraticCurveTo(-1.2, 0.78, -0.55, 0.72);
    c.lineTo(1.15, 0.78); c.quadraticCurveTo(1.5, 0.74, 1.45, 0.58); c.lineTo(1.0, 0.64); c.closePath();
    c.fill();
    c.strokeStyle = '#1a1a1a'; c.lineWidth = 0.03; c.stroke();
    c.strokeStyle = '#3a4048'; c.lineWidth = 0.045; c.lineCap = 'round';
    c.beginPath();
    c.moveTo(-1.15, 0.8); c.lineTo(1.05, 0.86);
    c.moveTo(-1.1, 0.9); c.lineTo(1.0, 0.96);
    c.moveTo(-0.7, 0.78); c.lineTo(-0.7, 0.94);
    c.moveTo(0.45, 0.82); c.lineTo(0.45, 0.98);
    c.stroke();
    glass(c, [[0.95, 0.7], [1.28, 0.68], [1.32, 0.3], [1.0, 0.34]]);
    glass(c, [[1.32, 0.68], [1.52, 0.6], [1.5, 0.28], [1.32, 0.3]]);
    for (const x of [-1.15, -0.4, 0.3]) {
      c.fillStyle = 'rgba(186,220,242,0.9)';
      c.beginPath(); c.arc(x, 0.42, 0.14, 0, TAU); c.fill();
      c.strokeStyle = '#1a1a1a'; c.lineWidth = 0.03; c.stroke();
    }
    c.strokeStyle = '#1a1a1a'; c.lineWidth = 0.035;
    c.beginPath(); c.moveTo(-0.7, -0.08); c.lineTo(-0.7, 0.62); c.stroke();
    c.fillStyle = '#f2e27a';
    c.strokeStyle = '#1a1a1a'; c.lineWidth = 0.025;
    c.beginPath(); c.arc(-1.05, 0.48, 0.09, 0, TAU); c.fill(); c.stroke();
    for (let i = 0; i < 6; i++) {
      const a = i * Math.PI / 3;
      c.beginPath(); c.arc(-1.05 + Math.cos(a) * 0.16, 0.48 + Math.sin(a) * 0.16, 0.055, 0, TAU); c.fill(); c.stroke();
    }
    c.fillStyle = '#3a4048';
    c.beginPath(); c.arc(1.48, 0.08, 0.1, 0, TAU); c.fill(); c.stroke();
    c.beginPath(); c.arc(1.48, 0.28, 0.1, 0, TAU); c.fill(); c.stroke();
    c.fillStyle = '#ffe7a8';
    c.beginPath(); c.arc(1.48, 0.08, 0.04, 0, TAU); c.fill();
    c.beginPath(); c.arc(1.48, 0.28, 0.04, 0, TAU); c.fill();
    lamp(c, -1.48, 0.12, 'tail');
    bolts(c, [[-1.2, 0.0], [1.15, 0.0]]);
  }

  function starBadge(c, x, y, r) {
    c.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + i * Math.PI / 5;
      const rr = i % 2 ? r * 0.42 : r;
      const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr;
      if (i === 0) c.moveTo(px, py); else c.lineTo(px, py);
    }
    c.closePath();
    c.fillStyle = '#f5c518'; c.fill();
    c.strokeStyle = '#1a1a1a'; c.lineWidth = 0.02; c.stroke();
  }

  function drawPolice(c, def) {
    chassis(c, -1.45, 1.45, -0.22);
    fillShell(c, () => {
      c.beginPath();
      c.moveTo(-1.6, -0.12); c.lineTo(1.55, -0.12); c.lineTo(1.62, 0.42);
      c.lineTo(-0.15, 0.78); c.lineTo(-0.85, 0.78); c.lineTo(-1.35, 0.42); c.closePath();
    }, def.color, -0.12, 0.78);
    c.fillStyle = '#1c2430';
    c.beginPath();
    c.moveTo(-1.35, -0.02); c.lineTo(-0.15, -0.02); c.lineTo(-0.25, 0.48); c.lineTo(-1.2, 0.42); c.closePath();
    c.fill();
    glass(c, [[-0.72, 0.7], [-0.22, 0.7], [-0.28, 0.4], [-0.78, 0.38]]);
    c.fillStyle = '#222';
    roundRect(c, -0.55, 0.82, 0.7, 0.1, 0.03); c.fill();
    c.fillStyle = '#e23b2f'; roundRect(c, -0.48, 0.84, 0.22, 0.06, 0.02); c.fill();
    c.fillStyle = '#2f6fed'; roundRect(c, -0.18, 0.84, 0.22, 0.06, 0.02); c.fill();
    c.fillStyle = '#f4f4f4';
    c.beginPath(); c.arc(-0.12, 0.98, 0.055, 0, TAU); c.fill();
    c.strokeStyle = '#1a1a1a'; c.lineWidth = 0.02; c.stroke();
    c.fillStyle = '#ffe7a8';
    c.beginPath(); c.arc(-0.1, 0.99, 0.025, 0, TAU); c.fill();
    starBadge(c, -0.7, 0.22, 0.1);
    c.fillStyle = '#2a2e34';
    roundRect(c, 1.42, -0.08, 0.22, 0.16, 0.03); c.fill();
    lamp(c, 1.48, 0.22, 'head'); lamp(c, -1.48, 0.16, 'tail');
    bolts(c, [[1.1, 0.02], [-1.2, 0.0]]);
  }

  function drawAmbulance(c, def) {
    chassis(c, -1.55, 1.55, -0.22);
    fillShell(c, () => { roundRect(c, -1.7, -0.12, 3.4, 1.05, 0.08); }, def.color, -0.12, 0.93);
    c.fillStyle = '#e23b2f';
    roundRect(c, -1.7, -0.02, 3.4, 0.1, 0.02); c.fill();
    glass(c, [[0.85, 0.78], [1.45, 0.76], [1.48, 0.28], [0.9, 0.32]]);
    glass(c, [[-0.15, 0.78], [0.5, 0.76], [0.52, 0.32], [-0.12, 0.34]]);
    c.strokeStyle = '#1a1a1a'; c.lineWidth = 0.03;
    c.beginPath(); c.moveTo(-1.15, -0.05); c.lineTo(-1.15, 0.85); c.moveTo(-0.55, -0.05); c.lineTo(-0.55, 0.85); c.stroke();
    c.fillStyle = '#e23b2f';
    roundRect(c, -0.9, 0.38, 0.16, 0.36, 0.03); c.fill();
    roundRect(c, -1.02, 0.5, 0.4, 0.12, 0.03); c.fill();
    c.fillStyle = '#e23b2f';
    c.beginPath(); c.arc(0.2, 0.95, 0.06, 0, TAU); c.fill();
    lamp(c, 1.52, 0.18, 'head'); lamp(c, -1.55, 0.16, 'tail');
    bolts(c, [[1.2, 0.02], [-1.35, 0.02]]);
  }

  function drawDiesel(c, def) {
    const col = def.color;
    chassis(c, -1.65, 1.55, -0.18);
    fillShell(c, () => {
      c.beginPath();
      c.moveTo(-1.75, -0.08); c.lineTo(1.45, -0.08);
      c.lineTo(1.65, 0.48); c.lineTo(0.35, 0.62);
      c.lineTo(-0.15, 1.12); c.lineTo(-1.45, 1.12); c.lineTo(-1.75, 0.42); c.closePath();
    }, col, -0.08, 1.12);
    glass(c, [[-1.25, 0.98], [-0.35, 0.98], [-0.28, 0.55], [-1.28, 0.52]]);
    grille(c, 1.28, 0.02, 0.28, 0.38, 5);
    c.fillStyle = '#9aa3ad';
    for (let i = 0; i < 3; i++) c.fillRect(-1.55, 0.02 + i * 0.06, 0.35, 0.03);
    c.fillStyle = metalGradient(c, 0.4, 1.25);
    roundRect(c, 0.42, 0.7, 0.1, 0.5, 0.03); c.fill();
    c.strokeStyle = '#1a1a1a'; c.lineWidth = 0.03; c.stroke();
    lamp(c, 1.52, 0.28, 'head'); lamp(c, -1.62, 0.16, 'tail');
    c.fillStyle = '#2a2e34';
    roundRect(c, -1.2, -0.06, 0.32, 0.1, 0.02); c.fill();
    c.strokeStyle = '#1a1a1a'; c.lineWidth = 0.03; c.stroke();
    c.strokeStyle = '#c5ced6'; c.lineWidth = 0.05; c.lineCap = 'round';
    c.beginPath();
    c.moveTo(-0.05, 1.12); c.lineTo(-0.05, 1.38); c.lineTo(0.42, 1.38); c.lineTo(0.42, 0.62);
    c.stroke();
    bolts(c, [[0.9, 0.02], [-0.4, 0.02]]);
    seatPad(c, -1.05, 0.48, 0.4, 0.08);
  }

  function drawChopper(c, def) {
    c.strokeStyle = '#c5ced6'; c.lineWidth = 0.055; c.lineCap = 'round';
    c.beginPath();
    c.moveTo(-0.9, -0.05); c.lineTo(0.15, 0.22); c.lineTo(0.85, -0.05);
    c.moveTo(0.42, 0.16); c.lineTo(1.05, -0.35);
    c.moveTo(0.5, 0.2); c.lineTo(1.12, -0.32);
    c.stroke();
    c.strokeStyle = '#8b949e'; c.lineWidth = 0.045; c.lineCap = 'round';
    c.beginPath();
    c.moveTo(-0.15, 0.02); c.lineTo(-1.1, -0.1);
    c.moveTo(-0.08, 0.08); c.lineTo(-1.02, -0.02);
    c.stroke();
    fillShell(c, () => {
      c.beginPath();
      c.moveTo(-0.35, 0.16);
      c.quadraticCurveTo(0.05, 0.42, 0.45, 0.28);
      c.quadraticCurveTo(0.2, 0.1, -0.35, 0.16);
      c.closePath();
    }, def.color, 0.12, 0.4);
    seatPad(c, -0.7, 0.26, 0.4, 0.07);
    seatPad(c, -0.42, 0.18, 0.28, 0.06);
    c.strokeStyle = '#1a1a1a'; c.lineWidth = 0.05;
    c.beginPath();
    c.moveTo(0.4, 0.28); c.quadraticCurveTo(0.7, 0.55, def.hand.x, def.hand.y); c.stroke();
    lamp(c, 0.95, 0.08, 'head');
    bolts(c, [[0.05, 0.12]]);
  }

  function drawSnowmobile(c, def) {
    const col = def.color;
    c.fillStyle = '#d5dde6';
    c.beginPath();
    c.moveTo(0.35, -0.06);
    c.quadraticCurveTo(0.85, -0.55, 1.55, -0.18);
    c.lineTo(1.48, -0.32);
    c.quadraticCurveTo(0.8, -0.62, 0.42, -0.2);
    c.closePath();
    c.fill();
    c.strokeStyle = '#1a1a1a'; c.lineWidth = 0.03; c.stroke();
    c.strokeStyle = '#eef3f7'; c.lineWidth = 0.02;
    c.beginPath(); c.moveTo(0.55, -0.16); c.quadraticCurveTo(0.95, -0.42, 1.35, -0.22); c.stroke();
    c.fillStyle = '#1a1c18';
    c.beginPath();
    c.moveTo(-0.95, -0.08);
    c.quadraticCurveTo(-1.05, -0.35, -0.7, -0.38);
    c.lineTo(0.15, -0.32);
    c.quadraticCurveTo(0.35, -0.08, 0.05, 0.02);
    c.lineTo(-0.85, 0.02);
    c.closePath();
    c.fill();
    c.strokeStyle = '#0e0f0c'; c.lineWidth = 0.03; c.stroke();
    for (let x = -0.82; x < 0.05; x += 0.14) { c.beginPath(); c.moveTo(x, -0.28); c.lineTo(x + 0.07, 0.0); c.stroke(); }
    fillShell(c, () => {
      c.beginPath();
      c.moveTo(-0.85, -0.02); c.lineTo(0.85, -0.02);
      c.quadraticCurveTo(1.05, 0.15, 0.65, 0.32);
      c.lineTo(-0.45, 0.42); c.quadraticCurveTo(-0.9, 0.2, -0.85, -0.02); c.closePath();
    }, col, -0.02, 0.42);
    glass(c, [[0.15, 0.55], [0.55, 0.42], [0.35, 0.22], [0.05, 0.28]]);
    seatPad(c, -0.45, 0.28, 0.4, 0.08);
    lamp(c, 0.85, 0.12, 'head');
    lamp(c, -0.78, 0.08, 'tail');
  }

  function drawTruck(c, def) {
    const col = def.color;
    chassis(c, -1.55, 1.45, -0.18);
    fillShell(c, () => {
      c.beginPath();
      c.moveTo(-1.65, -0.08); c.lineTo(1.45, -0.1);
      c.lineTo(1.65, 0.38); c.lineTo(0.3, 0.5);
      c.lineTo(-0.1, 1.02); c.lineTo(-1.4, 1.02); c.lineTo(-1.65, 0.38); c.closePath();
    }, col, -0.1, 1.02);
    glass(c, [[-1.2, 0.9], [-0.25, 0.9], [-0.18, 0.48], [-1.22, 0.45]]);
    grille(c, 1.28, 0.0, 0.26, 0.32, 4);
    c.fillStyle = metalGradient(c, 0.55, 1.2);
    roundRect(c, 0.15, 0.62, 0.08, 0.45, 0.02); c.fill();
    c.strokeStyle = '#1a1a1a'; c.lineWidth = 0.025; c.stroke();
    c.fillStyle = '#2a2e34';
    c.beginPath(); c.ellipse(0.55, 0.48, 0.22, 0.08, 0, 0, TAU); c.fill();
    c.strokeStyle = '#1a1a1a'; c.lineWidth = 0.03; c.stroke();
    lamp(c, 1.5, 0.22, 'head'); lamp(c, -1.52, 0.14, 'tail');
    c.fillStyle = '#2a2e34';
    roundRect(c, 0.55, 0.06, 0.48, 0.24, 0.03); c.fill();
    c.strokeStyle = '#1a1a1a'; c.lineWidth = 0.03; c.stroke();
    c.beginPath(); c.moveTo(-0.55, 0.42); c.lineTo(-0.55, 0.95); c.stroke();
    c.fillStyle = shade(col, -0.4);
    roundRect(c, 1.32, -0.16, 0.38, 0.1, 0.02); c.fill();
    bolts(c, [[0.8, 0.0], [-0.5, 0.0]]);
    seatPad(c, -0.95, 0.4, 0.38, 0.08);
  }

  function drawBuggy(c, def) {
    const col = def.color;
    c.strokeStyle = '#2a2e34'; c.lineWidth = 0.06; c.lineCap = 'round'; c.lineJoin = 'round';
    c.beginPath();
    c.moveTo(-1.05, -0.02); c.lineTo(-0.7, 0.45); c.lineTo(0.15, 0.62); c.lineTo(0.85, 0.28); c.lineTo(1.05, -0.02);
    c.moveTo(-0.2, 0.15); c.lineTo(0.55, 0.15);
    c.stroke();
    flare(c, -1.05, 0.0, 0.38, 0.22, col);
    flare(c, 1.05, 0.0, 0.38, 0.22, col);
    seatPad(c, -0.35, 0.22, 0.38, 0.08);
    seatPad(c, 0.12, 0.18, 0.32, 0.07);
    c.fillStyle = shade(col, 0.2);
    roundRect(c, 0.78, 0.1, 0.28, 0.16, 0.03); c.fill();
    c.strokeStyle = '#1a1a1a'; c.lineWidth = 0.03; c.stroke();
    c.fillStyle = '#3a4048';
    roundRect(c, -0.95, 0.08, 0.38, 0.22, 0.04); c.fill();
    c.strokeStyle = '#1a1a1a'; c.lineWidth = 0.03; c.stroke();
    c.strokeStyle = '#9aa3ad'; c.lineWidth = 0.02;
    for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(-0.9, 0.13 + i * 0.05); c.lineTo(-0.62, 0.13 + i * 0.05); c.stroke(); }
    c.fillStyle = '#ffe7a8';
    c.beginPath(); c.arc(1.02, 0.2, 0.06, 0, TAU); c.fill();
    c.beginPath(); c.arc(0.88, 0.2, 0.045, 0, TAU); c.fill();
    lamp(c, -1.05, 0.12, 'tail');
  }

  function drawHover(c, def) {
    c.fillStyle = shade(def.color, -0.35);
    c.beginPath();
    c.moveTo(-1.7, -0.18);
    c.quadraticCurveTo(-1.85, -0.55, -1.2, -0.58);
    c.quadraticCurveTo(0, -0.72, 1.2, -0.58);
    c.quadraticCurveTo(1.85, -0.55, 1.7, -0.18);
    c.quadraticCurveTo(0, -0.32, -1.7, -0.18);
    c.closePath();
    c.fill();
    c.strokeStyle = '#1a1a1a'; c.lineWidth = 0.04; c.stroke();
    fillShell(c, () => { roundRect(c, -1.55, -0.08, 3.1, 0.32, 0.1); }, def.color, -0.08, 0.24);
    c.fillStyle = '#3a4048';
    c.beginPath(); c.arc(0.15, 0.42, 0.28, 0, TAU); c.fill();
    c.strokeStyle = '#1a1a1a'; c.lineWidth = 0.035; c.stroke();
    c.strokeStyle = '#c5ced6'; c.lineWidth = 0.03;
    for (let i = 0; i < 4; i++) {
      const a = i * Math.PI / 2 + 0.4;
      c.beginPath();
      c.moveTo(0.15, 0.42);
      c.lineTo(0.15 + Math.cos(a) * 0.2, 0.42 + Math.sin(a) * 0.2);
      c.stroke();
    }
    c.strokeStyle = '#8b949e'; c.lineWidth = 0.04;
    c.beginPath(); c.moveTo(0.15, 0.42); c.lineTo(0.15, 0.78); c.stroke();
    c.fillStyle = '#d5dde6';
    c.beginPath(); c.ellipse(0.15, 0.8, 0.12, 0.04, 0, 0, TAU); c.fill();
    lamp(c, 1.4, 0.08, 'head'); lamp(c, -1.45, 0.06, 'tail');
  }

  function drawFinger(c, def) {
    fillShell(c, () => {
      c.beginPath();
      c.moveTo(-0.42, -0.12);
      c.quadraticCurveTo(-0.5, 0.7, -0.38, 1.2);
      c.quadraticCurveTo(-0.2, 1.75, 0.05, 1.72);
      c.quadraticCurveTo(0.35, 1.6, 0.4, 1.15);
      c.quadraticCurveTo(0.48, 0.4, 0.36, -0.12);
      c.closePath();
    }, def.color, -0.12, 1.72);
    c.strokeStyle = shade(def.color, -0.25); c.lineWidth = 0.03;
    c.beginPath(); c.moveTo(-0.28, 0.45); c.quadraticCurveTo(0, 0.55, 0.28, 0.42); c.stroke();
    c.beginPath(); c.moveTo(-0.22, 0.85); c.quadraticCurveTo(0.02, 0.95, 0.26, 0.8); c.stroke();
    c.fillStyle = '#f7e7d4';
    c.beginPath();
    c.moveTo(-0.12, 1.45); c.quadraticCurveTo(0.05, 1.78, 0.22, 1.5); c.lineTo(0.12, 1.42); c.closePath();
    c.fill(); c.strokeStyle = '#1a1a1a'; c.lineWidth = 0.025; c.stroke();
    c.strokeStyle = 'rgba(255,255,255,0.5)'; c.lineWidth = 0.04; c.lineCap = 'round';
    c.beginPath(); c.moveTo(-0.28, 0.15); c.quadraticCurveTo(-0.38, 0.85, -0.22, 1.45); c.stroke();
    chassis(c, -0.45, 0.45, -0.2);
  }

  function drawRally(c, def) {
    const col = def.color;
    chassis(c, -1.4, 1.4, -0.2);
    fillShell(c, () => {
      c.beginPath();
      c.moveTo(-1.5, -0.1); c.lineTo(1.45, -0.1);
      c.quadraticCurveTo(1.6, 0.15, 1.35, 0.32);
      c.lineTo(-0.1, 0.58); c.lineTo(-0.7, 0.58); c.lineTo(-1.25, 0.3); c.closePath();
    }, col, -0.1, 0.58);
    c.fillStyle = def.stripe || '#f5f5f5';
    c.beginPath();
    c.moveTo(1.35, 0.18); c.lineTo(-0.35, 0.62); c.lineTo(-0.55, 0.5); c.lineTo(1.15, 0.08);
    c.closePath(); c.fill();
    c.fillStyle = '#c5ced6';
    c.beginPath(); c.arc(0.85, 0.3, 0.035, 0, TAU); c.fill();
    c.beginPath(); c.arc(1.15, 0.22, 0.035, 0, TAU); c.fill();
    c.strokeStyle = '#1a1a1a'; c.lineWidth = 0.02; c.stroke();
    c.fillStyle = shade(col, -0.2);
    c.beginPath(); c.moveTo(0.15, 0.4); c.quadraticCurveTo(0.45, 0.62, 0.7, 0.38); c.lineTo(0.35, 0.32); c.closePath(); c.fill();
    c.strokeStyle = '#1a1a1a'; c.lineWidth = 0.03; c.stroke();
    glass(c, [[-0.55, 0.5], [-0.2, 0.5], [-0.22, 0.3], [-0.58, 0.3]]);
    c.fillStyle = '#ffe7a8';
    c.beginPath(); c.arc(1.35, 0.18, 0.05, 0, TAU); c.fill();
    c.beginPath(); c.arc(1.22, 0.16, 0.04, 0, TAU); c.fill();
    c.fillStyle = '#1a1a1a';
    c.fillRect(-1.35, -0.16, 0.08, 0.1); c.fillRect(1.25, -0.16, 0.08, 0.1);
    c.fillStyle = '#fff';
    c.beginPath(); c.arc(-0.85, 0.12, 0.1, 0, TAU); c.fill();
    c.strokeStyle = '#1a1a1a'; c.lineWidth = 0.02; c.stroke();
    c.save(); c.translate(-0.85, 0.12); c.scale(1, -1);
    c.fillStyle = '#1a1a1a'; c.font = 'bold 0.12px Trebuchet MS, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText('7', 0, 0); c.restore();
    lamp(c, 1.42, 0.08, 'head'); lamp(c, -1.42, 0.08, 'tail');
  }

  function drawDragster(c, def) {
    const col = def.color;
    c.strokeStyle = '#2a2e34'; c.lineWidth = 0.05; c.lineCap = 'round';
    c.beginPath(); c.moveTo(-1.35, 0.05); c.lineTo(1.4, 0.02); c.moveTo(-0.4, 0.08); c.lineTo(-0.4, 0.35); c.stroke();
    c.fillStyle = '#3a4048';
    roundRect(c, -0.95, 0.04, 0.42, 0.26, 0.04); c.fill();
    c.strokeStyle = '#9aa3ad'; c.lineWidth = 0.02;
    for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(-0.88, 0.1 + i * 0.06); c.lineTo(-0.6, 0.1 + i * 0.06); c.stroke(); }
    fillShell(c, () => {
      c.beginPath();
      c.moveTo(-0.15, 0.05); c.lineTo(1.15, 0.02); c.lineTo(0.7, 0.28); c.lineTo(-0.05, 0.32); c.closePath();
    }, col, 0.02, 0.32);
    fillShell(c, () => { roundRect(c, -1.55, 0.42, 0.85, 0.08, 0.02); }, col, 0.42, 0.5);
    c.fillStyle = '#1a1a1a'; c.fillRect(-1.5, 0.28, 0.05, 0.16); c.fillRect(-0.78, 0.28, 0.05, 0.16);
    seatPad(c, -0.35, 0.16, 0.35, 0.07);
    glass(c, [[-0.02, 0.46], [0.32, 0.4], [0.22, 0.22], [-0.06, 0.24]]);
    lamp(c, 1.35, 0.08, 'head');
  }

  function drawScooter(c, def) {
    c.strokeStyle = '#2a2e34'; c.lineWidth = 0.055; c.lineCap = 'round'; c.lineJoin = 'round';
    c.beginPath();
    c.moveTo(-0.45, -0.02); c.quadraticCurveTo(-0.1, 0.15, 0.15, 0.45); c.lineTo(0.45, 0.15); c.lineTo(0.55, -0.02);
    c.moveTo(-0.15, 0.05); c.lineTo(0.45, 0.02);
    c.stroke();
    fillShell(c, () => {
      c.beginPath();
      c.moveTo(0.15, 0.05);
      c.quadraticCurveTo(0.55, 0.35, 0.35, 0.55);
      c.quadraticCurveTo(0.1, 0.4, 0.05, 0.18);
      c.closePath();
    }, def.color, 0.05, 0.55);
    c.fillStyle = shade(def.color, -0.15);
    roundRect(c, -0.15, 0.0, 0.55, 0.06, 0.02); c.fill();
    seatPad(c, -0.35, 0.32, 0.28, 0.07);
    glass(c, [[0.18, 0.42], [0.38, 0.62], [0.46, 0.4], [0.26, 0.28]]);
    c.strokeStyle = '#1a1a1a'; c.lineWidth = 0.045; c.lineCap = 'round';
    c.beginPath();
    c.moveTo(0.28, 0.48);
    c.quadraticCurveTo(0.42, 0.58, def.hand.x, def.hand.y);
    c.stroke();
    c.fillStyle = '#3a4048';
    roundRect(c, -0.7, 0.05, 0.18, 0.08, 0.02); c.fill();
    c.fillStyle = '#ffe7a8';
    c.beginPath(); c.arc(0.48, 0.28, 0.05, 0, TAU); c.fill();
    c.strokeStyle = '#1a1a1a'; c.lineWidth = 0.02; c.stroke();
  }

  function drawSuperJeep(c, def) {
    const col = def.color;
    chassis(c, -1.6, 1.6, -0.22);
    fillShell(c, () => {
      c.beginPath();
      c.moveTo(-1.65, -0.15); c.lineTo(1.65, -0.15); c.lineTo(1.6, 0.42);
      c.lineTo(-1.15, 0.48); c.lineTo(-1.65, 0.28); c.closePath();
    }, col, -0.15, 0.48);
    fillShell(c, () => {
      c.beginPath();
      c.moveTo(-1.2, 0.42); c.lineTo(-1.05, 1.05); c.lineTo(0.5, 1.05); c.lineTo(0.35, 0.45); c.closePath();
    }, col, 0.42, 1.05);
    glass(c, [[-0.95, 0.95], [-0.2, 0.95], [-0.15, 0.52], [-1.0, 0.5]]);
    c.strokeStyle = '#1a1a1a'; c.lineWidth = 0.05;
    c.beginPath(); c.moveTo(0.85, 0.42); c.lineTo(0.95, 1.15); c.stroke();
    c.fillStyle = '#ffe7a8'; c.beginPath(); c.arc(-0.3, 1.12, 0.06, 0, TAU); c.fill();
    lamp(c, 1.55, 0.18, 'head'); lamp(c, -1.55, 0.16, 'tail');
    bolts(c, [[1.2, 0.02], [-1.2, 0.02]]);
  }
  function drawUsed(c, def) {
    chassis(c, -1.4, 1.4, -0.2);
    fillShell(c, () => {
      c.beginPath();
      c.moveTo(-1.45, -0.1); c.lineTo(1.45, -0.1); c.lineTo(1.35, 0.38);
      c.lineTo(-0.25, 0.68); c.lineTo(-0.85, 0.68); c.lineTo(-1.3, 0.36); c.closePath();
    }, def.color, -0.1, 0.68);
    glass(c, [[-0.75, 0.6], [-0.3, 0.6], [-0.32, 0.32], [-0.8, 0.3]]);
    c.strokeStyle = '#1a1a1a'; c.lineWidth = 0.03;
    c.beginPath(); c.moveTo(0.15, -0.05); c.lineTo(0.15, 0.32); c.stroke();
    lamp(c, 1.38, 0.12, 'head'); lamp(c, -1.38, 0.12, 'tail');
    bolts(c, [[0.8, 0.0], [-0.9, 0.0]]);
  }
  function drawFamily(c, def) {
    chassis(c, -1.55, 1.5, -0.2);
    fillShell(c, () => { roundRect(c, -1.65, -0.1, 3.25, 0.9, 0.12); }, def.color, -0.1, 0.8);
    glass(c, [[0.35, 0.7], [1.15, 0.68], [1.2, 0.28], [0.4, 0.3]]);
    glass(c, [[-1.15, 0.68], [-0.35, 0.68], [-0.3, 0.3], [-1.1, 0.3]]);
    c.strokeStyle = '#1a1a1a'; c.lineWidth = 0.03;
    c.beginPath(); c.moveTo(-0.15, -0.05); c.lineTo(-0.15, 0.75); c.stroke();
    lamp(c, 1.5, 0.15, 'head'); lamp(c, -1.52, 0.15, 'tail');
    bolts(c, [[1.1, 0.02], [-1.15, 0.02]]);
  }
  function drawTrophy(c, def) {
    chassis(c, -1.55, 1.6, -0.12);
    fillShell(c, () => {
      c.beginPath();
      c.moveTo(-1.65, -0.02); c.lineTo(1.75, -0.02); c.lineTo(1.65, 0.42);
      c.lineTo(-0.25, 0.78); c.lineTo(-1.15, 0.78); c.lineTo(-1.55, 0.38); c.closePath();
    }, def.color, -0.02, 0.78);
    glass(c, [[-1.0, 0.68], [-0.35, 0.68], [-0.32, 0.38], [-1.05, 0.36]]);
    c.strokeStyle = '#8b939c'; c.lineWidth = 0.035;
    for (const x of [-1.15, 1.2]) {
      c.beginPath(); c.moveTo(x, 0.15);
      for (let i = 0; i < 4; i++) c.lineTo(x + (i % 2 ? 0.06 : -0.06), 0.22 + i * 0.08);
      c.stroke();
    }
    lamp(c, 1.62, 0.22, 'head'); lamp(c, 1.45, 0.32, 'head');
    lamp(c, -1.55, 0.16, 'tail');
    bolts(c, [[0.6, 0.02], [-0.4, 0.02]]);
  }
  function drawElectric(c, def) {
    chassis(c, -1.35, 1.4, -0.18);
    fillShell(c, () => {
      c.beginPath();
      c.moveTo(-1.4, -0.08); c.lineTo(1.45, -0.08); c.quadraticCurveTo(1.5, 0.2, 1.25, 0.32);
      c.lineTo(-0.2, 0.65); c.lineTo(-0.8, 0.65); c.lineTo(-1.25, 0.3); c.closePath();
    }, def.color, -0.08, 0.65);
    glass(c, [[-0.7, 0.55], [-0.25, 0.55], [-0.22, 0.28], [-0.72, 0.26]]);
    c.fillStyle = '#3dce45';
    c.beginPath(); c.arc(-0.95, 0.18, 0.07, 0, TAU); c.fill();
    c.strokeStyle = '#146b18'; c.lineWidth = 0.02;
    c.beginPath(); c.moveTo(-0.95, 0.12); c.quadraticCurveTo(-0.82, 0.22, -0.9, 0.28); c.stroke();
    lamp(c, 1.38, 0.1, 'head'); lamp(c, -1.32, 0.1, 'tail');
  }
  function drawMinibike(c, def) {
    c.strokeStyle = '#2a2e34'; c.lineWidth = 0.05; c.lineCap = 'round';
    c.beginPath();
    c.moveTo(-0.45, 0.02); c.lineTo(-0.1, 0.32); c.lineTo(0.35, 0.28); c.lineTo(0.5, -0.02);
    c.moveTo(0.28, 0.3); c.lineTo(def.hand.x, def.hand.y);
    c.stroke();
    fillShell(c, () => {
      c.beginPath();
      c.moveTo(-0.28, 0.12); c.quadraticCurveTo(0.05, 0.38, 0.28, 0.22); c.quadraticCurveTo(0.05, 0.08, -0.28, 0.12); c.closePath();
    }, def.color, 0.08, 0.38);
    seatPad(c, -0.42, 0.22, 0.32, 0.07);
    lamp(c, 0.55, 0.12, 'head');
  }
  function drawCorkscrew(c, def) {
    chassis(c, -0.45, 0.45, -0.18);
    fillShell(c, () => {
      c.beginPath();
      c.moveTo(-0.22, -0.05);
      c.quadraticCurveTo(-0.32, 0.7, -0.16, 1.2);
      c.lineTo(0.08, 1.48); c.lineTo(0.2, 1.15);
      c.quadraticCurveTo(0.32, 0.55, 0.22, -0.05);
      c.closePath();
    }, def.color, -0.05, 1.48);
    c.strokeStyle = '#5c6570'; c.lineWidth = 0.03;
    for (let y = 0.15; y < 1.2; y += 0.18) {
      c.beginPath(); c.moveTo(-0.16, y); c.quadraticCurveTo(0, y + 0.1, 0.16, y); c.stroke();
    }
    bolts(c, [[0, 0.05]]);
  }
  function drawLowrider(c, def) {
    chassis(c, -1.7, 1.7, -0.12);
    fillShell(c, () => {
      c.beginPath();
      c.moveTo(-1.75, -0.06); c.lineTo(1.8, -0.06); c.lineTo(1.65, 0.26);
      c.lineTo(-0.2, 0.38); c.lineTo(-1.05, 0.38); c.lineTo(-1.6, 0.2); c.closePath();
    }, def.color, -0.06, 0.38);
    glass(c, [[-0.95, 0.32], [-0.3, 0.32], [-0.28, 0.14], [-0.95, 0.12]]);
    c.strokeStyle = '#c5ced6'; c.lineWidth = 0.03;
    c.beginPath(); c.moveTo(-1.5, 0.02); c.lineTo(1.5, 0.02); c.stroke();
    lamp(c, 1.7, 0.08, 'head'); lamp(c, -1.65, 0.08, 'tail');
  }
  function drawFiretruck(c, def) {
    chassis(c, -2.0, 1.9, -0.18);
    fillShell(c, () => { roundRect(c, -2.05, -0.1, 4.05, 0.78, 0.06); }, def.color, -0.1, 0.68);
    fillShell(c, () => {
      c.beginPath();
      c.moveTo(0.55, 0.55); c.lineTo(1.85, 0.5); c.lineTo(1.9, 0.95); c.lineTo(0.6, 0.95); c.closePath();
    }, def.color, 0.5, 0.95);
    glass(c, [[0.75, 0.85], [1.65, 0.82], [1.7, 0.55], [0.8, 0.55]]);
    c.strokeStyle = '#c5ced6'; c.lineWidth = 0.04;
    c.beginPath(); c.moveTo(-1.8, 0.72); c.lineTo(0.3, 0.78); c.stroke();
    c.strokeStyle = '#1a1a1a'; c.lineWidth = 0.03;
    c.beginPath(); c.arc(-0.7, 0.28, 0.16, 0, TAU); c.stroke();
    lamp(c, 1.95, 0.2, 'head'); lamp(c, -1.95, 0.18, 'tail');
    bolts(c, [[-1.4, 0.02], [0.2, 0.02]]);
  }
  function drawHotrod(c, def) {
    chassis(c, -1.3, 1.3, -0.12);
    fillShell(c, () => {
      c.beginPath();
      c.moveTo(-1.35, -0.02); c.lineTo(1.4, -0.02); c.lineTo(1.15, 0.26);
      c.lineTo(-0.2, 0.42); c.lineTo(-0.85, 0.36); c.lineTo(-1.25, 0.18); c.closePath();
    }, def.color, -0.02, 0.42);
    c.fillStyle = '#3a4048';
    roundRect(c, -1.05, 0.08, 0.4, 0.22, 0.04); c.fill();
    c.strokeStyle = '#9aa3ad'; c.lineWidth = 0.02;
    for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(-1.0, 0.12 + i * 0.05); c.lineTo(-0.7, 0.12 + i * 0.05); c.stroke(); }
    c.strokeStyle = '#c5ced6'; c.lineWidth = 0.04;
    c.beginPath(); c.moveTo(-1.2, 0.05); c.lineTo(-1.55, 0.02); c.stroke();
    lamp(c, 1.28, 0.1, 'head');
    bolts(c, [[0.4, 0.02]]);
  }
  function drawFastCar(c, def) {
    chassis(c, -1.45, 1.45, -0.16);
    fillShell(c, () => {
      c.beginPath();
      c.moveTo(-1.5, -0.06); c.lineTo(1.55, -0.08); c.lineTo(1.4, 0.2);
      c.lineTo(-0.2, 0.45); c.lineTo(-0.8, 0.45); c.lineTo(-1.35, 0.18); c.closePath();
    }, def.color, -0.08, 0.45);
    glass(c, [[-0.7, 0.38], [-0.25, 0.38], [-0.22, 0.18], [-0.72, 0.16]]);
    lamp(c, 1.45, 0.06, 'head'); lamp(c, -1.42, 0.06, 'tail');
    bolts(c, [[0.5, 0.0]]);
  }
  function drawSkyCar(c, def) {
    chassis(c, -1.2, 1.15, -0.16);
    fillShell(c, () => {
      c.beginPath();
      c.moveTo(-1.2, -0.02); c.lineTo(1.15, -0.02); c.lineTo(0.85, 0.32);
      c.lineTo(-0.2, 0.5); c.lineTo(-1.0, 0.35); c.closePath();
    }, def.color, -0.02, 0.5);
    glass(c, [[-0.55, 0.42], [-0.15, 0.42], [-0.12, 0.22], [-0.55, 0.2]]);
    c.fillStyle = shade(def.color, -0.15);
    roundRect(c, -0.55, 0.48, 1.15, 0.06, 0.02); c.fill();
    c.strokeStyle = '#1a1a1a'; c.lineWidth = 0.03; c.stroke();
    c.fillStyle = '#3a4048';
    c.beginPath(); c.arc(-1.05, 0.18, 0.14, 0, TAU); c.fill();
    c.strokeStyle = '#9aa3ad'; c.lineWidth = 0.02;
    c.beginPath(); c.moveTo(-1.05, 0.18); c.lineTo(-0.95, 0.28); c.moveTo(-1.05, 0.18); c.lineTo(-1.15, 0.08); c.stroke();
    lamp(c, 1.05, 0.1, 'head');
  }
  function drawLuxury(c, def) {
    chassis(c, -1.75, 1.75, -0.18);
    fillShell(c, () => {
      c.beginPath();
      c.moveTo(-1.85, -0.08); c.lineTo(1.9, -0.08); c.lineTo(1.75, 0.38);
      c.lineTo(-0.15, 0.58); c.lineTo(-1.1, 0.58); c.lineTo(-1.7, 0.32); c.closePath();
    }, def.color, -0.08, 0.58);
    glass(c, [[-1.0, 0.5], [-0.25, 0.5], [-0.22, 0.26], [-1.05, 0.24]]);
    c.strokeStyle = '#d5dde6'; c.lineWidth = 0.03;
    c.beginPath(); c.moveTo(-1.6, 0.02); c.lineTo(1.6, 0.02); c.stroke();
    lamp(c, 1.78, 0.14, 'head'); lamp(c, -1.75, 0.12, 'tail');
    bolts(c, [[0.7, 0.0], [-0.4, 0.0]]);
  }
  function drawTrain(c, def) {
    chassis(c, -2.1, 2.6, -0.16);
    fillShell(c, () => { roundRect(c, -2.1, -0.05, 1.95, 0.72, 0.06); }, '#c0392b', -0.05, 0.67);
    fillShell(c, () => {
      c.beginPath();
      c.moveTo(2.55, -0.05); c.lineTo(0.2, -0.05); c.lineTo(0.15, 0.7);
      c.lineTo(1.15, 1.0); c.lineTo(2.45, 0.55); c.closePath();
    }, def.color, -0.05, 1.0);
    glass(c, [[1.7, 0.85], [1.15, 0.88], [1.1, 0.45], [1.7, 0.42]]);
    c.fillStyle = '#3a4048';
    c.beginPath(); c.arc(2.15, 1.05, 0.08, 0, TAU); c.fill();
    lamp(c, 2.45, 0.25, 'head');
    bolts(c, [[-0.4, 0.02], [-1.5, 0.02], [0.6, 0.02]]);
  }
  function drawMoonlander(c, def) {
    chassis(c, -0.9, 0.95, -0.16);
    fillShell(c, () => { roundRect(c, -0.9, -0.05, 1.85, 0.48, 0.08); }, def.color, -0.05, 0.43);
    fillShell(c, () => { roundRect(c, -0.65, 0.38, 0.7, 0.28, 0.05); }, def.color, 0.38, 0.66);
    glass(c, [[-0.5, 0.58], [-0.1, 0.58], [-0.08, 0.44], [-0.5, 0.44]]);
    c.fillStyle = '#3a4048';
    roundRect(c, 0.55, 0.02, 0.28, 0.22, 0.04); c.fill();
    c.strokeStyle = '#9aa3ad'; c.lineWidth = 0.025; c.stroke();
    lamp(c, 0.9, 0.2, 'head'); lamp(c, -0.8, 0.15, 'tail');
  }
  function drawRocket(c, def) {
    chassis(c, -1.05, 0.8, -0.14);
    fillShell(c, () => {
      c.beginPath();
      c.moveTo(-1.05, 0.02); c.lineTo(0.35, -0.02); c.lineTo(1.3, 0.16);
      c.lineTo(0.4, 0.38); c.lineTo(-0.85, 0.32); c.closePath();
    }, def.color, -0.02, 0.38);
    c.fillStyle = def.color;
    c.beginPath(); c.moveTo(-0.95, 0.32); c.lineTo(-0.55, 0.32); c.lineTo(-0.75, 0.62); c.closePath(); c.fill();
    c.strokeStyle = '#1a1a1a'; c.lineWidth = 0.03; c.stroke();
    c.fillStyle = '#3a4048';
    c.beginPath(); c.arc(-1.05, 0.14, 0.1, 0, TAU); c.fill();
    glass(c, [[-0.15, 0.32], [0.25, 0.28], [0.2, 0.14], [-0.15, 0.16]]);
    lamp(c, 1.15, 0.16, 'head');
    const pod = (x) => {
      c.fillStyle = '#c0392b';
      c.strokeStyle = '#1a1a1a';
      c.lineWidth = 0.028;
      c.beginPath();
      c.moveTo(x - 0.1, -0.02);
      c.lineTo(x + 0.1, -0.02);
      c.lineTo(x + 0.07, -0.2);
      c.lineTo(x - 0.07, -0.2);
      c.closePath();
      c.fill();
      c.stroke();
      c.fillStyle = '#2a2e34';
      c.fillRect(x - 0.045, -0.24, 0.09, 0.05);
    };
    pod(-0.22);
    pod(0.28);
  }
  function drawShifter(c, def) {
    const tall = def.shape === 'tall';
    chassis(c, -1.25, 1.25, -0.16);
    if (!tall) {
      fillShell(c, () => {
        c.beginPath();
        c.moveTo(-1.3, -0.06); c.lineTo(1.35, -0.06); c.lineTo(1.15, 0.2);
        c.lineTo(-0.1, 0.36); c.lineTo(-1.1, 0.2); c.closePath();
      }, def.color, -0.06, 0.36);
      glass(c, [[-0.7, 0.28], [-0.2, 0.28], [-0.18, 0.12], [-0.7, 0.1]]);
    } else {
      fillShell(c, () => {
        c.beginPath();
        c.moveTo(-1.1, -0.02); c.lineTo(1.1, -0.02); c.lineTo(1.0, 0.5);
        c.lineTo(-0.15, 0.9); c.lineTo(-0.85, 0.85); c.lineTo(-1.1, 0.35); c.closePath();
      }, def.color, -0.02, 0.9);
      glass(c, [[-0.75, 0.75], [-0.25, 0.78], [-0.2, 0.4], [-0.78, 0.38]]);
    }
    lamp(c, 1.2, 0.08, 'head'); lamp(c, -1.15, 0.08, 'tail');
    bolts(c, [[0.3, 0.0]]);
  }
  function drawSleigh(c, def) {
    c.fillStyle = '#d5dde6';
    c.beginPath();
    c.moveTo(-1.15, -0.08); c.quadraticCurveTo(-0.2, -0.35, 1.15, -0.12);
    c.lineTo(1.05, -0.22); c.quadraticCurveTo(-0.15, -0.48, -1.05, -0.2); c.closePath();
    c.fill(); c.strokeStyle = '#1a1a1a'; c.lineWidth = 0.03; c.stroke();
    fillShell(c, () => {
      c.beginPath();
      c.moveTo(-1.05, 0.05); c.lineTo(0.95, 0.02); c.lineTo(0.8, 0.42); c.lineTo(-0.9, 0.48); c.closePath();
    }, def.color, 0.02, 0.48);
    c.strokeStyle = '#f5c518'; c.lineWidth = 0.04;
    c.beginPath(); c.moveTo(0.85, 0.35); c.lineTo(1.15, 0.7); c.moveTo(0.95, 0.32); c.lineTo(1.3, 0.55); c.stroke();
    seatPad(c, -0.55, 0.28, 0.45, 0.08);
  }
  function drawSaucer(c, def) {
    c.fillStyle = 'rgba(57,243,255,0.35)';
    c.beginPath(); c.ellipse(0, -0.12, 1.15, 0.18, 0, 0, TAU); c.fill();
    fillShell(c, () => {
      c.beginPath(); c.ellipse(0, 0.05, 1.3, 0.22, 0, 0, TAU);
    }, def.color, -0.17, 0.27);
    fillShell(c, () => {
      c.beginPath(); c.arc(0, 0.28, 0.38, Math.PI, 0); c.closePath();
    }, '#d5dde6', 0.28, 0.66);
    glass(c, [[-0.28, 0.42], [0.28, 0.42], [0.22, 0.58], [-0.22, 0.58]]);
    lamp(c, 1.15, 0.05, 'head'); lamp(c, -1.15, 0.05, 'tail');
  }
  function drawTrackRacer(c, def) {
    c.fillStyle = '#1a1c18';
    roundRect(c, -1.45, -0.7, 2.95, 0.42, 0.16); c.fill();
    c.strokeStyle = '#0e0f0c'; c.lineWidth = 0.04; c.stroke();
    chassis(c, -1.35, 1.4, -0.12);
    fillShell(c, () => {
      c.beginPath();
      c.moveTo(-1.4, -0.05); c.lineTo(1.5, -0.08); c.lineTo(1.35, 0.25);
      c.lineTo(-0.2, 0.5); c.lineTo(-1.1, 0.46); c.lineTo(-1.35, 0.2); c.closePath();
    }, def.color, -0.08, 0.5);
    glass(c, [[-0.85, 0.4], [-0.25, 0.4], [-0.22, 0.18], [-0.88, 0.16]]);
    lamp(c, 1.4, 0.1, 'head'); lamp(c, -1.3, 0.08, 'tail');
    bolts(c, [[0.4, 0.0], [-0.5, 0.0]]);
  }
  function facetShell(c, trace, col, y0, y1) {
    const top = Math.max(y0, y1), bot = Math.min(y0, y1);
    trace();
    c.fillStyle = bodyGradient(c, 0, bot, 0, top, col);
    c.fill();
    c.save();
    trace();
    c.clip();
    c.fillStyle = 'rgba(255,255,255,0.28)';
    c.fillRect(-20, top - 0.08, 40, 0.08);
    c.restore();
    trace();
    c.strokeStyle = '#1a1a1a';
    c.lineWidth = 0.05;
    c.lineJoin = 'miter';
    c.miterLimit = 2.5;
    c.stroke();
  }

  function drawCybertruck(c, def) {
    const trace = () => {
      c.beginPath();
      def.hull.forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])));
      c.closePath();
    };
    facetShell(c, trace, def.color, -0.08, 1);
    c.fillStyle = '#2a2e34';
    c.beginPath();
    c.moveTo(-1.72, 0.48); c.lineTo(-0.82, 0.68); c.lineTo(-0.78, 0.28); c.lineTo(-1.68, 0.16);
    c.closePath();
    c.fill();
    c.strokeStyle = '#1a1a1a';
    c.lineWidth = 0.03;
    c.lineJoin = 'miter';
    c.stroke();
    c.fillStyle = '#14181e';
    c.beginPath();
    c.moveTo(1.05, 0.46); c.lineTo(0.28, 0.92); c.lineTo(-0.55, 0.7); c.lineTo(-0.12, 0.4);
    c.closePath();
    c.fill();
    c.strokeStyle = '#0a0c10';
    c.lineWidth = 0.03;
    c.stroke();
    c.strokeStyle = 'rgba(255,255,255,0.45)';
    c.lineWidth = 0.02;
    c.beginPath();
    c.moveTo(0.82, 0.52); c.lineTo(0.34, 0.82);
    c.stroke();
    c.strokeStyle = 'rgba(255,255,255,0.55)';
    c.lineWidth = 0.025;
    c.beginPath();
    c.moveTo(-1.68, 0.5); c.lineTo(-0.7, 0.7); c.lineTo(0.22, 0.96); c.lineTo(1.15, 0.46);
    c.stroke();
    c.fillStyle = '#f4f7fb';
    c.fillRect(1.72, 0.18, 0.2, 0.045);
    c.fillStyle = '#9ad7ff';
    c.fillRect(1.74, 0.19, 0.16, 0.02);
    c.fillStyle = '#e23b2f';
    c.fillRect(-1.93, 0.26, 0.06, 0.16);
  }

  function drawRoadster(c, def) {
    let wingLift = 0;
    if (world && world.body && state === 'play') {
      const jets = input.jumpHold && world.fuel > 0;
      if (jets || Math.abs(world.body.vx) > 6) wingLift = 0.28;
    }
    const rear = def.wheels[0], front = def.wheels[1];
    const trace = () => {
      c.beginPath();
      c.moveTo(2.16, 0.06);
      c.quadraticCurveTo(1.72, 0.07, 1.18, 0.11);
      c.quadraticCurveTo(0.72, 0.18, 0.4, 0.38);
      c.quadraticCurveTo(0.02, 0.52, -0.38, 0.5);
      c.quadraticCurveTo(-0.95, 0.47, -1.42, 0.38);
      c.quadraticCurveTo(-1.76, 0.32, -1.94, 0.3);
      c.lineTo(-1.98, 0.28);
      c.lineTo(-1.98, -0.05);
      c.quadraticCurveTo(-1.68, -0.28, -1.25, -0.46);
      c.quadraticCurveTo(-0.7, -0.24, 0.15, -0.16);
      c.quadraticCurveTo(0.85, -0.2, 1.2, -0.34);
      c.quadraticCurveTo(1.44, -0.48, 1.72, -0.28);
      c.quadraticCurveTo(1.98, -0.04, 2.16, 0.06);
      c.closePath();
    };
    trace();
    const paint = c.createLinearGradient(0, -0.48, 0, 0.52);
    paint.addColorStop(0, '#c5ccd3');
    paint.addColorStop(0.4, '#e4e8ed');
    paint.addColorStop(0.75, '#f7f8fa');
    paint.addColorStop(1, '#ffffff');
    c.fillStyle = paint;
    c.fill();
    c.save();
    trace();
    c.clip();
    c.fillStyle = 'rgba(255,255,255,0.5)';
    c.beginPath();
    c.ellipse(-0.15, 0.46, 0.85, 0.07, -0.04, 0, TAU);
    c.fill();
    c.restore();
    trace();
    c.strokeStyle = '#2a3036';
    c.lineWidth = 0.028;
    c.lineJoin = 'round';
    c.stroke();
    c.fillStyle = '#14171c';
    c.beginPath();
    c.moveTo(0.9, -0.16);
    c.quadraticCurveTo(0.15, -0.1, -0.4, -0.04);
    c.quadraticCurveTo(-0.82, 0.04, -0.92, 0.08);
    c.lineTo(-0.78, -0.02);
    c.quadraticCurveTo(-0.2, -0.14, 0.55, -0.2);
    c.lineTo(0.95, -0.24);
    c.closePath();
    c.fill();
    c.fillStyle = '#12151a';
    c.beginPath();
    c.moveTo(1.08, 0.04);
    c.quadraticCurveTo(0.96, 0.1, 0.84, 0.03);
    c.quadraticCurveTo(0.8, -0.05, 0.96, -0.09);
    c.quadraticCurveTo(1.1, -0.07, 1.08, 0.04);
    c.closePath();
    c.fill();
    c.strokeStyle = 'rgba(255,255,255,0.75)';
    c.lineWidth = 0.012;
    c.stroke();
    c.strokeStyle = '#c5ced6';
    c.lineWidth = 0.02;
    c.beginPath();
    c.moveTo(1.85, 0.07);
    c.lineTo(0.55, 0.12);
    c.lineTo(-1.55, 0.2);
    c.stroke();
    c.beginPath();
    c.moveTo(0.62, 0.18);
    c.quadraticCurveTo(0.22, 0.4, -0.12, 0.46);
    c.quadraticCurveTo(-0.58, 0.46, -0.98, 0.34);
    c.quadraticCurveTo(-1.04, 0.26, -0.58, 0.2);
    c.quadraticCurveTo(0.05, 0.14, 0.48, 0.15);
    c.quadraticCurveTo(0.62, 0.16, 0.62, 0.18);
    c.closePath();
    const glass = c.createLinearGradient(0, 0.14, 0, 0.48);
    glass.addColorStop(0, '#121418');
    glass.addColorStop(0.4, '#2a3038');
    glass.addColorStop(1, '#0c0e12');
    c.fillStyle = glass;
    c.fill();
    c.strokeStyle = '#101214';
    c.lineWidth = 0.02;
    c.stroke();
    c.strokeStyle = 'rgba(255,255,255,0.88)';
    c.lineWidth = 0.018;
    c.beginPath();
    c.moveTo(0.22, 0.4);
    c.quadraticCurveTo(-0.25, 0.45, -0.7, 0.36);
    c.stroke();
    if (world && world.wheels) {
      world.wheels.forEach((wh) => drawWheel(c, wh.lx, wh.ly, wh.r, wh.ang, def));
    } else {
      def.wheels.forEach((wh) => drawWheel(c, wh.x, wh.y, wh.r, 0, def));
    }
    const fenderLip = (x, y, r) => {
      c.save();
      c.beginPath();
      c.rect(x - r - 0.08, y, r * 2 + 0.16, r + 0.2);
      c.clip();
      c.fillStyle = '#f4f6f8';
      c.beginPath();
      c.arc(x, y, r * 0.9, 0, TAU);
      c.fill();
      c.strokeStyle = '#1c2026';
      c.lineWidth = 0.03;
      c.beginPath();
      c.arc(x, y, r * 0.97, 0, TAU);
      c.stroke();
      c.restore();
    };
    fenderLip(front.x, front.y, front.r);
    fenderLip(rear.x, rear.y, rear.r);
    c.fillStyle = '#e10600';
    for (const [x, y] of [[-1.95, 0.18], [-1.89, 0.18], [-1.95, 0.1], [-1.89, 0.1]]) {
      c.beginPath();
      c.arc(x, y, 0.028, 0, TAU);
      c.fill();
    }
    c.fillStyle = '#ff4a3a';
    c.beginPath();
    c.arc(-1.97, 0.23, 0.014, 0, TAU);
    c.fill();
    c.fillStyle = '#e37a1a';
    c.fillRect(1.0, 0.06, 0.08, 0.016);
    if (wingLift > 0) {
      const yWing = 0.32 + wingLift;
      c.strokeStyle = '#1a1a1a';
      c.lineWidth = 0.025;
      c.beginPath();
      c.moveTo(-1.72, 0.3);
      c.lineTo(-1.74, yWing);
      c.moveTo(-1.42, 0.34);
      c.lineTo(-1.44, yWing);
      c.stroke();
      c.fillStyle = '#14161a';
      c.beginPath();
      c.moveTo(-1.96, yWing);
      c.lineTo(-1.22, yWing + 0.012);
      c.lineTo(-1.26, yWing + 0.05);
      c.lineTo(-1.92, yWing + 0.038);
      c.closePath();
      c.fill();
    }
  }

  function drawFastBike(c, def) {
    c.strokeStyle = '#c5ced6'; c.lineWidth = 0.05; c.lineCap = 'round';
    c.beginPath();
    c.moveTo(-0.7, 0.02); c.lineTo(0.15, 0.32); c.lineTo(0.7, 0.05);
    c.moveTo(0.4, 0.28); c.lineTo(def.hand.x, def.hand.y);
    c.stroke();
    fillShell(c, () => {
      c.beginPath();
      c.moveTo(-0.15, 0.16); c.quadraticCurveTo(0.25, 0.42, 0.5, 0.22); c.quadraticCurveTo(0.2, 0.08, -0.15, 0.16); c.closePath();
    }, def.color, 0.08, 0.42);
    seatPad(c, -0.55, 0.28, 0.4, 0.07);
    lamp(c, 0.78, 0.12, 'head');
    bolts(c, [[0.1, 0.12]]);
  }

  function drawHullCar(c, def) {
    const ys = def.hull.map((p) => p[1]);
    const y0 = Math.min.apply(null, ys), y1 = Math.max.apply(null, ys);
    fillShell(c, () => {
      c.beginPath();
      def.hull.forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])));
      c.closePath();
    }, def.color, y0, y1);
  }

  function wheelsBeforeBody(def) {
    return !!(def.bike || def.id === 'hover' || def.id === 'snowmobile' || def.id === 'sleigh');
  }

  function hideWheels(def) {
    return false;
  }

  function ghostPaint(def, stage) {
    if (!def) return def;
    if (def.matchColor) return def;
    const vid = isUnbreakable(def) ? UNBREAKABLE_MENU_ANCHOR : def.id;
    const p = save.paint && save.paint[vid];
    if (!p) return def;
    const color = p.color || def.color;
    const decal = p.decal || 'none';
    if (color === def.color && decal === 'none') return def;
    return Object.assign({}, def, { color, decal });
  }

  function carHideAlpha(w) {
    if (!w || w !== world) return 1;
    if (isGhostUnbreakable(w.def) && input.stealthHold) return 0;
    const t = w && w.hideT;
    if (!t) return 1;
    const elapsed = 1.15 - t;
    if (elapsed < 0.12) return 1 - elapsed / 0.12;
    if (elapsed < 0.7) return 0;
    return clamp((elapsed - 0.7) / 0.45, 0, 1);
  }

  function drawBellyBoosters(c, xs, nozzleY) {
    const ny = nozzleY == null ? -0.28 : nozzleY;
    for (const x of xs) {
      const can = c.createLinearGradient(x - 0.05, 0, x + 0.05, 0);
      can.addColorStop(0, '#5a646e');
      can.addColorStop(0.35, '#d8e0e8');
      can.addColorStop(0.55, '#8d99a4');
      can.addColorStop(1, '#3a424a');
      c.fillStyle = can;
      roundRect(c, x - 0.048, ny + 0.04, 0.096, 0.11, 0.02);
      c.fill();
      c.fillStyle = '#1a1c20';
      c.beginPath();
      c.moveTo(x - 0.05, ny + 0.042);
      c.lineTo(x + 0.05, ny + 0.042);
      c.lineTo(x + 0.068, ny);
      c.lineTo(x - 0.068, ny);
      c.closePath();
      c.fill();
      c.fillStyle = '#0a0c10';
      c.beginPath();
      c.ellipse(x, ny, 0.05, 0.016, 0, 0, TAU);
      c.fill();
    }
  }

  function drawLavaVent(c, x, y) {
    c.fillStyle = '#2a1814';
    roundRect(c, x - 0.055, y + 0.1, 0.11, 0.1, 0.02);
    c.fill();
    const g = c.createLinearGradient(x - 0.12, 0, x + 0.12, 0);
    g.addColorStop(0, '#1a0c08');
    g.addColorStop(0.4, '#6a3828');
    g.addColorStop(1, '#120808');
    c.fillStyle = g;
    c.beginPath();
    c.moveTo(x - 0.05, y + 0.12);
    c.lineTo(x + 0.05, y + 0.12);
    c.lineTo(x + 0.12, y);
    c.lineTo(x - 0.12, y);
    c.closePath();
    c.fill();
    const glow = c.createRadialGradient(x, y, 0.01, x, y, 0.09);
    glow.addColorStop(0, '#ffb048');
    glow.addColorStop(0.45, '#ff5018');
    glow.addColorStop(1, 'rgba(60,8,0,0)');
    c.fillStyle = glow;
    c.beginPath();
    c.ellipse(x, y, 0.065, 0.022, 0, 0, TAU);
    c.fill();
  }
  function drawLavaJet(c, x, y) {
    const len = 0.58 + Math.random() * 0.48;
    const wob = (Math.random() - 0.5) * 0.05;
    const g = c.createRadialGradient(x, y, 0.02, x + wob, y - len * 0.52, 0.3);
    g.addColorStop(0, 'rgba(255,240,180,0.92)');
    g.addColorStop(0.22, 'rgba(255,120,40,0.85)');
    g.addColorStop(0.5, 'rgba(220,48,12,0.7)');
    g.addColorStop(0.78, 'rgba(120,20,4,0.35)');
    g.addColorStop(1, 'rgba(40,8,0,0)');
    c.fillStyle = g;
    c.beginPath();
    c.ellipse(x + wob, y - len * 0.4, 0.11 + Math.random() * 0.04, len * 0.56, 0, 0, TAU);
    c.fill();
  }

  function drawWaterNozzle(c, x, y) {
    c.fillStyle = '#2a2e34';
    roundRect(c, x - 0.055, y + 0.1, 0.11, 0.1, 0.02);
    c.fill();
    const g = c.createLinearGradient(x - 0.12, 0, x + 0.12, 0);
    g.addColorStop(0, '#1a2830');
    g.addColorStop(0.35, '#9eb8c8');
    g.addColorStop(0.55, '#4a6a7a');
    g.addColorStop(1, '#142028');
    c.fillStyle = g;
    c.beginPath();
    c.moveTo(x - 0.05, y + 0.12);
    c.lineTo(x + 0.05, y + 0.12);
    c.lineTo(x + 0.12, y);
    c.lineTo(x - 0.12, y);
    c.closePath();
    c.fill();
    const glow = c.createRadialGradient(x, y, 0.01, x, y, 0.08);
    glow.addColorStop(0, '#c8f4ff');
    glow.addColorStop(0.45, '#3ac4f0');
    glow.addColorStop(1, 'rgba(10,48,72,0)');
    c.fillStyle = glow;
    c.beginPath();
    c.ellipse(x, y, 0.06, 0.02, 0, 0, TAU);
    c.fill();
  }
  function drawWaterJet(c, x, y) {
    const len = 0.62 + Math.random() * 0.52;
    const wob = (Math.random() - 0.5) * 0.04;
    const g = c.createRadialGradient(x, y, 0.02, x + wob, y - len * 0.52, 0.28);
    g.addColorStop(0, 'rgba(240,252,255,0.92)');
    g.addColorStop(0.18, 'rgba(175,228,255,0.82)');
    g.addColorStop(0.42, 'rgba(72,178,235,0.65)');
    g.addColorStop(0.72, 'rgba(22,108,168,0.32)');
    g.addColorStop(1, 'rgba(8,48,72,0)');
    c.fillStyle = g;
    c.beginPath();
    c.ellipse(x + wob, y - len * 0.38, 0.085 + Math.random() * 0.028, len * 0.52, 0, 0, TAU);
    c.fill();
  }

  function drawLightningCoil(c, x, y) {
    c.fillStyle = '#2a2040';
    roundRect(c, x - 0.055, y + 0.1, 0.11, 0.1, 0.02);
    c.fill();
    c.strokeStyle = '#c080ff';
    c.lineWidth = 0.022;
    for (let i = 0; i < 3; i++) {
      c.beginPath();
      c.arc(x, y + 0.05 - i * 0.04, 0.06 - i * 0.012, 0, TAU);
      c.stroke();
    }
    const glow = c.createRadialGradient(x, y, 0.01, x, y, 0.1);
    glow.addColorStop(0, '#e6eef8');
    glow.addColorStop(0.28, '#cb81f0');
    glow.addColorStop(0.55, '#6657ab');
    glow.addColorStop(1, 'rgba(57,42,108,0)');
    c.fillStyle = glow;
    c.beginPath();
    c.ellipse(x, y, 0.07, 0.024, 0, 0, TAU);
    c.fill();
  }
  function buildBoltPts(x, y, len, segs, wob) {
    const pts = [[x, y]];
    let px = x, py = y;
    for (let i = 0; i < segs; i++) {
      px += wob * (0.35 + i * 0.12) + (Math.random() - 0.5) * 0.048;
      py -= len / segs;
      pts.push([px, py]);
    }
    return pts;
  }
  function strokeCarBolt(c, pts, aMul) {
    const layers = [
      ['rgba(57,42,108,', 0.11, 0.34],
      ['rgba(102,87,171,', 0.052, 0.78],
      ['rgba(130,117,187,', 0.028, 0.88],
      ['rgba(203,129,240,', 0.014, 0.95],
      ['rgba(245,248,255,', 0.006, 1],
    ];
    c.lineCap = 'round';
    c.lineJoin = 'round';
    for (const [pre, w, alpha] of layers) {
      c.strokeStyle = pre + (alpha * aMul) + ')';
      c.lineWidth = w;
      c.beginPath();
      c.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]);
      c.stroke();
    }
  }
  function drawLightningJet(c, x, y) {
    const len = 0.58 + Math.random() * 0.44;
    const wob = (Math.random() - 0.5) * 0.07;
    const pts = buildBoltPts(x, y, len, 5, wob);
    strokeCarBolt(c, pts, 0.85 + Math.random() * 0.12);
    const glow = c.createRadialGradient(x, y, 0.01, x, y, 0.14);
    glow.addColorStop(0, 'rgba(245,248,255,0.95)');
    glow.addColorStop(0.35, 'rgba(203,129,240,0.65)');
    glow.addColorStop(0.7, 'rgba(102,87,171,0.25)');
    glow.addColorStop(1, 'rgba(57,42,108,0)');
    c.fillStyle = glow;
    c.beginPath();
    c.arc(x, y, 0.055, 0, TAU);
    c.fill();
  }

  function drawUnbreakableJetEffects(c, def, jets) {
    if (!jets || isGhostUnbreakable(def)) return;
    const mode = unbreakableJetMode(def);
    const ny = def.boosterY != null ? def.boosterY : -0.3;
    const rockets = def.rockets || [-0.85, 0.9];
    const xs = rockets.concat(def.boosters || []);
    if (mode === 'lava') {
      for (const x of xs) drawLavaJet(c, x, ny);
    } else if (mode === 'water') {
      for (const x of xs) drawWaterJet(c, x, ny);
    } else if (mode === 'lightning') {
      for (const x of xs) drawLightningJet(c, x, ny);
    } else {
      for (const x of (def.boosters || [-0.3, 0.15, 0.6])) {
        const g = c.createRadialGradient(x, ny - 0.08, 0.01, x, ny - 0.35, 0.22);
        g.addColorStop(0, 'rgba(255,255,255,0.85)');
        g.addColorStop(1, 'rgba(228,236,246,0)');
        c.fillStyle = g;
        c.beginPath();
        c.ellipse(x, ny - 0.22, 0.06, 0.2, 0, 0, TAU);
        c.fill();
      }
      for (const x of rockets) {
        const len = 0.32 + Math.random() * 0.4;
        c.fillStyle = '#ff9a2a';
        c.beginPath();
        c.moveTo(x - 0.055, -0.27); c.lineTo(x + 0.055, -0.27); c.lineTo(x, -0.27 - len); c.closePath();
        c.fill();
      }
    }
  }

  function jetParticleColor(def) {
    const mode = unbreakableJetMode(def);
    if (mode === 'lava') return '255,90,24';
    if (mode === 'water') return '64,185,240';
    if (mode === 'lightning') return '200,80,255';
    return '228,236,246';
  }

  function spawnUnbreakableJetParticles(dt, w) {
    if (!w || !isUnbreakable(w.def) || isGhostUnbreakable(w.def)) return;
    if (!(state === 'play' && input.jumpHold && w.fuel > 0 && !w.crashed)) return;
    const def = w.def;
    const ny = def.boosterY != null ? def.boosterY : -0.3;
    const xs = (def.rockets || [-0.85, 0.9]).concat(def.boosters || []);
    const col = jetParticleColor(def);
    const kind = unbreakableJetMode(def) === 'air' ? 'mist' : unbreakableJetMode(def);
    const b = w.body;
    const cos = Math.cos(b.a), sin = Math.sin(b.a);
    for (const lx of xs) {
      if (Math.random() > dt * 28) continue;
      const wx = b.x + lx * cos - ny * sin;
      const wy = b.y + lx * sin + ny * cos;
      w.particles.push({
        x: wx, y: wy,
        vx: b.vx - cos * 1.2 + (Math.random() - 0.5) * 0.6,
        vy: b.vy + 1.5 + Math.random(),
        life: 0.35 + Math.random() * 0.25,
        max: 0.55,
        r: 0.06 + Math.random() * 0.08,
        c: col,
        kind,
      });
    }
  }

  function drawUnbreakable(c, def, stage) {
    if (isGhostUnbreakable(def)) {
      const st = stage || (world && world.stage);
      const dark = st && (st.dark || 0) >= 0.22;
      const paint = dark ? '#101010' : '#f2f4f7';
      const accent = dark ? '#3a3a3a' : '#d8dce2';
      chassis(c, -1.5, 1.55, -0.16);
      fillShell(c, () => {
        c.beginPath();
        c.moveTo(-1.52, -0.05); c.lineTo(1.58, -0.06); c.lineTo(1.48, 0.3);
        c.lineTo(0.25, 0.54); c.lineTo(-0.8, 0.54); c.lineTo(-1.42, 0.3); c.closePath();
      }, paint, -0.06, 0.54);
      c.fillStyle = accent;
      roundRect(c, -1.15, 0.18, 2.2, 0.07, 0.02);
      c.fill();
      c.fillStyle = dark ? '#181818' : '#e8eaee';
      roundRect(c, -0.95, 0.08, 0.55, 0.16, 0.03);
      c.fill();
      glass(c, [[-0.58, 0.5], [-0.08, 0.5], [-0.05, 0.3], [-0.6, 0.28]]);
      lamp(c, 1.45, 0.12, 'head');
      lamp(c, -1.45, 0.14, 'tail');
      bolts(c, [[-1.1, 0.02], [0.35, 0.02], [1.05, 0.02]]);
      return;
    }
    const lava = isLavaJet(def);
    const water = isWaterJet(def);
    const lightning = isLightningJet(def);
    chassis(c, -1.5, 1.55, -0.16);
    fillShell(c, () => {
      c.beginPath();
      c.moveTo(-1.52, -0.05); c.lineTo(1.58, -0.06); c.lineTo(1.48, 0.3);
      c.lineTo(0.25, 0.54); c.lineTo(-0.8, 0.54); c.lineTo(-1.42, 0.3); c.closePath();
    }, def.color, -0.06, 0.54);
    c.fillStyle = lava ? '#ff6a28' : water ? '#5ee0ff' : lightning ? '#b040ff' : '#c9a227';
    roundRect(c, -1.15, 0.18, 2.2, 0.07, 0.02);
    c.fill();
    c.fillStyle = '#1a1c20';
    roundRect(c, -0.95, 0.08, 0.55, 0.16, 0.03);
    c.fill();
    glass(c, [[-0.58, 0.5], [-0.08, 0.5], [-0.05, 0.3], [-0.6, 0.28]]);
    lamp(c, 1.45, 0.12, 'head');
    lamp(c, -1.45, 0.14, 'tail');
    bolts(c, [[-1.1, 0.02], [0.35, 0.02], [1.05, 0.02]]);
    const rockets = def.rockets || [-0.85, 0.9];
    const ny = def.boosterY != null ? def.boosterY : -0.3;
    if (lava) {
      for (const x of rockets.concat(def.boosters || [])) drawLavaVent(c, x, ny);
    } else if (water) {
      for (const x of rockets.concat(def.boosters || [])) drawWaterNozzle(c, x, ny);
    } else if (lightning) {
      for (const x of rockets.concat(def.boosters || [])) drawLightningCoil(c, x, ny);
    } else {
      for (const x of rockets) {
        c.fillStyle = '#c0392b';
        c.strokeStyle = '#1a1a1a';
        c.lineWidth = 0.028;
        c.beginPath();
        c.moveTo(x - 0.11, -0.04);
        c.lineTo(x + 0.11, -0.04);
        c.lineTo(x + 0.08, -0.22);
        c.lineTo(x - 0.08, -0.22);
        c.closePath();
        c.fill();
        c.stroke();
        c.fillStyle = '#2a2e34';
        c.fillRect(x - 0.05, -0.27, 0.1, 0.06);
      }
      drawBellyBoosters(c, def.boosters || [-0.3, 0.15, 0.6], ny);
    }
  }

  function drawBody(c, def) {
    c.lineWidth = 0.055; c.strokeStyle = '#1a1a1a'; c.lineJoin = 'round'; c.lineCap = 'round';
    const id = def.id;
    if (id === 'jeep') drawJeep(c, def);
    else if (id === 'bike') drawDirtBike(c, def);
    else if (id === 'monster') drawMonster(c, def);
    else if (id === 'quad') drawQuad(c, def);
    else if (id === 'tractor') drawTractor(c, def);
    else if (id === 'racecar') drawRaceCar(c, def);
    else if (id === 'bus') drawBus(c, def);
    else if (id === 'tank') drawTank(c, def);
    else if (id === 'van') drawVan(c, def);
    else if (id === 'police') drawPolice(c, def);
    else if (id === 'ambulance') drawAmbulance(c, def);
    else if (id === 'diesel') drawDiesel(c, def);
    else if (id === 'chopper') drawChopper(c, def);
    else if (id === 'snowmobile') drawSnowmobile(c, def);
    else if (id === 'truck') drawTruck(c, def);
    else if (id === 'buggy') drawBuggy(c, def);
    else if (id === 'hover') drawHover(c, def);
    else if (id === 'finger') drawFinger(c, def);
    else if (id === 'rally') drawRally(c, def);
    else if (id === 'dragster') drawDragster(c, def);
    else if (id === 'scooter') drawScooter(c, def);
    else if (id === 'superjeep') drawSuperJeep(c, def);
    else if (id === 'used') drawUsed(c, def);
    else if (id === 'family') drawFamily(c, def);
    else if (id === 'trophy') drawTrophy(c, def);
    else if (id === 'electric') drawElectric(c, def);
    else if (id === 'minibike') drawMinibike(c, def);
    else if (id === 'corkscrew') drawCorkscrew(c, def);
    else if (id === 'lowrider') drawLowrider(c, def);
    else if (id === 'firetruck') drawFiretruck(c, def);
    else if (id === 'hotrod') drawHotrod(c, def);
    else if (id === 'fastcar') drawFastCar(c, def);
    else if (id === 'skycar') drawSkyCar(c, def);
    else if (id === 'luxury') drawLuxury(c, def);
    else if (id === 'train') drawTrain(c, def);
    else if (id === 'moonlander') drawMoonlander(c, def);
    else if (id === 'rocket') drawRocket(c, def);
    else if (id === 'shifter') drawShifter(c, def);
    else if (id === 'sleigh') drawSleigh(c, def);
    else if (id === 'saucer') drawSaucer(c, def);
    else if (id === 'trackracer') drawTrackRacer(c, def);
    else if (id === 'fastbike') drawFastBike(c, def);
    else if (id === 'roadster') drawRoadster(c, def);
    else if (id === 'cybertruck') drawCybertruck(c, def);
    else if (isUnbreakable(def)) drawUnbreakable(c, def, world && world.stage);
    else drawHullCar(c, def);
    if (id !== 'jeep') exhaustPipe(c, def);
    drawDecal(c, def);
  }

  function driverCtx(w) {
    const t = performance.now() / 1000;
    if (!w || !w.body) return { crashed: false, airborne: false, speed: 0, gas: false, brake: false, va: 0, t, bounce: 0 };
    let contact = 0;
    if (w.wheels) for (const wh of w.wheels) if (wh.contact) contact++;
    const frac = w.wheels && w.wheels.length ? contact / w.wheels.length : 0;
    const bounce = frac ? 0.028 * frac + Math.sin(t * 22) * 0.012 * frac : 0;
    return { crashed: w.crashed, airborne: w.airborne, speed: Math.hypot(w.body.vx, w.body.vy), gas: input.gas, brake: input.brake, va: w.body.va, t, bounce };
  }

  function driverFaceSvg(kind) {
    if (kind === 'crash') {
      return `<g fill="none" stroke="#20242c" stroke-width="5" stroke-linecap="round">
        <path d="M88 100 l18 18 m0-18 l-18 18"/>
        <path d="M132 100 l18 18 m0-18 l-18 18"/>
        <path d="M100 142 q18-14 36 0"/>
      </g>`;
    }
    if (kind === 'air') {
      return `<g>
        <ellipse cx="98" cy="102" rx="11" ry="16" fill="#20242c"/>
        <ellipse cx="140" cy="102" rx="11" ry="16" fill="#20242c"/>
        <circle cx="102" cy="98" r="3.5" fill="#fff"/>
        <circle cx="144" cy="98" r="3.5" fill="#fff"/>
        <path d="M84 84 q14 10 28 2" fill="none" stroke="#20242c" stroke-width="4" stroke-linecap="round"/>
        <path d="M126 82 q14 10 28 0" fill="none" stroke="#20242c" stroke-width="4" stroke-linecap="round"/>
        <ellipse cx="120" cy="140" rx="16" ry="14" fill="#3a1a18" stroke="#20242c" stroke-width="3"/>
        <ellipse cx="120" cy="142" rx="9" ry="7" fill="#c45a6a"/>
      </g>`;
    }
    return `<g>
      <ellipse cx="98" cy="106" rx="10" ry="15" fill="#20242c"/>
      <ellipse cx="140" cy="106" rx="10" ry="15" fill="#20242c"/>
      <circle cx="102" cy="102" r="3.4" fill="#fff"/>
      <circle cx="144" cy="102" r="3.4" fill="#fff"/>
      <path d="M86 90 l22 6" fill="none" stroke="#20242c" stroke-width="4" stroke-linecap="round"/>
      <path d="M130 90 l22 4" fill="none" stroke="#20242c" stroke-width="4" stroke-linecap="round"/>
      <path d="M118 112 q8 10 16-2" fill="none" stroke="#20242c" stroke-width="3.2" stroke-linecap="round"/>
      <circle cx="90" cy="124" r="2.2" fill="#c47a4a"/>
      <circle cx="98" cy="132" r="1.8" fill="#c47a4a"/>
      <circle cx="150" cy="124" r="2.2" fill="#c47a4a"/>
      <circle cx="158" cy="132" r="1.8" fill="#c47a4a"/>
      <path d="M100 136 q20 22 40 0" fill="none" stroke="#20242c" stroke-width="4.2" stroke-linecap="round"/>
      <path d="M108 138 q12 12 24 0" fill="#fff" stroke="#20242c" stroke-width="2"/>
    </g>`;
  }

  function driverUpperSvg(kind) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 260" width="240" height="260">
      <defs>
        <linearGradient id="sk" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#ffe0bd"/>
          <stop offset="55%" stop-color="#f2c094"/>
          <stop offset="100%" stop-color="#d99a72"/>
        </linearGradient>
        <linearGradient id="cap" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#4d86e8"/>
          <stop offset="55%" stop-color="#2456c8"/>
          <stop offset="100%" stop-color="#1a3e96"/>
        </linearGradient>
        <linearGradient id="shirt" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#2ec4b0"/>
          <stop offset="100%" stop-color="#0e7a70"/>
        </linearGradient>
      </defs>
      <g stroke="#20242c" stroke-width="7" fill="none" stroke-linecap="round" stroke-linejoin="round">
        <path d="M96 176 Q70 196 58 214"/>
        <path d="M148 176 Q168 188 186 200"/>
      </g>
      <g stroke="#159a8c" stroke-width="5" fill="none" stroke-linecap="round">
        <path d="M96 176 Q70 196 58 214"/>
        <path d="M148 176 Q168 188 186 200"/>
      </g>
      <circle cx="186" cy="200" r="26" fill="none" stroke="#2a2a32" stroke-width="8"/>
      <circle cx="186" cy="200" r="8" fill="none" stroke="#2a2a32" stroke-width="5"/>
      <path d="M160 200 H212 M186 200 V176" fill="none" stroke="#2a2a32" stroke-width="4" stroke-linecap="round"/>
      <circle cx="208" cy="202" r="9" fill="url(#sk)" stroke="#20242c" stroke-width="3"/>
      <circle cx="166" cy="204" r="8.5" fill="url(#sk)" stroke="#20242c" stroke-width="3"/>
      <path d="M88 168 Q118 188 152 168 L148 196 Q118 210 92 196 Z" fill="url(#shirt)" stroke="#20242c" stroke-width="4.5" stroke-linejoin="round"/>
      <rect x="108" y="148" width="24" height="28" rx="8" fill="url(#sk)" stroke="#20242c" stroke-width="3.5"/>
      <circle cx="62" cy="118" r="16" fill="#6b4423"/>
      <circle cx="174" cy="120" r="14" fill="#6b4423"/>
      <circle cx="118" cy="108" r="62" fill="url(#sk)" stroke="#20242c" stroke-width="5"/>
      <path d="M62 100 Q118 18 174 100 Q168 78 118 72 Q70 78 62 100 Z" fill="url(#cap)" stroke="#20242c" stroke-width="5" stroke-linejoin="round"/>
      <ellipse cx="100" cy="62" rx="18" ry="10" fill="#ffffff" fill-opacity="0.28"/>
      <rect x="126" y="92" width="78" height="20" rx="10" fill="#1c44a0" stroke="#20242c" stroke-width="3.5"/>
      <circle cx="118" cy="46" r="9" fill="#ffd84a" stroke="#20242c" stroke-width="3"/>
      ${driverFaceSvg(kind)}
    </svg>`;
  }

  function driverLowerSvg() {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 220" width="180" height="220">
      <defs>
        <linearGradient id="ls" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#2ec4b0"/>
          <stop offset="100%" stop-color="#0e7a70"/>
        </linearGradient>
        <linearGradient id="lk" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#ffe0bd"/>
          <stop offset="100%" stop-color="#f2c094"/>
        </linearGradient>
      </defs>
      <path d="M58 150 Q48 188 40 208" fill="none" stroke="#20242c" stroke-width="16" stroke-linecap="round"/>
      <path d="M122 150 Q132 188 142 206" fill="none" stroke="#20242c" stroke-width="16" stroke-linecap="round"/>
      <path d="M58 150 Q48 188 40 208" fill="none" stroke="#31456e" stroke-width="11" stroke-linecap="round"/>
      <path d="M122 150 Q132 188 142 206" fill="none" stroke="#31456e" stroke-width="11" stroke-linecap="round"/>
      <ellipse cx="38" cy="212" rx="14" ry="7" fill="#22252c"/>
      <ellipse cx="144" cy="210" rx="14" ry="7" fill="#22252c"/>
      <path d="M52 148 Q46 86 78 28 H102 Q134 86 128 148 Z" fill="url(#ls)" stroke="#20242c" stroke-width="5" stroke-linejoin="round"/>
      <rect x="58" y="78" width="64" height="12" rx="4" fill="#ffffff" fill-opacity="0.28"/>
      <rect x="78" y="16" width="24" height="28" rx="8" fill="url(#lk)" stroke="#20242c" stroke-width="3.5"/>
    </svg>`;
  }

  function svgToImg(svg) {
    const img = new Image();
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    return img;
  }
  const driverImgs = {
    upper: svgToImg(driverUpperSvg('normal')),
    crash: svgToImg(driverUpperSvg('crash')),
    air: svgToImg(driverUpperSvg('air')),
    lower: svgToImg(driverLowerSvg()),
  };
  function loadPng(src) {
    const img = new Image();
    img.onload = () => { try { refreshMenu(); } catch (e) { /* menu not ready yet */ } };
    img.src = src;
    return img;
  }
  const driverPng = {
    upper: loadPng('assets/driver-normal.png'),
    crash: loadPng('assets/driver-crash.png'),
    air: loadPng('assets/driver-air.png'),
  };
  function driverImgReady(img) { return img && img.complete && img.naturalWidth > 0; }

  // Face/eye anchor in the cropped Brennan sprite (467x803)
  const DRIVER_HEAD_U = 0.482;
  const DRIVER_HEAD_V = 0.297;
  const DRIVER_HEAD_RPX = 130;
  const DRIVER_UPPER_H = 0.65;
  const DRIVER_LOWER_Y = 0.58;

  function driverPngFor(drv) {
    const crashed = typeof drv === 'object' ? !!drv.crashed : !!drv;
    const airborne = typeof drv === 'object' && drv.airborne;
    return crashed ? driverPng.crash : airborne ? driverPng.air : driverPng.upper;
  }

  function drawDriverPng(c, def, drv, part) {
    const img = driverPngFor(drv);
    if (!driverImgReady(img)) return false;
    const h = def.head;
    const iw = img.naturalWidth, ih = img.naturalHeight;
    const sc = (h.r * 1.05) / DRIVER_HEAD_RPX;
    const open = def.bike || def.id === 'quad';
    const bob = (part === 'upper' && typeof drv === 'object') ? (drv.bounce || 0) : 0;
    let lean = 0;
    if (part === 'upper' && typeof drv === 'object') {
      const lim = drv.airborne ? 0.16 : 0.06;
      lean = Math.max(-lim, Math.min(lim, (drv.va || 0) * 0.1));
    }
    c.save();
    c.translate(h.x, h.y - bob);
    c.rotate(lean);
    c.scale(sc, -sc);
    const dx = -iw * DRIVER_HEAD_U;
    const dy = -ih * DRIVER_HEAD_V;
    c.beginPath();
    if (part === 'lower') {
      const top = DRIVER_LOWER_Y;
      const bot = open ? 1 : 0.78;
      c.rect(dx, dy + ih * top, iw, ih * (bot - top));
    } else {
      c.rect(dx, dy, iw, ih * DRIVER_UPPER_H);
    }
    c.clip();
    c.drawImage(img, dx, dy, iw, ih);
    c.restore();
    return true;
  }

  // Brennan: original big-head cartoon driver (navy cap, teal shirt, freckles)
  function drawDriverLowerCanvas(c, def) {
    const s = def.seat, h = def.head, r = h.r;
    const ol = '#20242c', skin = '#f2c094', shirt = '#159a8c';
    c.lineCap = 'round'; c.lineJoin = 'round';
    const open = def.bike || def.id === 'quad';
    if (open) {
      c.strokeStyle = ol; c.lineWidth = 0.14;
      c.beginPath();
      c.moveTo(s.x - 0.08, s.y + 0.02); c.lineTo(s.x - 0.3, s.y - 0.36);
      c.moveTo(s.x + 0.14, s.y + 0.02); c.lineTo(s.x + 0.3, s.y - 0.32);
      c.stroke();
      c.strokeStyle = '#31456e'; c.lineWidth = 0.09;
      c.beginPath();
      c.moveTo(s.x - 0.08, s.y + 0.02); c.lineTo(s.x - 0.3, s.y - 0.36);
      c.moveTo(s.x + 0.14, s.y + 0.02); c.lineTo(s.x + 0.3, s.y - 0.32);
      c.stroke();
      c.fillStyle = '#22252c';
      c.beginPath(); c.ellipse(s.x - 0.32, s.y - 0.38, 0.11, 0.06, 0.15, 0, TAU); c.fill();
      c.beginPath(); c.ellipse(s.x + 0.32, s.y - 0.34, 0.11, 0.06, 0.15, 0, TAU); c.fill();
    }
    const neckY = h.y - r * 1.02;
    c.fillStyle = shirt; c.strokeStyle = ol; c.lineWidth = 0.05;
    c.beginPath();
    c.moveTo(s.x - 0.3, s.y - 0.02);
    c.quadraticCurveTo(s.x - 0.36, s.y + 0.42, h.x - r * 0.3, neckY);
    c.lineTo(h.x + r * 0.34, neckY);
    c.quadraticCurveTo(s.x + 0.38, s.y + 0.42, s.x + 0.3, s.y - 0.02);
    c.closePath();
    c.fill(); c.stroke();
    c.fillStyle = 'rgba(255,255,255,0.22)';
    c.fillRect(s.x - 0.22, s.y + 0.18, 0.5, 0.07);
    c.fillStyle = skin; c.strokeStyle = ol; c.lineWidth = 0.045;
    roundRect(c, h.x - 0.08, neckY - 0.05, 0.17, r * 0.3, 0.04); c.fill(); c.stroke();
  }

  function drawDriverUpperCanvas(c, def, drv) {
    const crashed = typeof drv === 'object' ? !!drv.crashed : !!drv;
    const s = def.seat, h = def.head, hd = def.hand;
    const R = h.r * 1.18;
    const ol = '#20242c', skin = '#f2c094', shirt = '#159a8c';
    c.lineCap = 'round'; c.lineJoin = 'round';

    // arms (behind head, in front of body)
    c.strokeStyle = ol; c.lineWidth = 0.115;
    c.beginPath();
    c.moveTo(s.x + 0.24, s.y + 0.34);
    c.quadraticCurveTo((s.x + hd.x) * 0.5 + 0.05, (s.y + hd.y) * 0.5 + 0.1, hd.x, hd.y);
    c.moveTo(s.x - 0.24, s.y + 0.32);
    c.quadraticCurveTo(hd.x - 0.25, hd.y + 0.14, hd.x - 0.1, hd.y + 0.02);
    c.stroke();
    c.strokeStyle = shirt; c.lineWidth = 0.075;
    c.beginPath();
    c.moveTo(s.x + 0.24, s.y + 0.34);
    c.quadraticCurveTo((s.x + hd.x) * 0.5 + 0.05, (s.y + hd.y) * 0.5 + 0.1, hd.x, hd.y);
    c.moveTo(s.x - 0.24, s.y + 0.32);
    c.quadraticCurveTo(hd.x - 0.25, hd.y + 0.14, hd.x - 0.1, hd.y + 0.02);
    c.stroke();
    // steering wheel + hands
    c.strokeStyle = '#26262c'; c.lineWidth = 0.065;
    c.beginPath(); c.arc(hd.x, hd.y, 0.21, 0, TAU); c.stroke();
    c.beginPath(); c.moveTo(hd.x - 0.21, hd.y); c.lineTo(hd.x + 0.21, hd.y); c.moveTo(hd.x, hd.y); c.lineTo(hd.x, hd.y - 0.2); c.stroke();
    c.fillStyle = skin; c.strokeStyle = ol; c.lineWidth = 0.035;
    c.beginPath(); c.arc(hd.x + 0.17, hd.y + 0.02, 0.07, 0, TAU); c.fill(); c.stroke();
    c.beginPath(); c.arc(hd.x - 0.14, hd.y + 0.04, 0.065, 0, TAU); c.fill(); c.stroke();

    // head
    c.fillStyle = skin; c.strokeStyle = ol; c.lineWidth = 0.055;
    c.beginPath(); c.arc(h.x, h.y, R, 0, TAU); c.fill(); c.stroke();
    // brown hair at the sides, under the cap
    c.fillStyle = '#6b4423';
    c.beginPath(); c.arc(h.x - R * 0.86, h.y + R * 0.28, R * 0.24, 0, TAU); c.fill();
    c.beginPath(); c.arc(h.x + R * 0.82, h.y + R * 0.3, R * 0.2, 0, TAU); c.fill();
    // navy cap: dome on top + brim pointing forward (right)
    c.fillStyle = '#2456c8'; c.strokeStyle = ol; c.lineWidth = 0.05;
    c.beginPath(); c.arc(h.x, h.y + R * 0.08, R * 1.0, 0.12, Math.PI - 0.12); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = 'rgba(255,255,255,0.25)';
    c.beginPath(); c.arc(h.x - R * 0.25, h.y + R * 0.55, R * 0.3, 0.6, 2.1); c.fill();
    c.fillStyle = '#1c44a0';
    roundRect(c, h.x + R * 0.1, h.y + R * 0.42, R * 1.05, R * 0.24, R * 0.1); c.fill(); c.strokeStyle = ol; c.lineWidth = 0.045; c.stroke();
    c.fillStyle = '#ffd84a';
    c.beginPath(); c.arc(h.x, h.y + R * 1.02, R * 0.13, 0, TAU); c.fill(); c.stroke();

    const ey = h.y + R * 0.02;
    if (crashed) {
      c.strokeStyle = ol; c.lineWidth = 0.05;
      [[h.x - R * 0.22, ey], [h.x + R * 0.3, ey]].forEach(([ex, eyv]) => {
        c.beginPath();
        c.moveTo(ex - 0.07, eyv - 0.07); c.lineTo(ex + 0.07, eyv + 0.07);
        c.moveTo(ex - 0.07, eyv + 0.07); c.lineTo(ex + 0.07, eyv - 0.07);
        c.stroke();
      });
      c.beginPath(); c.arc(h.x + R * 0.05, h.y - R * 0.42, R * 0.18, 0.2, Math.PI - 0.2); c.stroke();
    } else {
      // two simple oval eyes, front-facing cartoon style
      c.fillStyle = '#20242c';
      c.beginPath();
      c.ellipse(h.x - R * 0.22, ey, R * 0.09, R * 0.15, 0, 0, TAU);
      c.ellipse(h.x + R * 0.3, ey, R * 0.09, R * 0.15, 0, 0, TAU);
      c.fill();
      c.fillStyle = '#fff';
      c.beginPath();
      c.arc(h.x - R * 0.19, ey + R * 0.05, R * 0.03, 0, TAU);
      c.arc(h.x + R * 0.33, ey + R * 0.05, R * 0.03, 0, TAU);
      c.fill();
      // brows + nose + freckles
      c.strokeStyle = ol; c.lineWidth = 0.04;
      c.beginPath();
      c.moveTo(h.x - R * 0.34, ey + R * 0.24); c.lineTo(h.x - R * 0.1, ey + R * 0.28);
      c.moveTo(h.x + R * 0.18, ey + R * 0.28); c.lineTo(h.x + R * 0.42, ey + R * 0.24);
      c.stroke();
      c.beginPath(); c.arc(h.x + R * 0.05, ey - R * 0.18, R * 0.09, Math.PI * 1.15, Math.PI * 1.7); c.stroke();
      c.fillStyle = 'rgba(160,100,50,0.55)';
      [[-0.48, -0.22], [-0.36, -0.3], [0.5, -0.24], [0.6, -0.32]].forEach(([dx, dy]) => {
        c.beginPath(); c.arc(h.x + R * dx, h.y + R * dy, R * 0.028, 0, TAU); c.fill();
      });
      // smile
      c.strokeStyle = ol; c.lineWidth = 0.045;
      c.beginPath(); c.arc(h.x + R * 0.04, h.y - R * 0.18, R * 0.24, Math.PI * 1.18, Math.PI * 1.82); c.stroke();
    }
  }

  const SHOW_DRIVER = false;

  function drawDriverLower(c, def, drv, force) {
    if ((!SHOW_DRIVER && !force) || (def.noDriver && !force)) return;
    if (drawDriverPng(c, def, drv, 'lower')) return;
    const img = driverImgs.lower;
    if (!driverImgReady(img)) { drawDriverLowerCanvas(c, def); return; }
    const s = def.seat, h = def.head;
    const sc = (h.r * 1.2) / 62;
    c.save();
    c.translate(s.x, s.y);
    c.scale(sc, -sc);
    const open = def.bike || def.id === 'quad';
    if (!open) {
      c.beginPath();
      c.rect(-90, -145, 180, 148);
      c.clip();
    }
    c.drawImage(img, -90, -145, 180, 220);
    c.restore();
  }

  function drawDriverUpper(c, def, drv, force) {
    if ((!SHOW_DRIVER && !force) || (def.noDriver && !force)) return;
    if (drawDriverPng(c, def, drv, 'upper')) return;
    const crashed = typeof drv === 'object' ? !!drv.crashed : !!drv;
    const airborne = typeof drv === 'object' && drv.airborne;
    const img = crashed ? driverImgs.crash : airborne ? driverImgs.air : driverImgs.upper;
    if (!driverImgReady(img)) { drawDriverUpperCanvas(c, def, drv); return; }
    const h = def.head;
    const sc = (h.r * 1.2) / 62;
    const bob = typeof drv === 'object' ? (drv.bounce || 0) : 0;
    let lean = 0;
    if (typeof drv === 'object') {
      const lim = drv.airborne ? 0.16 : 0.06;
      lean = Math.max(-lim, Math.min(lim, (drv.va || 0) * 0.1));
    }
    c.save();
    c.translate(h.x, h.y - bob);
    c.rotate(lean);
    c.scale(sc, -sc);
    c.drawImage(img, -118, -108, 240, 260);
    c.restore();
  }

  function drawDriver(c, def, drv, force) {
    drawDriverLower(c, def, drv, force);
    drawDriverUpper(c, def, drv, force);
  }

  function drawCar(c, w) {
    if (w.carBroken) return;
    const b = w.body, def = ghostPaint(w.def, w.stage);
    const alpha = carHideAlpha(w);
    const cos = Math.cos(b.a), sin = Math.sin(b.a);
    c.lineCap = 'round'; c.lineJoin = 'round';
    const bike = def.bike;
    c.save();
    if (alpha < 1) c.globalAlpha = alpha;
    if (def.id !== 'roadster' && !hideWheels(def)) {
      for (const wh of w.wheels) {
        const ax = b.x + wh.lx * cos - (wh.ly + 0.3) * sin, ay = b.y + wh.lx * sin + (wh.ly + 0.3) * cos;
        const kind = bike ? (wh.lx > 0 ? 'fork' : 'swing') : (def.id === 'monster' ? 'heavy' : 'strut');
        shock(c, ax, ay, wh.x, wh.y, kind);
      }
    }
    const under = wheelsBeforeBody(def);
    if (under && !hideWheels(def)) for (const wh of w.wheels) drawWheel(c, wh.x, wh.y, wh.r, wh.ang, def);
    c.save(); c.translate(b.x, b.y); c.rotate(b.a);
    const drv = driverCtx(w);
    if (w === world && w.rescue && w.rescue.carried) drawPassengerPart(c, def, drv, 'lower');
    drawDriverLower(c, def, drv);
    drawBody(c, def);
    if (w === world && w.nitro && w.nitro.t > 0 && state === 'play') drawNitroFlame(c, def);
    if (def.id === 'rocket' && state === 'play' && input.gas && w.fuel > 0 && !w.crashed) {
      const len = 0.45 + Math.random() * 0.55;
      c.fillStyle = '#ff9a2a';
      c.beginPath();
      c.moveTo(-1.16, 0.22); c.lineTo(-1.16, 0.04); c.lineTo(-1.16 - len, 0.13); c.closePath();
      c.fill();
      c.fillStyle = '#fff6c8';
      c.beginPath();
      c.moveTo(-1.16, 0.18); c.lineTo(-1.16, 0.08); c.lineTo(-1.16 - len * 0.45, 0.13); c.closePath();
      c.fill();
    }
    if (def.id === 'roadster' && state === 'play' && w.fuel > 0 && !w.crashed) {
      const puff = (x, y, dx, dy, len) => {
        const nx = -dy, ny = dx;
        c.fillStyle = 'rgba(170, 214, 255, 0.8)';
        c.beginPath();
        c.moveTo(x + nx * 0.045, y + ny * 0.045);
        c.lineTo(x - nx * 0.045, y - ny * 0.045);
        c.lineTo(x + dx * len, y + dy * len);
        c.closePath();
        c.fill();
        c.fillStyle = 'rgba(255,255,255,0.92)';
        c.beginPath();
        c.moveTo(x + nx * 0.02, y + ny * 0.02);
        c.lineTo(x - nx * 0.02, y - ny * 0.02);
        c.lineTo(x + dx * len * 0.42, y + dy * len * 0.42);
        c.closePath();
        c.fill();
      };
      if (input.gas) {
        for (const y of [-0.06, 0.0, 0.06]) puff(-2.1, y, -1, 0, 0.45 + Math.random() * 0.4);
      }
      if (input.jumpHold) {
        for (const x of [-0.7, 0.05, 0.75, 1.2]) puff(x, -0.5, 0, -1, 0.28 + Math.random() * 0.36);
      }
      if (input.jumpHold && input.brake && w.airborne) puff(-0.42, 0.16, -0.2, 0.15, 0.22 + Math.random() * 0.16);
    }
    if (def.id === 'rocket' && state === 'play' && input.jumpHold && w.fuel > 0 && !w.crashed) {
      for (const x of [-0.22, 0.28]) {
        const len = 0.32 + Math.random() * 0.4;
        c.fillStyle = '#ff9a2a';
        c.beginPath();
        c.moveTo(x - 0.055, -0.24); c.lineTo(x + 0.055, -0.24); c.lineTo(x, -0.24 - len); c.closePath();
        c.fill();
        c.fillStyle = '#fff6c8';
        c.beginPath();
        c.moveTo(x - 0.028, -0.24); c.lineTo(x + 0.028, -0.24); c.lineTo(x, -0.24 - len * 0.45); c.closePath();
        c.fill();
      }
    }
    if (isUnbreakable(def)) {
      const jets = state === 'play' && input.jumpHold && w.fuel > 0 && !w.crashed;
      drawUnbreakableJetEffects(c, def, jets);
    }
    if (w === world && w.rescue && w.rescue.carried) drawPassengerPart(c, def, drv, 'upper');
    drawDriverUpper(c, def, drv);
    c.restore();
    if (!under && def.id !== 'roadster' && !hideWheels(def)) for (const wh of w.wheels) drawWheel(c, wh.x, wh.y, wh.r, wh.ang, def);
    c.restore();
  }

  function drawSigns(T, cam) {
    const hw = W / 2 / cam.s + 2;
    const first = Math.max(100, Math.ceil((cam.x - hw) / 100) * 100);
    ctx.font = 'bold 14px Trebuchet MS, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (let x = first; x < cam.x + hw; x += 100) {
      if (gapContaining(T, x)) continue;
      const p = toScreen(x, hAt(T, x));
      const ph = cam.s * 1.6;
      ctx.fillStyle = '#fff8e1'; ctx.strokeStyle = '#6b4220'; ctx.lineWidth = 3;
      ctx.fillRect(p.x - 32, p.y - ph - 22, 64, 26); ctx.strokeRect(p.x - 32, p.y - ph - 22, 64, 26);
      ctx.fillStyle = '#3d2a12'; ctx.fillText(`${x} m`, p.x, p.y - ph - 9);
    }
    const bestVid = isUnbreakable(world.defBase) ? UNBREAKABLE_MENU_ANCHOR : world.defBase.id;
    const best = bestOf(world.stage.id, bestVid);
    if (state !== 'menu' && best > 0 && best > cam.x - hw && best < cam.x + hw) {
      const p = toScreen(best, hAt(T, best));
      const ph = cam.s * 2.4;
      ctx.fillStyle = '#333'; ctx.fillRect(p.x - 2, p.y - ph, 4, ph);
      ctx.fillStyle = '#e8341c';
      ctx.beginPath(); ctx.moveTo(p.x + 2, p.y - ph); ctx.lineTo(p.x + 40, p.y - ph + 12); ctx.lineTo(p.x + 2, p.y - ph + 24); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.font = 'bold 11px Trebuchet MS, sans-serif';
      ctx.fillText('BEST', p.x + 17, p.y - ph + 12);
    }
  }

  function syncMenuBackdrop() {
    const w = world, b = w.body, T = w.T, cam = w.cam, def = w.defBase;
    const grow = w.car.wheelScale || 1;
    let lowest = 0;
    for (const wd of def.wheels) lowest = Math.min(lowest, wd.y - wd.r * grow);
    b.x = 0;
    b.y = hAt(T, 0) - lowest + 0.05;
    b.a = 0;
    b.vx = 0;
    b.vy = 0;
    b.va = 0;
    for (const wh of w.wheels) {
      wh.x = b.x + wh.lx;
      wh.y = b.y + wh.ly;
      wh.vx = 0;
      wh.vy = 0;
      wh.w = 0;
      wh.ang = 0;
      wh.contact = false;
    }
    w.particles.length = 0;
    w.sinking = false;
    w.sinkTime = 0;
    w.sinkBoom = false;
    w.sinkOnBed = false;
    w.sinkBedTime = 0;
    w.sinkFloorY = null;
    w.sinkGap = null;
    w.sinkBedWarned = false;
    w.sinkLanded = false;
    w.carBroken = false;
    w.boomShakeX = 0;
    w.boomShakeY = 0;
    w.jumpKick = 0;
    w.airborne = false;
    w.airTime = 0;
    cam.s = baseScale();
    cam.trackS = cam.s;
    cam.x = b.x + (W / cam.s) * 0.08;
    cam.y = b.y + 0.8;
  }

  function drawGapSinkOverlay(w) {
    const st = w.stage;
    const gRef = w.sinkGap || gapContaining(w.T, w.body.x);
    if (!gRef) return;
    const g = { start: gRef.start, end: gRef.end };
    const yL = gapSinkSurface(w.T, st, g, g.start);
    const yR = gapSinkSurface(w.T, st, g, g.end);
    const floorL = gapFloorAt(w.T, g, g.start);
    const floorR = gapFloorAt(w.T, g, g.end);
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(g.start, yL);
    ctx.lineTo(g.end, yR);
    ctx.lineTo(g.end, floorR);
    ctx.lineTo(g.start, floorL);
    ctx.closePath();
    if (st.lava) {
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = 'rgba(255,160,40,0.55)';
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = 'rgba(255,240,160,0.7)';
    } else if (st.id === 'london') {
      ctx.globalAlpha = 0.45;
      ctx.fillStyle = 'rgba(100,130,155,0.5)';
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = 'rgba(210,225,240,0.6)';
    } else if (st.id === 'china') {
      ctx.globalAlpha = 0.42;
      ctx.fillStyle = 'rgba(70,160,120,0.48)';
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = 'rgba(210,248,230,0.65)';
    } else if (st.id === 'skottland') {
      ctx.globalAlpha = 0.44;
      ctx.fillStyle = 'rgba(40,130,170,0.52)';
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = 'rgba(220,245,255,0.65)';
    } else if (st.id === 'countryside') {
      ctx.globalAlpha = 0.42;
      ctx.fillStyle = 'rgba(90,170,210,0.55)';
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = 'rgba(230,248,255,0.65)';
    } else {
      ctx.globalAlpha = 0.36;
      ctx.fillStyle = 'rgba(175,205,235,0.42)';
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    }
    ctx.lineWidth = 0.06;
    ctx.beginPath();
    ctx.moveTo(g.start, yL);
    ctx.lineTo(g.end, yR);
    ctx.stroke();
    if (w.sinkOnBed && !w.sinkBoom) {
      const pulse = 0.35 + 0.25 * Math.sin(w.sinkBedTime * 5.5);
      ctx.strokeStyle = `rgba(255,120,40,${0.25 + pulse * 0.45})`;
      ctx.lineWidth = 0.14 + pulse * 0.06;
      ctx.beginPath();
      ctx.moveTo(g.start, floorL);
      ctx.lineTo(g.end, floorR);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawGapSinkScreenVeil(w) {
    if (!w.sinking && !w.sinkOnBed) return;
    if (w.sinkBoom) return;
    const depth = w.sinkOnBed ? 0.22 + (w.sinkBedTime / SINK_BED_DELAY) * 0.18 : 0.12;
    const top = ctx.createLinearGradient(0, 0, 0, H * 0.45);
    top.addColorStop(0, `rgba(4,12,24,${depth})`);
    top.addColorStop(1, 'rgba(4,12,24,0)');
    ctx.fillStyle = top;
    ctx.fillRect(0, 0, W, H * 0.45);
  }

  function drawGapBoomFlash(w) {
    if (!w.sinkBoom || w.sinkTime > 1.05) return;
    const sp = toScreen(w.body.x, w.body.y + 0.2);
    const t = 1 - w.sinkTime / 1.05;
    const rad = Math.max(W, H) * (0.42 + (1 - t) * 0.85);
    const flash = ctx.createRadialGradient(sp.x, sp.y, 0, sp.x, sp.y, rad);
    const hot = w.stage.lava ? '255,210,70' : '255,170,40';
    flash.addColorStop(0, `rgba(255,255,255,${0.96 * t})`);
    flash.addColorStop(0.16, `rgba(${hot},${0.78 * t})`);
    flash.addColorStop(0.42, `rgba(255,70,16,${0.42 * t})`);
    flash.addColorStop(1, 'rgba(255,40,0,0)');
    ctx.fillStyle = flash;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = `rgba(255,255,255,${0.34 * t * t})`;
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = `rgba(255,255,240,${0.7 * t})`;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(sp.x, sp.y, rad * (0.22 + w.sinkTime * 0.55), 0, TAU);
    ctx.stroke();
  }

  function render() {
    if (!world) return;
    const cam = world.cam, st = world.stage;
    const shakeX = world.boomShakeX || 0, shakeY = world.boomShakeY || 0;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    drawSky(st, cam);
    const s = cam.s;
    ctx.setTransform(DPR * s, 0, 0, -DPR * s, DPR * (W / 2 - (cam.x + shakeX) * s), DPR * (H / 2 + (cam.y + shakeY) * s));
    drawDecor(world.T, st, cam);
    drawTerrain(world.T, st, cam);
    if (st.id === 'skottland') drawSkottlandGroundMist(world.T, cam);
    drawShadow(world);
    drawPickups(world.T, cam);
    drawProps(world.T, cam);
    drawRescues(world);
    drawRollers(world);
    drawGhostCar(world);
    drawMatchCars();
    drawParticles(world.particles, false);
    drawCar(ctx, world);
    drawTrailer(world);
    if (world.sinking || world.sinkOnBed || (world.sinkBoom && world.sinkTime < 0.35)) drawGapSinkOverlay(world);
    drawParticles(world.particles, true);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    drawGapSinkScreenVeil(world);
    drawGapBoomFlash(world);
    if (st.headlight) {
      const sp = toScreen(world.body.x + 1.2, world.body.y + 0.7);
      const rad = Math.max(W, H) * 0.7;
      const cone = ctx.createRadialGradient(sp.x, sp.y, 24, sp.x, sp.y, rad);
      const d = st.dark || 0.8;
      cone.addColorStop(0, 'rgba(8,10,18,0)');
      cone.addColorStop(0.32, `rgba(8,10,18,${d * 0.4})`);
      cone.addColorStop(1, `rgba(4,6,12,${d})`);
      ctx.fillStyle = cone;
      ctx.fillRect(0, 0, W, H);
    } else if (st.dark) {
      ctx.fillStyle = `rgba(6,4,16,${st.dark})`;
      ctx.fillRect(0, 0, W, H);
    }
    if (st.fog) {
      const fg = ctx.createLinearGradient(0, H * 0.58, 0, H);
      fg.addColorStop(0, 'rgba(0,0,0,0)');
      fg.addColorStop(1, st.fog);
      ctx.fillStyle = fg;
      ctx.fillRect(0, 0, W, H);
    }
    drawSigns(world.T, cam);
    const spd = Math.hypot(world.body.vx, world.body.vy);
    if (spd > 16 && state !== 'menu') {
      const a = clamp((spd - 16) / 15, 0, 1) * 0.35, t = performance.now() / 1000;
      ctx.strokeStyle = `rgba(255,255,255,${a})`; ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i < 14; i++) {
        const y = ((hash(3, i) * 0.5 + 0.5) * H) | 0, len = 60 + hash(4, i) * 40;
        const x = W - (((t * 1400 + i * 173) % (W + 200)));
        ctx.moveTo(x, y); ctx.lineTo(x + len, y);
      }
      ctx.stroke();
    }
    const vg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.45, W / 2, H / 2, Math.max(W, H) * 0.75);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.28)');
    ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
    drawMatchHud();
  }

  // ================= HUD =================
  let hudTick = 0;
  function updateHud(rpm) {
    $('coin-count').textContent = world.coins;
    $('dist-count').textContent = formatDistance(world.maxX);
    const mph = displaySpeedMph(world.body);
    const sr = $('speed-readout');
    if (sr) sr.textContent = `${mph} / ${Math.round(speedLimitMph(world.def))} mph`;
    const ff = $('fuel-fill');
    ff.style.width = `${(world.fuel * 100).toFixed(1)}%`;
    ff.classList.toggle('low', world.fuel < 0.25);
    syncExtraHud();
    if (++hudTick % 2) drawDial(rpm, mph);
  }

  function drawDial(rpm, mph) {
    const d = dialCtx, cx = 70, cy = 70;
    const lim = speedLimitMph(world && world.def);
    const showMph = Math.min(lim, Math.max(0, Math.round(mph)));
    const speedFrac = showMph / Math.max(1, lim);
    d.clearRect(0, 0, 140, 140);
    d.fillStyle = 'rgba(30,20,10,0.75)'; d.strokeStyle = '#fff'; d.lineWidth = 3;
    d.beginPath(); d.arc(cx, cy, 64, 0, TAU); d.fill(); d.stroke();
    const a0 = Math.PI * 0.75, a1 = Math.PI * 2.25;
    d.lineWidth = 8; d.strokeStyle = '#444';
    d.beginPath(); d.arc(cx, cy, 50, a0, a1); d.stroke();
    d.strokeStyle = speedFrac > 0.85 ? '#ff4a2a' : '#7ee36a';
    d.beginPath(); d.arc(cx, cy, 50, a0, a0 + (a1 - a0) * speedFrac); d.stroke();
    d.strokeStyle = '#fff'; d.lineWidth = 2;
    for (let i = 0; i <= 5; i++) {
      const a = a0 + ((a1 - a0) * i) / 5;
      d.beginPath(); d.moveTo(cx + Math.cos(a) * 40, cy + Math.sin(a) * 40); d.lineTo(cx + Math.cos(a) * 46, cy + Math.sin(a) * 46); d.stroke();
      d.font = '8px Trebuchet MS, sans-serif'; d.fillStyle = '#bbb'; d.textAlign = 'center'; d.textBaseline = 'middle';
      const lx = cx + Math.cos(a) * 34, ly = cy + Math.sin(a) * 34;
      d.fillText(String(Math.round((hudMaxMph() * i) / 5)), lx, ly);
    }
    const na = a0 + (a1 - a0) * speedFrac;
    d.strokeStyle = '#ff4a2a'; d.lineWidth = 4; d.lineCap = 'round';
    d.beginPath(); d.moveTo(cx, cy); d.lineTo(cx + Math.cos(na) * 44, cy + Math.sin(na) * 44); d.stroke();
    d.fillStyle = '#fff'; d.beginPath(); d.arc(cx, cy, 6, 0, TAU); d.fill();
  }

  function floater(text, x, y, cls) {
    const el = document.createElement('div');
    el.className = 'floater' + (cls ? ' ' + cls : '');
    el.textContent = text;
    el.style.left = `${x}px`; el.style.top = `${y}px`;
    $('floaters').appendChild(el);
    setTimeout(() => el.remove(), 1400);
  }

  // ================= AUDIO =================
  let AC = null, eng = null;
  function initAudio() {
    if (AC) { if (AC.state === 'suspended') AC.resume(); return; }
    try {
      AC = new (window.AudioContext || window.webkitAudioContext)();
      const o = AC.createOscillator(), o2 = AC.createOscillator();
      o.type = 'sawtooth'; o2.type = 'square';
      const f = AC.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 500;
      const g = AC.createGain(); g.gain.value = 0;
      const g2 = AC.createGain(); g2.gain.value = 0.4;
      o.connect(f); o2.connect(g2); g2.connect(f); f.connect(g); g.connect(AC.destination);
      o.start(); o2.start();
      eng = { o, o2, f, g };
      initMusic();
    } catch (e) { AC = null; }
  }

  // ----- original background music + ambience (procedural) -----
  const MUSIC = {
    pastoral: { root: 196, scale: [0, 2, 4, 7, 9, 12, 14, 16], prog: [0, 5, 7, 0], tempo: 0.16, lead: 'square', bass: 'triangle', drums: true, wind: 0.012, chirp: true },
    heat: { root: 220, scale: [0, 1, 4, 5, 7, 8, 12, 13], prog: [0, 0, 5, 1], tempo: 0.18, lead: 'sawtooth', bass: 'triangle', drums: true, wind: 0.035 },
    ice: { root: 174.6, scale: [0, 2, 3, 7, 8, 12, 14, 15], prog: [0, 8, 3, 10], tempo: 0.2, lead: 'triangle', bass: 'sine', drums: true, wind: 0.05 },
    space: { root: 146.8, scale: [0, 3, 5, 7, 10, 12, 15, 17], prog: [0, 5, 3, 7], tempo: 0.26, lead: 'sine', bass: 'sine', drums: false, wind: 0, airy: true },
    dark: { root: 130.8, scale: [0, 2, 3, 7, 8, 12, 14, 15], prog: [0, 3, 8, 5], tempo: 0.2, lead: 'triangle', bass: 'sine', drums: true, wind: 0.02 },
    spooky: { root: 155.6, scale: [0, 1, 4, 6, 7, 11, 12, 13], prog: [0, 6, 1, 7], tempo: 0.22, lead: 'sine', bass: 'triangle', drums: false, wind: 0.03 },
    neon: { root: 246.9, scale: [0, 3, 5, 7, 10, 12, 15, 17], prog: [0, 7, 3, 10], tempo: 0.14, lead: 'square', bass: 'sawtooth', drums: true, wind: 0 },
    retro: { root: 220, scale: [0, 2, 4, 5, 7, 9, 12, 14], prog: [0, 5, 7, 5], tempo: 0.12, lead: 'square', bass: 'square', drums: true, wind: 0 },
    festive: { root: 196, scale: [0, 2, 4, 7, 9, 12, 14, 16], prog: [0, 7, 5, 0], tempo: 0.15, lead: 'triangle', bass: 'triangle', drums: true, wind: 0.015, chirp: true },
    metal: { root: 110, scale: [0, 3, 5, 7, 10, 12, 15, 17], prog: [0, 5, 7, 3], tempo: 0.11, lead: 'sawtooth', bass: 'sawtooth', drums: true, wind: 0.01 },
  };
  const music = { on: save.music !== false, next: 0, step: 0, bus: null, noise: null, wind: null };
  function initMusic() {
    if (!AC || music.bus) return;
    const bus = AC.createGain();
    bus.gain.value = music.on ? 0.35 : 0;
    bus.connect(AC.destination);
    const noiseLen = AC.sampleRate * 2;
    const noiseBuf = AC.createBuffer(1, noiseLen, AC.sampleRate);
    const nd = noiseBuf.getChannelData(0);
    for (let i = 0; i < noiseLen; i++) nd[i] = Math.random() * 2 - 1;
    const windSrc = AC.createBufferSource();
    windSrc.buffer = noiseBuf;
    windSrc.loop = true;
    const windF = AC.createBiquadFilter();
    windF.type = 'lowpass';
    windF.frequency.value = 420;
    const windG = AC.createGain();
    windG.gain.value = 0;
    windSrc.connect(windF);
    windF.connect(windG);
    windG.connect(bus);
    windSrc.start();
    music.bus = bus;
    music.noise = noiseBuf;
    music.wind = { g: windG };
    startBagpipes();
  }
  const PIPE_SCALE = [392, 440, 493.88, 554.37, 587.33, 659.25, 739.99, 783.99, 880];
  const PIPE_TUNE = [1, 4, 5, 4, 2, 4, 5, 8, 7, 5, 4, 2, 1, -1, -1, 4, 6, 5, 4, 2, 1, 0, 1, -1];
  let pipes = null;
  function startBagpipes() {
    if (!AC || pipes) return;
    const bus = AC.createGain();
    bus.gain.value = 0;
    bus.connect(AC.destination);
    const droneOut = AC.createGain();
    droneOut.gain.value = 0.28;
    const dlp = AC.createBiquadFilter();
    dlp.type = 'lowpass';
    dlp.frequency.value = 900;
    dlp.connect(droneOut);
    droneOut.connect(bus);
    [110, 220, 221].forEach((freq) => {
      const o = AC.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = freq;
      const g = AC.createGain();
      g.gain.value = freq < 150 ? 0.5 : 0.3;
      o.connect(g); g.connect(dlp);
      o.start();
    });
    const chanter = AC.createOscillator();
    chanter.type = 'sawtooth';
    chanter.frequency.value = 440;
    const bp = AC.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 1700;
    bp.Q.value = 2.8;
    const cg = AC.createGain();
    cg.gain.value = 0.0001;
    chanter.connect(bp); bp.connect(cg); cg.connect(bus);
    chanter.start();
    pipes = { bus, chanter, cg, next: 0, step: 0 };
  }
  function scheduleBagpipes() {
    if (!pipes || !AC) return;
    const now = AC.currentTime;
    const hear = music.on && !!(world && world.stage);
    pipes.bus.gain.setTargetAtTime(hear ? 0.13 : 0, now, 0.08);
    if (!hear) {
      pipes.cg.gain.setTargetAtTime(0.0001, now, 0.05);
      return;
    }
    if (pipes.next < now) pipes.next = now + 0.02;
    const beat = 0.238;
    while (pipes.next < now + 0.5) {
      const n = PIPE_TUNE[pipes.step % PIPE_TUNE.length];
      const t = pipes.next;
      pipes.cg.gain.cancelScheduledValues(t);
      if (n < 0) {
        pipes.cg.gain.setValueAtTime(0.0001, t);
        pipes.next += beat * 2;
      } else {
        pipes.chanter.frequency.setValueAtTime(PIPE_SCALE[Math.max(0, n - 1)], t);
        pipes.chanter.frequency.setValueAtTime(PIPE_SCALE[n], t + 0.035);
        pipes.cg.gain.setValueAtTime(0.0001, t);
        pipes.cg.gain.linearRampToValueAtTime(0.62, t + 0.02);
        pipes.cg.gain.setValueAtTime(0.62, t + beat * 0.82);
        pipes.next += beat;
      }
      pipes.step++;
    }
  }
  function mNote(freq, t, dur, type, vol) {
    const o = AC.createOscillator(), g = AC.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0005, t + dur);
    o.connect(g); g.connect(music.bus); o.start(t); o.stop(t + dur + 0.05);
  }
  function mHat(t, vol) {
    const s = AC.createBufferSource(), f = AC.createBiquadFilter(), g = AC.createGain();
    s.buffer = music.noise; f.type = 'highpass'; f.frequency.value = 7000;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0005, t + 0.05);
    s.connect(f); f.connect(g); g.connect(music.bus); s.start(t, Math.random()); s.stop(t + 0.06);
  }
  function mKick(t) {
    const o = AC.createOscillator(), g = AC.createGain();
    o.frequency.setValueAtTime(130, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.15);
    g.gain.setValueAtTime(0.25, t); g.gain.exponentialRampToValueAtTime(0.0005, t + 0.2);
    o.connect(g); g.connect(music.bus); o.start(t); o.stop(t + 0.25);
  }
  function chirp(t) {
    for (let k = 0; k < 2 + Math.floor(Math.random() * 3); k++) {
      const o = AC.createOscillator(), g = AC.createGain(), t0 = t + k * 0.11, f0 = 2600 + Math.random() * 900;
      o.frequency.setValueAtTime(f0, t0); o.frequency.exponentialRampToValueAtTime(f0 * 1.35, t0 + 0.07);
      g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(0.025, t0 + 0.01); g.gain.exponentialRampToValueAtTime(0.0005, t0 + 0.09);
      o.connect(g); g.connect(music.bus); o.start(t0); o.stop(t0 + 0.1);
    }
  }
  function scheduleMusic() {
    if (!AC || !world || !music.on || !music.bus) return;
    const st = world.stage;
    const m = MUSIC.pastoral, now = AC.currentTime;
    const windLvl = st.wind != null ? st.wind : (m.wind || 0);
    if (music.wind) music.wind.g.gain.setTargetAtTime(windLvl * (0.7 + 0.3 * Math.sin(now * 0.4)), now, 0.5);
    if (m.chirp && Math.random() < 0.015) chirp(now + 0.05);
    if (music.next < now) music.next = now + 0.05;
    while (music.next < now + 0.3) {
      const s = music.step, t = music.next, bar = Math.floor(s / 16) % 4, i = s % 16, ms = s % 32;
      const r = m.root * Math.pow(2, m.prog[bar] / 12);
      if (i % 4 === 0) mNote(r / 2, t, m.tempo * 3, m.bass, 0.09);
      if (i % 4 === 2 && m.drums) mNote((r / 2) * 1.5, t, m.tempo * 1.5, m.bass, 0.05);
      const hv = hash(m.root, ms + bar * 0.37);
      if ((i % 2 === 0 && hv > -0.2) || hv > 0.7) {
        const deg = Math.floor((hash(m.root + 1, ms) * 0.5 + 0.5) * m.scale.length) % m.scale.length;
        mNote(r * Math.pow(2, m.scale[deg] / 12), t, m.tempo * (m.airy ? 3 : 0.9), m.lead, m.airy ? 0.04 : 0.025);
      }
      if (m.drums) { if (i % 2 === 0) mHat(t, i % 4 === 0 ? 0.03 : 0.015); if (i % 8 === 0) mKick(t); }
      music.step++; music.next += m.tempo;
    }
  }
  function toggleMusic() {
    music.on = !music.on; save.music = music.on; persist();
    if (music.bus && AC) music.bus.gain.setTargetAtTime(music.on ? 0.35 : 0, AC.currentTime, 0.08);
    $('mute-btn').textContent = music.on ? 'Music: On' : 'Music: Off';
  }
  function setEngine(rpm, on, gasOn) {
    if (!eng) return;
    const t = AC.currentTime;
    const ev = !!(world && world.def && world.def.electric);
    const base = ev ? (70 + rpm * 260 + (gasOn ? 50 : 0)) : (32 + rpm * 95 + (gasOn ? 10 : 0));
    eng.o.type = ev ? 'sine' : 'sawtooth';
    eng.o2.type = ev ? 'triangle' : 'square';
    eng.o.frequency.setTargetAtTime(base, t, 0.06);
    eng.o2.frequency.setTargetAtTime(ev ? base * 2 : base * 0.5, t, 0.06);
    eng.f.frequency.setTargetAtTime(ev ? (700 + rpm * 1800) : (300 + rpm * 900 + (gasOn ? 300 : 0)), t, 0.08);
    eng.g.gain.setTargetAtTime(on ? (ev ? 0.012 + rpm * 0.018 + (gasOn ? 0.01 : 0) : 0.04 + rpm * 0.05 + (gasOn ? 0.02 : 0)) : 0, t, 0.08);
  }
  function tone(freq, start, dur, type, vol) {
    if (!AC) return;
    const o = AC.createOscillator(), g = AC.createGain();
    o.type = type || 'sine'; o.frequency.value = freq;
    const t = AC.currentTime + start;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol || 0.12, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(AC.destination);
    o.start(t); o.stop(t + dur + 0.05);
  }
  function sfxJump() { tone(220, 0, 0.08, 'square', 0.07); tone(440, 0.05, 0.1, 'square', 0.05); }
  function sfxCoin(v) { const f = v >= 100 ? 1320 : v >= 25 ? 1100 : 880; tone(f, 0, 0.08, 'square', 0.06); tone(f * 1.5, 0.06, 0.12, 'square', 0.06); }
  function sfxFuel() { [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.07, 0.15, 'triangle', 0.12)); }
  function sfxBonus() { [660, 880, 1100].forEach((f, i) => tone(f, i * 0.09, 0.2, 'triangle', 0.1)); }
  function sfxCrash() {
    if (!AC) return;
    const len = AC.sampleRate * 0.5, buf = AC.createBuffer(1, len, AC.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2);
    const src = AC.createBufferSource(), g = AC.createGain();
    g.gain.value = 0.35; src.buffer = buf; src.connect(g); g.connect(AC.destination); src.start();
    tone(120, 0, 0.4, 'sawtooth', 0.15);
  }
  function sfxSinkThud() {
    if (!AC) return;
    tone(95, 0, 0.22, 'sine', 0.14);
    tone(52, 0.01, 0.35, 'sine', 0.1);
  }
  function sfxBoom() {
    if (!AC) return;
    const len = AC.sampleRate * 0.85, buf = AC.createBuffer(1, len, AC.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 1.35);
    const src = AC.createBufferSource(), g = AC.createGain();
    g.gain.value = 0.55;
    src.buffer = buf;
    src.connect(g);
    g.connect(AC.destination);
    src.start();
    tone(68, 0, 0.55, 'sine', 0.28);
    tone(42, 0.02, 0.7, 'sine', 0.18);
    sfxCrash();
  }

  // ================= MENU / GARAGE UI =================
  function drawVehiclePreview(def, canvasId) {
    const cv = $(canvasId || 'veh-preview'), c = cv.getContext('2d');
    const cw = cv.width, ch = cv.height;
    const ground = ch * (100 / 120);
    const shop = canvasId === 'garage-preview';
    c.setTransform(1, 0, 0, 1, 0, 0);
    const gr = c.createLinearGradient(0, 0, 0, ch);
    if (shop) { gr.addColorStop(0, '#d7eefc'); gr.addColorStop(1, '#eef7fd'); }
    else { gr.addColorStop(0, '#bfe9ff'); gr.addColorStop(1, '#eaf8ff'); }
    c.fillStyle = gr; c.fillRect(0, 0, cw, ch);
    if (shop) {
      c.strokeStyle = 'rgba(90,70,40,0.35)'; c.lineWidth = 3;
      c.beginPath(); c.moveTo(cw * 0.5, 8); c.lineTo(cw * 0.5, ground); c.moveTo(16, ch * 0.34); c.lineTo(cw - 16, ch * 0.34); c.stroke();
      c.fillStyle = '#a67c42'; c.fillRect(0, ground, cw, ch - ground);
      c.fillStyle = '#c4a574'; c.fillRect(0, ground, cw, 8);
    } else {
      c.fillStyle = '#1ed41c'; c.fillRect(0, ground, cw, ch - ground);
    }
    const paint = ghostPaint(def, selStage());
    const grow = 1 + 0.03 * (((save.upgrades[def.id] || {}).tiresize) || 0);
    let low = 0, high = 0.4;
    for (const w of def.wheels) low = Math.min(low, w.y - w.r * grow);
    for (const p of def.hull) high = Math.max(high, p[1]);
    high += 0.35;
    const span = Math.max(...def.hull.map((p) => Math.abs(p[0]))) + 0.5;
    const tall = Math.max(0.8, high - low);
    const ps = Math.min(36 * (ch / 120), (cw * 0.45) / span, (ground - 8) / tall);
    c.setTransform(ps, 0, 0, -ps, cw / 2, ground + low * ps);
    const bike = def.bike;
    const under = wheelsBeforeBody(def);
    if (def.id !== 'roadster' && !hideWheels(def)) {
      for (const w of def.wheels) {
        const kind = bike ? (w.x > 0 ? 'fork' : 'swing') : (def.id === 'monster' ? 'heavy' : 'strut');
        shock(c, w.x, w.y + 0.3, w.x, w.y, kind);
      }
    }
    if (under && !hideWheels(def)) for (const w of def.wheels) drawWheel(c, w.x, w.y, w.r * grow, 0, paint);
    drawDriverLower(c, paint, { crashed: false });
    drawBody(c, paint);
    drawDriverUpper(c, paint, { crashed: false });
    if (!under && def.id !== 'roadster' && !hideWheels(def)) for (const w of def.wheels) drawWheel(c, w.x, w.y, w.r * grow, 0, paint);
    if (isUnbreakable(paint)) drawUnbreakableJetEffects(c, paint, false);
    c.setTransform(1, 0, 0, 1, 0, 0);
    if (shop) {
      c.fillStyle = 'rgba(0,0,0,0.18)';
      c.beginPath(); c.ellipse(cw / 2, ground + 6, cw * 0.22, 8, 0, 0, TAU); c.fill();
    }
  }
  function drawStagePreview(st) {
    const cv = $('stage-preview'), c = cv.getContext('2d');
    c.setTransform(1, 0, 0, 1, 0, 0);
    const gr = c.createLinearGradient(0, 0, 0, 120);
    gr.addColorStop(0, st.sky[0]); gr.addColorStop(1, st.sky[1]);
    c.fillStyle = gr; c.fillRect(0, 0, 220, 120);
    if (st.id === 'china') {
      const glow = c.createRadialGradient(174, 22, 3, 174, 22, 34);
      glow.addColorStop(0, 'rgba(255,224,156,0.72)');
      glow.addColorStop(1, 'rgba(255,224,156,0)');
      c.fillStyle = glow; c.fillRect(130, 0, 90, 70);
      const previewRange = (base, color, peaks) => {
        c.fillStyle = color;
        c.beginPath(); c.moveTo(0, base);
        for (const p of peaks) {
          c.lineTo(p[0] - 16, base - 8);
          c.lineTo(p[0] - 6, p[1] + 6);
          c.lineTo(p[0], p[1]);
          c.lineTo(p[0] + 5, p[1] + 8);
          c.lineTo(p[0] + 18, base - 6);
        }
        c.lineTo(220, 120); c.lineTo(0, 120); c.closePath(); c.fill();
      };
      previewRange(78, '#d5e4e6', [[16, 46], [58, 34], [104, 50], [156, 30], [204, 44]]);
      previewRange(90, '#6eae90', [[8, 52], [48, 36], [96, 58], [146, 40], [196, 50]]);
      previewRange(102, '#1f5438', [[24, 58], [78, 40], [132, 64], [186, 46]]);
      c.strokeStyle = '#6a5c48'; c.lineWidth = 6; c.lineJoin = 'round';
      c.beginPath();
      c.moveTo(0, 68); c.lineTo(58, 50); c.lineTo(108, 66); c.lineTo(158, 48); c.lineTo(220, 64);
      c.stroke();
      c.strokeStyle = '#e4d7c0'; c.lineWidth = 3;
      c.beginPath();
      c.moveTo(0, 66); c.lineTo(58, 48); c.lineTo(108, 64); c.lineTo(158, 46); c.lineTo(220, 62);
      c.stroke();
      c.fillStyle = '#d9ccb4';
      for (const p of [[58, 48], [158, 46]]) {
        c.fillRect(p[0] - 4, p[1] - 10, 8, 12);
        c.fillStyle = '#3a3228';
        c.beginPath(); c.moveTo(p[0] - 7, p[1] - 9); c.lineTo(p[0], p[1] - 16); c.lineTo(p[0] + 7, p[1] - 9); c.fill();
        c.fillStyle = '#d9ccb4';
      }
      const haze = c.createLinearGradient(0, 45, 0, 88);
      haze.addColorStop(0, 'rgba(255,245,220,0)');
      haze.addColorStop(1, 'rgba(255,245,220,0.46)');
      c.fillStyle = haze; c.fillRect(0, 45, 220, 43);
    } else if (st.id === 'london') {
      c.fillStyle = 'rgba(180,188,198,0.45)';
      c.fillRect(12, 18, 56, 10);
      c.fillRect(88, 24, 48, 8);
      c.fillRect(150, 16, 52, 11);
      c.fillStyle = '#d8dce4';
      c.fillRect(92, 42, 5, 16); c.fillRect(108, 42, 5, 16);
      c.fillStyle = '#3d7ab8';
      c.fillRect(90, 50, 26, 4);
    } else if (st.id !== 'retro') {
      c.fillStyle = 'rgba(255,255,255,0.18)';
      c.beginPath(); c.moveTo(0, 78);
      c.quadraticCurveTo(60, 64, 120, 76); c.quadraticCurveTo(180, 90, 220, 70);
      c.lineTo(220, 120); c.lineTo(0, 120); c.fill();
    }
    const T = makeTerrain(st);
    const previewY = (px) => {
      let h = solidHeight(T, 300 + px * 0.5);
      if (st.quant) h = Math.round(h / st.quant) * st.quant;
      return 80 - h * 2.5;
    };
    c.beginPath(); c.moveTo(0, 120);
    for (let px = 0; px <= 220; px += 4) c.lineTo(px, previewY(px));
    c.lineTo(220, 120); c.closePath();
    c.fillStyle = groundFill(st); c.fill();
    c.lineWidth = 10; c.strokeStyle = st.grassDark;
    c.beginPath();
    for (let px = 0; px <= 220; px += 4) { const y = previewY(px); px ? c.lineTo(px, y + 3) : c.moveTo(px, y + 3); }
    c.stroke();
    c.lineWidth = 6; c.strokeStyle = st.grass;
    c.beginPath();
    for (let px = 0; px <= 220; px += 4) { const y = previewY(px); px ? c.lineTo(px, y + 2) : c.moveTo(px, y + 2); }
    c.stroke();
    c.fillStyle = st.grass;
    if (st.id === 'china') {
      const y1 = previewY(37), y2 = previewY(178);
      c.strokeStyle = '#275f30'; c.lineWidth = 3;
      for (let k = 0; k < 5; k++) {
        c.beginPath(); c.moveTo(32 + k * 4, y1); c.lineTo(33 + k * 4, y1 - 25 - (k % 2) * 5); c.stroke();
      }
      c.strokeStyle = '#4b2a14'; c.lineWidth = 2;
      c.beginPath(); c.moveTo(178, y2); c.lineTo(178, y2 - 25); c.stroke();
      c.fillStyle = '#d6242b';
      c.beginPath(); c.ellipse(178, y2 - 18, 5, 7, 0, 0, TAU); c.fill();
      c.fillStyle = '#f2d56a'; c.fillRect(174, y2 - 24, 8, 2);
    } else if (st.decor === 'trees' || st.decor === 'jungle' || st.decor === 'pines') {
      c.beginPath(); c.arc(46, 70, 8, 0, TAU); c.arc(168, 66, 7, 0, TAU); c.fill();
    } else if (st.decor === 'cactus' || st.decor === 'palms') {
      c.fillRect(40, 62, 4, 16); c.fillRect(170, 58, 4, 18);
    } else if (st.decor === 'houses' || st.decor === 'buildings') {
      c.fillStyle = '#f4efe4'; c.fillRect(36, 62, 16, 12); c.fillRect(160, 56, 18, 16);
    }
    if (st.id === 'london') {
      c.fillStyle = '#5a6d7a';
      c.fillRect(0, 88, 220, 10);
      c.fillStyle = 'rgba(130,155,175,0.5)';
      c.fillRect(20, 90, 180, 3);
      drawElizabethTower(c, 34, 74, 0.38, { showGlow: true });
      c.fillStyle = '#1a1010';
      c.strokeStyle = '#1a1010';
      c.lineWidth = 1.5;
      c.fillRect(138, 66, 38, 16);
      c.fillStyle = '#c81828';
      c.fillRect(140, 68, 34, 12);
      c.fillStyle = '#8ec8e8';
      for (let wi = 0; wi < 3; wi++) c.fillRect(144 + wi * 10, 70, 7, 8);
      c.strokeStyle = '#0a0a0c';
      c.lineWidth = 1;
      c.beginPath(); c.arc(148, 66, 3, 0, TAU); c.fill();
      c.beginPath(); c.arc(168, 66, 3, 0, TAU); c.fill();
    }
    if (st.ceiling) {
      c.strokeStyle = st.ceilingColor || '#222'; c.lineWidth = 3;
      c.beginPath();
      for (let px = 0; px <= 220; px += 4) { const y = previewY(px) - st.ceiling * 2.5; px ? c.lineTo(px, y) : c.moveTo(px, y); }
      c.stroke();
    }
  }

  function refreshMenu() {
    const def = selDef(), st = selStage();
    const onSpace = st.id === 'space';
    const vOwned = def.id === UNBREAKABLE_MENU_ANCHOR ? ownsUnbreakableSet() : !!save.vehicles[def.id];
    const sOwned = !!save.stages[st.id];
    const previewDef = (def.id === UNBREAKABLE_MENU_ANCHOR && vOwned) ? resolvedDef(def) : def;
    const recordId = def.id === UNBREAKABLE_MENU_ANCHOR ? UNBREAKABLE_MENU_ANCHOR : def.id;
    $('menu-coin-count').textContent = save.coins;
    $('veh-name').textContent = vOwned && def.id === UNBREAKABLE_MENU_ANCHOR ? previewDef.name : def.name;
    const cardBest = bestOf(st.id, onSpace ? 'rocket' : recordId);
    $('veh-sub').textContent = vOwned ? (bestOf(st.id, recordId) ? `${def.desc} · best ${bestOf(st.id, recordId)} m` : def.desc) : `Locked: ${def.price} coins`;
    $('stage-name').textContent = st.name;
    const idx = `${sIdx + 1} / ${STAGES.length}`;
    $('stage-sub').textContent = sOwned ? `${idx} · ${st.desc}${cardBest ? ` · best ${cardBest} m` : ''}` : `${idx} · Locked: ${st.price} coins`;
    fillGoalRow($('stage-goals'), st.id);
    const btn = $('play-btn');
    if (!onSpace && !vOwned) { btn.textContent = `Buy ${def.name} (${def.price})`; btn.disabled = save.coins < def.price; }
    else if (!sOwned) { btn.textContent = `Unlock ${st.name} (${st.price})`; btn.disabled = save.coins < st.price; }
    else { btn.textContent = 'Drive!'; btn.disabled = false; }
    $('test-ride-btn').classList.toggle('hidden', (onSpace || vOwned) && sOwned);
    drawVehiclePreview(previewDef);
    drawStagePreview(st);
    syncCloakUi();
  }

  function onPlayButton() {
    initAudio();
    testRide = false;
    const def = selDef(), st = selStage();
    if (st.id !== 'space' && !(def.id === UNBREAKABLE_MENU_ANCHOR ? ownsUnbreakableSet() : save.vehicles[def.id])) {
      if (save.coins >= def.price) {
        save.coins -= def.price;
        if (def.id === UNBREAKABLE_MENU_ANCHOR) {
          unlockUnbreakablePurchase();
          save.unbreakableVariant = UNBREAKABLE_MENU_ANCHOR;
          save.veh = UNBREAKABLE_MENU_ANCHOR;
        } else save.vehicles[def.id] = true;
        persist(); sfxBonus();
      }
      refreshMenu(); return;
    }
    if (!save.stages[st.id]) {
      if (save.coins >= st.price) { save.coins -= st.price; save.stages[st.id] = true; persist(); sfxBonus(); }
      refreshMenu(); return;
    }
    startRun();
  }

  function changeSel(kind, d) {
    if (kind === 'veh') {
      const list = menuVehicleList();
      vIdx = (vIdx + d + list.length) % list.length;
    } else sIdx = (sIdx + d + STAGES.length) % STAGES.length;
    const sd = selDef();
    if (sd.id === UNBREAKABLE_MENU_ANCHOR ? ownsUnbreakableSet() : save.vehicles[sd.id]) {
      if (sd.id === UNBREAKABLE_MENU_ANCHOR && ownsUnbreakableSet()) save.veh = activeUnbreakableId();
      else save.veh = sd.id;
    }
    if (save.stages[selStage().id]) save.stage = selStage().id;
    persist();
    newWorld(stageVehicle(selRideDef(), selStage()), selStage());
    refreshMenu();
  }

  function openGarage(from) {
    garageFrom = from;
    state = state === 'over' ? 'over' : 'menu';
    renderGarage();
    showScreens('garage');
  }

  const UPG_ICON = {
    engine: '<svg viewBox="0 0 32 32"><rect x="13" y="4" width="6" height="8" fill="#7a4e1d"/><rect x="8" y="12" width="16" height="12" rx="2" fill="#e8521a"/><rect x="11" y="24" width="10" height="4" fill="#5a3812"/></svg>',
    suspension: '<svg viewBox="0 0 32 32"><path d="M16 3 v5 l-6 3 6 3 -6 3 6 3 v6" fill="none" stroke="#5a3812" stroke-width="3" stroke-linecap="round"/></svg>',
    tires: '<svg viewBox="0 0 32 32"><circle cx="16" cy="16" r="11" fill="none" stroke="#222" stroke-width="4"/><circle cx="16" cy="16" r="3" fill="#b0b0b0"/></svg>',
    fuel: '<svg viewBox="0 0 32 32"><rect x="7" y="8" width="13" height="18" rx="2" fill="#3dce45" stroke="#146b18" stroke-width="2"/><rect x="20" y="12" width="5" height="7" rx="1" fill="#146b18"/></svg>',
    stability: '<svg viewBox="0 0 32 32"><rect x="5" y="20" width="22" height="4" rx="2" fill="#7a4e1d"/><circle cx="16" cy="12" r="5" fill="#7ec8ff" stroke="#2a6fdb" stroke-width="2"/></svg>',
    awd: '<svg viewBox="0 0 32 32"><path d="M4 16 h8 M20 16 h8 M14 10 l6 6 -6 6" fill="none" stroke="#e8521a" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    brakes: '<svg viewBox="0 0 32 32"><rect x="9" y="5" width="14" height="22" rx="6" fill="#e24a3a" stroke="#7a1208" stroke-width="2"/></svg>',
    air: '<svg viewBox="0 0 32 32"><path d="M6 22 q10 -16 18 0" fill="none" stroke="#2a6fdb" stroke-width="3"/><path d="M20 16 l5 4 -7 1z" fill="#2a6fdb"/></svg>',
    tiresize: '<svg viewBox="0 0 32 32"><circle cx="16" cy="16" r="13" fill="none" stroke="#222" stroke-width="5"/><circle cx="16" cy="16" r="4" fill="#d0d0d0"/></svg>',
  };

  function renderGarage(just) {
    const def = selDef();
    const owned = def.id === UNBREAKABLE_MENU_ANCHOR ? ownsUnbreakableSet() : !!save.vehicles[def.id];
    const upgVid = def.id === UNBREAKABLE_MENU_ANCHOR ? UNBREAKABLE_MENU_ANCHOR : def.id;
    $('garage-veh-name').textContent = def.name;
    const garageBest = bestOf(selStage().id, upgVid);
    $('garage-veh-sub').textContent = owned ? (garageBest ? `${def.desc} · best ${garageBest} m` : def.desc) : `Locked · ${def.price} coins`;
    $('garage-coin-count').textContent = save.coins;
    const previewDef = (def.id === UNBREAKABLE_MENU_ANCHOR && owned) ? resolvedDef(def) : def;
    drawVehiclePreview(previewDef, 'garage-preview');
    const list = $('upgrade-list');
    list.innerHTML = '';
    if (!owned) {
      list.innerHTML = `<p class="locked-note">Buy this car on the main menu for ${def.price} coins.</p>`;
      return;
    }
    const lv = upgOf(upgVid);
    renderPaintShop(upgVid);
    for (const u of UPGRADES) {
      const lvl = lv[u.id];
      const row = document.createElement('div');
      row.className = 'upg';
      const fresh = just && just.id === u.id ? just.lvl - 1 : -1;
      const pips = Array.from({ length: MAX_LVL }, (_, i) => `<div class="pip${i < lvl ? ' on' : ''}${i === fresh ? ' pop' : ''}"></div>`).join('');
      const cost = upgCost(def, lvl);
      const maxed = lvl >= MAX_LVL;
      row.innerHTML = `<div class="upg-main"><span class="upg-icon">${UPG_ICON[u.id] || ''}</span><div><div class="upg-name">${u.name}</div><div class="upg-desc">${u.desc}</div></div></div>
        <div class="pips">${pips}</div>
        <button class="btn secondary buy" type="button" ${maxed || save.coins < cost ? 'disabled' : ''}>${maxed ? 'MAX' : `<span class="coin-mini"></span>${cost}`}</button>`;
      row.querySelector('button').addEventListener('click', () => {
        if (lvl >= MAX_LVL || save.coins < cost) return;
        save.coins -= cost; lv[u.id] = lvl + 1; persist(); sfxCoin(25);
        if (world && (world.def.id === def.id || (def.id === UNBREAKABLE_MENU_ANCHOR && isUnbreakable(world.def)))) {
          world.car = buildCar(world.def, lv);
        }
        renderGarage({ id: u.id, lvl: lvl + 1 });
      });
      list.appendChild(row);
    }
  }

  // ================= INPUT =================
  function ghostSelected() {
    const def = (state === 'play' || state === 'pause' || state === 'crashing' || state === 'over') && world
      ? world.def
      : (selDef().id === UNBREAKABLE_MENU_ANCHOR && ownsUnbreakableSet() ? resolvedDef(selDef()) : selDef());
    return !!(def && isGhostUnbreakable(def));
  }
  function syncCloakUi() {
    const el = $('pedal-cloak');
    if (el) el.classList.toggle('hidden', !ghostSelected());
  }
  function syncInput() {
    input.gas = input.kGas || input.pGas;
    input.brake = input.kBrake || input.pBrake;
    input.cloak = input.kCloak || input.pCloak;
    input.stealthHold = input.kStealth || input.pStealth;
    if (ghostSelected()) input.stealthHold = input.stealthHold || input.kCloak || input.pCloak;
    $('pedal-gas').classList.toggle('down', input.gas);
    $('pedal-brake').classList.toggle('down', input.brake);
    const cloakEl = $('pedal-cloak');
    if (cloakEl) cloakEl.classList.toggle('down', input.cloak);
  }
  window.addEventListener('keydown', (e) => {
    if (catalogMode) return;
    initAudio();
    const k = e.code;
    if (e.ctrlKey && e.shiftKey && k === 'KeyD') { cycleUnbreakableVariant(); e.preventDefault(); }
    else if (k === 'ArrowRight' || k === 'KeyD') { input.kGas = true; e.preventDefault(); }
    else if (k === 'ArrowLeft' || k === 'KeyA') { input.kBrake = true; e.preventDefault(); }
    else if (k === 'ArrowDown' || k === 'KeyS') {
      input.kStealth = true;
      if (ghostSelected()) input.kCloak = true;
      e.preventDefault();
    }
    else if (k === 'ArrowUp') {
      e.preventDefault();
      input.jumpHold = true;
      if (!e.repeat) input.jump = true;
      $('pedal-jump').classList.add('down');
    }
    else if ((k === 'Escape' || k === 'KeyP') && !e.repeat) { state === 'play' ? pause() : state === 'pause' && resume(); }
    else if (k === 'KeyM' && !e.repeat) toggleMusic();
    else if (k === 'KeyC' && !e.repeat) { cutTrailer(); e.preventDefault(); }
    else if (k === 'KeyR' && !e.repeat && ['play', 'pause', 'over', 'crashing'].includes(state)) {
      if (state !== 'over') bankCoins();
      startRun();
    } else if ((k === 'Enter' || k === 'Space') && state === 'menu' && !$('menu').classList.contains('hidden')) {
      e.preventDefault(); onPlayButton();
    }
    syncInput();
  });
  window.addEventListener('keyup', (e) => {
    if (catalogMode) return;
    const k = e.code;
    if (k === 'ArrowRight' || k === 'KeyD') input.kGas = false;
    else if (k === 'ArrowLeft' || k === 'KeyA') input.kBrake = false;
    else if (k === 'ArrowDown' || k === 'KeyS') { input.kStealth = false; input.kCloak = false; }
    else if (k === 'ArrowUp') { input.jumpHold = false; $('pedal-jump').classList.remove('down'); }
    syncInput();
  });
  window.addEventListener('blur', () => {
    if (catalogMode) return;
    input.kGas = input.kBrake = input.pGas = input.pBrake = input.jump = input.jumpHold = input.kCloak = input.pCloak = input.cloak = false;
    input.kStealth = input.pStealth = input.stealthHold = false;
    $('pedal-jump').classList.remove('down');
    syncInput();
    pause();
  });
  window.addEventListener('pointerdown', () => { if (!catalogMode) initAudio(); });

  if (!catalogMode) {
    function bindPedal(id, key) {
      const el = $(id);
      el.addEventListener('pointerdown', (e) => { e.preventDefault(); el.setPointerCapture(e.pointerId); input[key] = true; syncInput(); });
      const up = () => { input[key] = false; syncInput(); };
      el.addEventListener('pointerup', up);
      el.addEventListener('pointercancel', up);
      el.addEventListener('lostpointercapture', up);
      el.addEventListener('contextmenu', (e) => e.preventDefault());
    }
    bindPedal('pedal-gas', 'pGas');
    bindPedal('pedal-brake', 'pBrake');
    bindPedal('pedal-cloak', 'pStealth');
    $('pedal-jump').addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.currentTarget.setPointerCapture(e.pointerId);
      initAudio();
      input.jump = true;
      input.jumpHold = true;
      e.currentTarget.classList.add('down');
    });
    const releaseJumpPedal = () => { input.jumpHold = false; $('pedal-jump').classList.remove('down'); };
    $('pedal-jump').addEventListener('pointerup', releaseJumpPedal);
    $('pedal-jump').addEventListener('pointercancel', releaseJumpPedal);
    $('pedal-jump').addEventListener('lostpointercapture', releaseJumpPedal);
    $('pedal-jump').addEventListener('contextmenu', (e) => e.preventDefault());

    $('cut-btn').addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); cutTrailer(); });
    $('play-btn').addEventListener('click', onPlayButton);
    $('test-ride-btn').addEventListener('click', () => { initAudio(); testRide = true; startRun(); });
    $('veh-prev').addEventListener('click', () => changeSel('veh', -1));
    $('veh-next').addEventListener('click', () => changeSel('veh', 1));
    $('stage-prev').addEventListener('click', () => changeSel('stage', -1));
    $('stage-next').addEventListener('click', () => changeSel('stage', 1));
    $('garage-btn').addEventListener('click', () => openGarage('menu'));
    $('garage-veh-prev').addEventListener('click', () => { changeSel('veh', -1); renderGarage(); });
    $('garage-veh-next').addEventListener('click', () => { changeSel('veh', 1); renderGarage(); });
    $('garage-back').addEventListener('click', () => { if (garageFrom === 'over') { goMenu(); } else { refreshMenu(); showScreens('menu'); } });
    $('pause-btn').addEventListener('click', pause);
    $('mute-btn').addEventListener('click', (e) => { e.stopPropagation(); initAudio(); toggleMusic(); });
    $('mute-btn').textContent = music.on ? 'Music: On' : 'Music: Off';
    $('resume-btn').addEventListener('click', resume);
    $('restart-btn').addEventListener('click', () => { bankCoins(); startRun(); });
    $('quit-btn').addEventListener('click', () => { bankCoins(); goMenu(); });
    $('go-retry').addEventListener('click', startRun);
    $('go-garage').addEventListener('click', () => openGarage('over'));
    $('go-menu').addEventListener('click', goMenu);
  }

  // ================= MULTIPLAYER =================
  function postMatch(msg) {
    if (!window.parent || window.parent === window) return;
    window.parent.postMessage(Object.assign({ source: 'hillrush-game' }, msg), location.origin);
  }
  function matchVehicles() {
    return VEHICLES.filter((v) => !v.immortal).map((v) => ({ id: v.id, name: v.name }));
  }
  function matchStages() {
    return STAGES.filter((s) => s.id !== 'space').map((s) => ({ id: s.id, name: s.name }));
  }
  function reportMatchOut(code) {
    if (!match || !match.active || match.sentOut) return;
    match.sentOut = true;
    match.alive = false;
    postMatch({ type: 'out', reason: code, dist: Math.floor((world && world.maxX) || 0) });
  }
  function matchReasonCode(reason) {
    const title = (reason && reason.title ? reason.title : '').toLowerCase();
    if (title.indexOf('fuel') >= 0) return 'fuel';
    if (title.indexOf('tag') >= 0) return 'tagged';
    if (title.indexOf('stuck') >= 0) return 'stuck';
    if (title.indexOf('splash') >= 0 || title.indexOf('lava') >= 0 || title.indexOf('boom') >= 0) return 'sink';
    return 'crash';
  }
  function matchSpectate(reason) {
    if (!match || !match.active) return;
    const already = match.sentOut;
    reportMatchOut(matchReasonCode(reason));
    state = 'spectate';
    showScreens('hud');
    if (!already) floater((reason && reason.title) || 'Out!', W / 2, H * 0.36, 'bad');
  }
  function setMatchPeers(list) {
    if (!match) return;
    const prev = new Map((match.peers || []).map((p) => [p.id, p]));
    match.peers = (list || []).filter((p) => p && p.id).map((p) => {
      const old = prev.get(p.id);
      const a = Number(p.a) || 0;
      const x = Number(p.x) || 0;
      const y = Number(p.y) || 0;
      return {
        id: String(p.id),
        nickname: String(p.nickname || 'Driver').slice(0, 16),
        color: p.color || '#ffffff',
        vehicleId: p.vehicleId || 'jeep',
        role: p.role === 'hunter' ? 'hunter' : 'runner',
        alive: p.alive !== false,
        x, y, a,
        drawX: old ? old.drawX : x,
        drawY: old ? old.drawY : y,
        drawA: old ? old.drawA : a,
        taggedLocal: !!(old && old.taggedLocal),
      };
    });
  }
  function easePeers(dt) {
    if (!match || !match.peers) return;
    const k = 1 - Math.exp(-12 * dt);
    for (const p of match.peers) {
      p.drawX += (p.x - p.drawX) * k;
      p.drawY += (p.y - p.drawY) * k;
      let da = p.a - p.drawA;
      if (da > Math.PI) da -= TAU;
      if (da < -Math.PI) da += TAU;
      p.drawA += da * k;
    }
  }
  function startLockedRun(opts) {
    const stage = STAGES.find((s) => s.id === opts.stageId) || STAGES[0];
    let def = VEHICLES.find((v) => v.id === opts.vehicleId && !v.immortal) || VEHICLES[0];
    if (stage.id === 'space') def = rocketDef() || def;
    testRide = true;
    match = {
      active: true,
      mode: opts.mode === 'chase' ? 'chase' : 'survive',
      role: opts.role === 'hunter' ? 'hunter' : 'runner',
      color: opts.color || '#e8341c',
      nickname: String(opts.nickname || 'Driver').slice(0, 16),
      alive: true,
      sentOut: false,
      peers: [],
      poseAcc: 0,
    };
    newWorld(def, stage, { stock: true });
    world.def.color = match.color;
    world.def.decal = 'none';
    world.def.matchColor = true;
    world.ghost.play = null;
    state = 'play';
    acc = 0;
    showScreens('hud');
    initAudio();
    const banner = match.mode === 'chase' ? (match.role === 'hunter' ? 'Hunt!' : 'Run!') : 'Last alive!';
    floater(banner, W / 2, H * 0.32, 'bonus');
  }
  function applyTag() {
    if (!match || !match.active || !match.alive) return;
    floater('Tagged!', W / 2, H * 0.4, 'bad');
    reportMatchOut('tagged');
    state = 'spectate';
    showScreens('hud');
  }
  function matchFrame(dt) {
    if (!match || !match.active || !world) return;
    easePeers(dt);
    let far = world.body.x;
    for (const p of match.peers) if (p.x > far) far = p.x;
    ensurePickups(world.T, far + 80);
    if (state === 'spectate') {
      let lead = null;
      for (const p of match.peers) {
        if (!p.alive) continue;
        if (!lead || p.x > lead.x) lead = p;
      }
      if (lead) {
        const cam = world.cam;
        cam.x += (lead.drawX - cam.x) * Math.min(1, dt * 2.2);
        cam.y += (lead.drawY + 1.2 - cam.y) * Math.min(1, dt * 2.2);
      }
    }
    if (state === 'play' && match.role === 'hunter' && match.alive) {
      const b = world.body;
      for (const p of match.peers) {
        if (!p.alive || p.role === 'hunter' || p.taggedLocal) continue;
        if (Math.hypot(p.x - b.x, p.y - b.y) < 2.5) {
          p.taggedLocal = true;
          postMatch({ type: 'tag', targetId: p.id });
        }
      }
    }
    if (state === 'play' || state === 'crashing' || state === 'spectate') {
      match.poseAcc += dt;
      if (match.poseAcc >= 0.1) {
        match.poseAcc = 0;
        const b = world.body;
        postMatch({
          type: 'pose',
          x: Math.round(b.x * 100) / 100,
          y: Math.round(b.y * 100) / 100,
          a: Math.round(b.a * 100) / 100,
          alive: !!(match.alive && state !== 'spectate'),
          dist: Math.floor(world.maxX),
        });
      }
    }
  }
  function peerCar(p) {
    const def = VEHICLES.find((v) => v.id === p.vehicleId) || VEHICLES[0];
    const painted = Object.assign({}, def, { color: p.color, decal: 'none', matchColor: true });
    const cos = Math.cos(p.drawA), sin = Math.sin(p.drawA);
    return {
      body: { x: p.drawX, y: p.drawY, a: p.drawA, vx: 0, vy: 0, va: 0 },
      def: painted,
      stage: world.stage,
      carBroken: false,
      crashed: !p.alive,
      airborne: false,
      rescue: { carried: false },
      wheels: def.wheels.map((wh) => ({
        lx: wh.x, ly: wh.y, r: wh.r, ang: 0, m: wh.m || 1,
        x: p.drawX + wh.x * cos - wh.y * sin,
        y: p.drawY + wh.x * sin + wh.y * cos,
      })),
    };
  }
  function drawMatchCars() {
    if (!match || !match.active || !match.peers) return;
    for (const p of match.peers) {
      ctx.save();
      ctx.globalAlpha = p.alive ? 0.95 : 0.35;
      drawCar(ctx, peerCar(p));
      ctx.restore();
    }
  }
  function drawMatchHud() {
    if (!match || !match.active || !world) return;
    ctx.save();
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.font = 'bold 15px Trebuchet MS, sans-serif';
    ctx.textBaseline = 'middle';
    const pad = 46;
    for (const p of match.peers) {
      if (!p.alive) continue;
      const sp = toScreen(p.drawX, p.drawY);
      const inside = sp.x > pad && sp.x < W - pad && sp.y > 70 && sp.y < H - pad;
      ctx.textAlign = 'center';
      if (inside) {
        ctx.fillStyle = p.color;
        ctx.fillText(p.nickname, sp.x, sp.y - 36);
        continue;
      }
      const ex = clamp(sp.x, pad, W - pad);
      const ey = clamp(sp.y, 70, H - pad);
      const ang = Math.atan2(sp.y - H / 2, sp.x - W / 2);
      ctx.save();
      ctx.translate(ex, ey);
      ctx.rotate(ang);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.moveTo(16, 0);
      ctx.lineTo(-10, 8);
      ctx.lineTo(-10, -8);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      ctx.fillStyle = '#fff';
      ctx.fillText(p.nickname, ex, ey + (sp.y > H / 2 ? 22 : -22));
    }
    ctx.restore();
  }
  function onPageMessage(event) {
    if (event.origin !== location.origin) return;
    const data = event.data;
    if (!data || data.source !== 'hillrush-page') return;
    if (data.type === 'catalog-request') {
      postMatch({ type: 'catalog', vehicles: matchVehicles(), stages: matchStages() });
      return;
    }
    if (data.type === 'start') { startLockedRun(data); return; }
    if (data.type === 'peers') { setMatchPeers(data.peers || []); return; }
    if (data.type === 'tagged') { applyTag(); return; }
    if (data.type === 'stop') {
      match = null;
      testRide = false;
      if (state !== 'menu') goMenu();
    }
  }

  // ================= LOOP =================
  let last = performance.now(), acc = 0;
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (state === 'play' || state === 'crashing') {
      acc += dt * (state === 'crashing' ? 0.4 : 1);
      let n = 0;
      while (acc >= DT && n < 40) { step(DT, state === 'play' || state === 'crashing'); acc -= DT; n++; }
      if (n >= 40) acc = 0;
      postStep(dt);
    } else if (state === 'menu' && world) {
      acc = 0;
      syncMenuBackdrop();
      setEngine(0, false, false);
    } else {
      acc = 0;
      setEngine(0, false, false);
    }
    if (match && match.active) matchFrame(dt);
    if (world && world.body) enforceSpeedCap(world.body, world.wheels);
    render();
    scheduleMusic();
    scheduleBagpipes();
    requestAnimationFrame(frame);
  }

  function catalogPayload() {
    const cv = document.createElement('canvas');
    cv.id = 'catalog-preview';
    cv.width = 440;
    cv.height = 240;
    cv.setAttribute('aria-hidden', 'true');
    document.body.appendChild(cv);
    const images = {};
    for (const def of VEHICLES) {
      drawVehiclePreview(def, 'catalog-preview');
      images[def.id] = cv.toDataURL('image/png');
    }
    cv.remove();
    return {
      source: 'hillrush-catalog',
      type: 'catalog',
      vehicles: VEHICLES.map((v) => ({
        id: v.id,
        name: v.name,
        price: v.price,
        desc: v.desc,
        bike: !!v.bike,
        color: v.color || '#888888',
      })),
      images,
    };
  }

  let catalogCache = null;
  function publishDealershipCatalog(target, origin) {
    if (!catalogCache) catalogCache = catalogPayload();
    if (!target || target === window || typeof target.postMessage !== 'function') return;
    target.postMessage(catalogCache, origin || location.origin);
  }

  if (catalogMode) {
    for (const id of ['menu', 'hud', 'garage', 'pause', 'gameover']) {
      const el = $(id);
      if (el) el.classList.add('hidden');
    }
    window.addEventListener('message', (event) => {
      if (event.origin !== location.origin) return;
      const data = event.data;
      if (!data || data.source !== 'rush-motors' || data.type !== 'catalog-request') return;
      publishDealershipCatalog(event.source, event.origin);
    });
    publishDealershipCatalog(window.parent, location.origin);
  } else {
    if (/\bgo=roadster\b/.test(location.search)) {
      save.vehicles.roadster = true;
      save.stages.retro = true;
      save.veh = 'roadster';
      save.stage = 'retro';
      persist();
      vIdx = Math.max(0, VEHICLES.findIndex((v) => v.id === 'roadster'));
      sIdx = Math.max(0, STAGES.findIndex((s) => s.id === 'retro'));
    }
    newWorld(stageVehicle(selRideDef(), selStage()), selStage());
    refreshMenu();
    showScreens('menu');
    window.HillRushMatch = {
      startLockedRun,
      getPose() {
        if (!world || !world.body) return null;
        return {
          x: world.body.x,
          y: world.body.y,
          a: world.body.a,
          alive: !!(match && match.alive && state !== 'spectate'),
          dist: Math.floor(world.maxX || 0),
        };
      },
      setPeers: setMatchPeers,
      applyTag,
    };
    window.addEventListener('message', onPageMessage);
    postMatch({ type: 'ready', vehicles: matchVehicles(), stages: matchStages() });
    if (/\bgo=roadster\b/.test(location.search)) startRun();
    requestAnimationFrame(frame);
  }
})();
