import { Game } from './game/main/Game';
import { FrontEvents } from './game/events/FrontEvents';
import './html/css/main.css';
import './html/css/loader.css';

window.addEventListener('load', () => {
    new Game({
        canvasParent: document.getElementById('game'),
        assetsPath: './assets/',
        onLoadComplete: () => {
            // event for front GUI loading bar
            document.getElementById('loader').remove();
        }
    });
}, false);

window.addEventListener('resize', () => {
    FrontEvents.onWindowResizeSignal.dispatch();
}, false);
