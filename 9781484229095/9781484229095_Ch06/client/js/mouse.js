var mouse = {
    init: function() {
        // Listen for mouse events on the game foreground canvas
        let canvas = document.getElementById("gameforegroundcanvas");

        canvas.addEventListener("mousemove", mouse.mousemovehandler, false);

        canvas.addEventListener("mouseenter", mouse.mouseenterhandler, false);
        canvas.addEventListener("mouseout", mouse.mouseouthandler, false);

        mouse.canvas = canvas;
    },

    // x,y coordinates of mouse relative to top left corner of canvas
    x: 0,
    y: 0,

    // x,y coordinates of mouse relative to top left corner of game map
    gameX: 0,
    gameY: 0,

    // game grid x,y coordinates of mouse
    gridX: 0,
    gridY: 0,

    calculateGameCoordinates: function() {
        mouse.gameX = mouse.x + game.offsetX ;
        mouse.gameY = mouse.y + game.offsetY;

        mouse.gridX = Math.floor((mouse.gameX) / game.gridSize);
        mouse.gridY = Math.floor((mouse.gameY) / game.gridSize);
    },

    setCoordinates: function(clientX, clientY) {
        let offset = mouse.canvas.getBoundingClientRect();

        mouse.x = (clientX - offset.left) / game.scale;
        mouse.y = (clientY - offset.top) / game.scale;

        mouse.calculateGameCoordinates();
    },

    // Is the mouse inside the canvas region
    insideCanvas: false,

    mousemovehandler: function(ev) {
        mouse.insideCanvas = true;
        mouse.setCoordinates(ev.clientX, ev.clientY);
    },

    mouseenterhandler: function() {
        mouse.insideCanvas = true;
    },

    mouseouthandler: function() {
        mouse.insideCanvas = false;
    },
};