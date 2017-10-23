var game = {

    // Start initializing objects, preloading assets and display start screen
    init: function() {
        // Initialize objects
        loader.init();
        mouse.init();

        // Initialize and store contexts for both the canvases
        game.initCanvases();

        // Display the main game menu
        game.hideScreens();
        game.showScreen("gamestartscreen");
    },

    canvasWidth: 480,
    canvasHeight: 400,

    initCanvases: function() {
        game.backgroundCanvas = document.getElementById("gamebackgroundcanvas");
        game.backgroundContext = game.backgroundCanvas.getContext("2d");

        game.foregroundCanvas = document.getElementById("gameforegroundcanvas");
        game.foregroundContext = game.foregroundCanvas.getContext("2d");

        game.foregroundCanvas.width = game.canvasWidth;
        game.backgroundCanvas.width = game.canvasWidth;

        game.foregroundCanvas.height = game.canvasHeight;
        game.backgroundCanvas.height = game.canvasHeight;
    },

    hideScreens: function() {
        var screens = document.getElementsByClassName("gamelayer");

        // Iterate through all the game layers and set their display to none
        for (let i = screens.length - 1; i >= 0; i--) {
            let screen = screens[i];

            screen.style.display = "none";
        }
    },

    hideScreen: function(id) {
        var screen = document.getElementById(id);

        screen.style.display = "none";
    },

    showScreen: function(id) {
        var screen = document.getElementById(id);

        screen.style.display = "block";
    },

    scale: 1,
    resize: function() {

        var maxWidth = window.innerWidth;
        var maxHeight = window.innerHeight;

        var scale = Math.min(maxWidth / 640, maxHeight / 480);

        var gameContainer = document.getElementById("gamecontainer");

        gameContainer.style.transform = "translate(-50%, -50%) " + "scale(" + scale + ")";

        game.scale = scale;

        // What is the maximum width we can set based on the current scale
        // Clamp the value between 640 and 1024
        var width = Math.max(640, Math.min(1024, maxWidth / scale ));

        // Apply this new width to game container and game canvas
        gameContainer.style.width = width + "px";

        // Subtract 160px for the sidebar
        var canvasWidth = width - 160;

        // Set a flag in case the canvas was resized
        if (game.canvasWidth !== canvasWidth) {
            game.canvasWidth = canvasWidth;
            game.canvasResized = true;
        }

    },

    loadLevelData: function(level) {
        game.currentLevel = level;
        game.currentMap = maps[level.mapName];

        // Load all the assets for the level starting with the map image
        game.currentMapImage = loader.loadImage("images/maps/" + maps[level.mapName].mapImage);
    },

    start: function() {
        // Display the game interface
        game.hideScreens();
        game.showScreen("gameinterfacescreen");

        game.running = true;
        game.refreshBackground = true;
        game.canvasResized = true;

        game.drawingLoop();
    },

    // A control loop that runs at a fixed period of time
    animationTimeout: 100, // 100 milliseconds or 10 times a second

    animationLoop: function() {

    },

    // The map is broken into square tiles of this size (20 pixels x 20 pixels)
    gridSize: 20,
    // X & Y panning offsets for the map
    offsetX: 0,
    offsetY: 0,

    drawingLoop: function() {
        // Pan the map if the cursor is near the edge of the canvas
        game.handlePanning();

        // Draw the background whenever necessary
        game.drawBackground();

        // Call the drawing loop for the next frame using request animation frame
        if (game.running) {
            requestAnimationFrame(game.drawingLoop);
        }
    },

    drawBackground: function() {
        // Since drawing the background map is a fairly large operation,
        // we only redraw the background if it changes (due to panning or resizing)
        if (game.refreshBackground || game.canvasResized) {
            if (game.canvasResized) {
                game.backgroundCanvas.width = game.canvasWidth;
                game.foregroundCanvas.width = game.canvasWidth;

                // Ensure the resizing doesn't cause the map to pan out of bounds
                if (game.offsetX + game.canvasWidth > game.currentMapImage.width) {
                    game.offsetX = game.currentMapImage.width - game.canvasWidth;
                }

                if (game.offsetY + game.canvasHeight > game.currentMapImage.height) {
                    game.offsetY = game.currentMapImage.height - game.canvasHeight;
                }

                game.canvasResized = false;
            }

            game.backgroundContext.drawImage(game.currentMapImage, game.offsetX, game.offsetY, game.canvasWidth, game.canvasHeight, 0, 0, game.canvasWidth, game.canvasHeight);
            game.refreshBackground = false;
        }
    },

    // Distance from edge of canvas at which panning starts
    panningThreshold: 80,
    // The maximum distance to pan in a single drawing loop
    maximumPanDistance: 10,

    handlePanning: function() {

        // Do not pan if mouse leaves the canvas
        if (!mouse.insideCanvas) {
            return;
        }


        if (mouse.x <= game.panningThreshold) {
            // Mouse is at the left edge of the game area. Pan to the left.
            let panDistance = game.offsetX;

            if (panDistance > 0) {
                game.offsetX -= Math.min(panDistance, game.maximumPanDistance);
                game.refreshBackground = true;
            }
        } else if (mouse.x >= game.canvasWidth - game.panningThreshold) {
            // Mouse is at the right edge of the game area. Pan to the right.
            let panDistance = game.currentMapImage.width - game.canvasWidth - game.offsetX;

            if (panDistance > 0) {
                game.offsetX += Math.min(panDistance, game.maximumPanDistance);
                game.refreshBackground = true;
            }
        }

        if (mouse.y <= game.panningThreshold) {
            // Mouse is at the top edge of the game area. Pan upwards.
            let panDistance = game.offsetY;

            if (panDistance > 0) {
                game.offsetY -= Math.min(panDistance, game.maximumPanDistance);
                game.refreshBackground = true;
            }
        } else if (mouse.y >= game.canvasHeight - game.panningThreshold) {
            // Mouse is at the bottom edge of the game area. Pan downwards.
            let panDistance = game.currentMapImage.height - game.offsetY - game.canvasHeight;

            if (panDistance > 0) {
                game.offsetY += Math.min(panDistance, game.maximumPanDistance);
                game.refreshBackground = true;
            }
        }

        if (game.refreshBackground) {
            // Update mouse game coordinates based on new game offsetX and offsetY
            mouse.calculateGameCoordinates();
        }
    },
};

/* Set up inital window event listeners */

// Intialize and resize the game once page has fully loaded
window.addEventListener("load", function() {
    game.resize();
    game.init();
}, false);

// Resize the game any time the window is resized
window.addEventListener("resize", function() {
    game.resize();
});