import Game from './Game.js'

// Dynamically load Ammo.js
const script = document.createElement('script');
script.src = import.meta.env.BASE_URL + 'js/ammo.wasm.js';
script.onload = () => {
    window.game = new Game(document.querySelector('canvas.webgl'))
}
document.body.appendChild(script);
