var game = {
    // Start initializing objects, preloading assets and display start screen
    init: function() {
        // Get handler for game canvas and context
        game.canvas = document.getElementById("gamecanvas");
        game.context = game.canvas.getContext("2d");

        // Initialize objects
        levels.init();
        loader.init();
        mouse.init();

        // Hide all game layers and display the start screen
        game.hideScreens();
        game.showScreen("gamestartscreen");
    },

    hideScreens: function() {
        var screens = document.getElementsByClassName("gamelayer");

        // Iterate through all the game layers and set their display to none
        for (let i = screens.length - 1; i >= 0; i--) {
            var screen = screens[i];

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

    showLevelScreen: function() {
        game.hideScreens();
        game.showScreen("levelselectscreen");
    },

    // Store current game state - intro, wait-for-firing, firing, fired, load-next-hero, success, failure
    mode: "intro",

    // X & Y coordinates of the slingshot
    slingshotX: 140,
    slingshotY: 280,

    // X & Y coordinate of point where band is attached to slingshot
    slingshotBandX: 140 + 55,
    slingshotBandY: 280 + 23,

    // Flag to check if the game has ended
    ended: false,

    // The game score
    score: 0,

    // X axis offset for panning the screen from left to right
    offsetLeft: 0,

    start: function() {
        game.hideScreens();

        // Display the game canvas and score
        game.showScreen("gamecanvas");
        game.showScreen("scorescreen");

        game.mode = "intro";
        game.currentHero = undefined;

        game.offsetLeft = 0;
        game.ended = false;

        game.animationFrame = window.requestAnimationFrame(game.animate, game.canvas);

    },

    // Maximum panning speed per frame in pixels
    maxSpeed: 3,

    // Pan the screen so it centers at newCenter
    // (or at least as close as possible)
    panTo: function(newCenter) {

        // Minimum and Maximum panning offset
        var minOffset = 0;
        var maxOffset = game.currentLevel.backgroundImage.width - game.canvas.width;

        // The current center of the screen is half the screen width from the left offset
        var currentCenter = game.offsetLeft + game.canvas.width / 2;

        // If the distance between new center and current center is > 0 and we have not panned to the min and max offset limits, keep panning
        if (Math.abs(newCenter - currentCenter) > 0 && game.offsetLeft <= maxOffset && game.offsetLeft >= minOffset) {
            // We will travel half the distance from the newCenter to currentCenter in each tick
            // This will allow easing
            var deltaX = (newCenter - currentCenter) / 2;

            // However if deltaX is really high, the screen will pan too fast, so if it is greater than maxSpeed
            if (Math.abs(deltaX) > game.maxSpeed) {
                // Limit delta x to game.maxSpeed (and keep the sign of deltaX)
                deltaX = game.maxSpeed * Math.sign(deltaX);
            }

            // And if we have almost reached the goal, just get to the ending in this turn
            if (Math.abs(deltaX) <= 1) {
                deltaX = (newCenter - currentCenter);
            }

            // Finally add the adjusted deltaX to offsetX so we move the screen by deltaX
            game.offsetLeft += deltaX;

            // And make sure we don't cross the minimum or maximum limits
            if (game.offsetLeft <= minOffset) {
                game.offsetLeft = minOffset;

                // Let calling function know that we have panned as close as possible to the newCenter
                return true;
            } else if (game.offsetLeft >= maxOffset) {
                game.offsetLeft = maxOffset;

                // Let calling function know that we have panned as close as possible to the newCenter
                return true;
            }

        } else {
            // Let calling function know that we have panned as close as possible to the newCenter
            return true;
        }
    },

    handleGameLogic: function() {
        if (game.mode === "intro") {
            if (game.panTo(700)) {
                game.mode = "load-next-hero";
            }
        }

        if (game.mode === "wait-for-firing") {
            if (mouse.dragging) {
                game.panTo(mouse.x + game.offsetLeft);
            } else {
                game.panTo(game.slingshotX);
            }
        }

        if (game.mode === "load-next-hero") {
            // First count the heroes and villains and populate their respective arrays
            // Check if any villains are alive, if not, end the level (success)
            // Check if there are any more heroes left to load, if not end the level (failure)
            // Load the hero and set mode to wait-for-firing
            game.mode = "wait-for-firing";
        }

        if (game.mode === "firing") {
            // If the mouse button is down, allow the hero to be dragged around and aimed
            // If not, fire the hero into the air
        }

        if (game.mode === "fired") {
            // Pan to the location of the current hero as he flies
            //Wait till the hero stops moving or is out of bounds
        }


        if (game.mode === "level-success" || game.mode === "level-failure") {
            // First pan all the way back to the left
            // Then show the game as ended and show the ending screen
        }

    },

    animate: function() {

        // Handle panning, game states and control flow
        game.handleGameLogic();

        // Draw the background with parallax scrolling
        // First draw the background image, offset by a fraction of the offsetLeft distance (1/4)
        // The bigger the fraction, the closer the background appears to be
        game.context.drawImage(game.currentLevel.backgroundImage, game.offsetLeft / 4, 0, game.canvas.width, game.canvas.height, 0, 0, game.canvas.width, game.canvas.height);
        // Then draw the foreground image, offset by the entire offsetLeft distance
        game.context.drawImage(game.currentLevel.foregroundImage, game.offsetLeft, 0, game.canvas.width, game.canvas.height, 0, 0, game.canvas.width, game.canvas.height);


        // Draw the base of the slingshot, offset by the entire offsetLeft distance
        game.context.drawImage(game.slingshotImage, game.slingshotX - game.offsetLeft, game.slingshotY);

        // Draw the front of the slingshot, offset by the entire offsetLeft distance
        game.context.drawImage(game.slingshotFrontImage, game.slingshotX - game.offsetLeft, game.slingshotY);

        if (!game.ended) {
            game.animationFrame = window.requestAnimationFrame(game.animate, game.canvas);
        }
    },

};

var levels = {
    // Level data
    data: [{   // First level
        foreground: "desert-foreground",
        background: "clouds-background",
        entities: []
    }, {   // Second level
        foreground: "desert-foreground",
        background: "clouds-background",
        entities: []
    }],

    // Initialize level selection screen
    init: function() {
        var levelSelectScreen = document.getElementById("levelselectscreen");

        // An event handler to call
        var buttonClickHandler = function() {
            game.hideScreen("levelselectscreen");

            // Level label values are 1, 2. Levels are 0, 1
            levels.load(this.value - 1);
        };


        for (let i = 0; i < levels.data.length; i++) {
            var button = document.createElement("input");

            button.type = "button";
            button.value = (i + 1); // Level labels are 1, 2
            button.addEventListener("click", buttonClickHandler);

            levelSelectScreen.appendChild(button);
        }

    },

    // Load all data and images for a specific level
    load: function(number) {

        // Declare a new currentLevel object
        game.currentLevel = { number: number };
        game.score = 0;

        document.getElementById("score").innerHTML = "Score: " + game.score;
        var level = levels.data[number];

        // Load the background, foreground, and slingshot images
        game.currentLevel.backgroundImage = loader.loadImage("images/backgrounds/" + level.background + ".png");
        game.currentLevel.foregroundImage = loader.loadImage("images/backgrounds/" + level.foreground + ".png");
        game.slingshotImage = loader.loadImage("images/slingshot.png");
        game.slingshotFrontImage = loader.loadImage("images/slingshot-front.png");

        // Call game.start() once the assets have loaded
        loader.onload = game.start;

    }
};

var loader = {
    loaded: true,
    loadedCount: 0, // Assets that have been loaded so far
    totalCount: 0, // Total number of assets that need loading

    init: function() {
        // check for sound support
        var mp3Support, oggSupport;
        var audio = document.createElement("audio");

        if (audio.canPlayType) {
               // Currently canPlayType() returns:  "", "maybe" or "probably"
            mp3Support = "" !== audio.canPlayType("audio/mpeg");
            oggSupport = "" !== audio.canPlayType("audio/ogg; codecs=\"vorbis\"");
        } else {
            // The audio tag is not supported
            mp3Support = false;
            oggSupport = false;
        }

        // Check for ogg, then mp3, and finally set soundFileExtn to undefined
        loader.soundFileExtn = oggSupport ? ".ogg" : mp3Support ? ".mp3" : undefined;
    },

    loadImage: function(url) {
        this.loaded = false;
        this.totalCount++;

        game.showScreen("loadingscreen");

        var image = new Image();

        image.addEventListener("load", loader.itemLoaded, false);
        image.src = url;

        return image;
    },

    soundFileExtn: ".ogg",

    loadSound: function(url) {
        this.loaded = false;
        this.totalCount++;

        game.showScreen("loadingscreen");

        var audio = new Audio();

        audio.addEventListener("canplaythrough", loader.itemLoaded, false);
        audio.src = url + loader.soundFileExtn;

        return audio;
    },

    itemLoaded: function(ev) {
        // Stop listening for event type (load or canplaythrough) for this item now that it has been loaded
        ev.target.removeEventListener(ev.type, loader.itemLoaded, false);

        loader.loadedCount++;

        document.getElementById("loadingmessage").innerHTML = "Loaded " + loader.loadedCount + " of " + loader.totalCount;

        if (loader.loadedCount === loader.totalCount) {
            // Loader has loaded completely..
            // Reset and clear the loader
            loader.loaded = true;
            loader.loadedCount = 0;
            loader.totalCount = 0;

            // Hide the loading screen
            game.hideScreen("loadingscreen");

            // and call the loader.onload method if it exists
            if (loader.onload) {
                loader.onload();
                loader.onload = undefined;
            }
        }
    }
};

var mouse = {
    x: 0,
    y: 0,
    down: false,
    dragging: false,

    init: function() {
        var canvas = document.getElementById("gamecanvas");

        canvas.addEventListener("mousemove", mouse.mousemovehandler, false);
        canvas.addEventListener("mousedown", mouse.mousedownhandler, false);
        canvas.addEventListener("mouseup", mouse.mouseuphandler, false);
        canvas.addEventListener("mouseout", mouse.mouseuphandler, false);
    },

    mousemovehandler: function(ev) {
        var offset = game.canvas.getBoundingClientRect();

        mouse.x = ev.clientX - offset.left;
        mouse.y = ev.clientY - offset.top;

        if (mouse.down) {
            mouse.dragging = true;
        }

        ev.preventDefault();
    },

    mousedownhandler: function(ev) {
        mouse.down = true;

        ev.preventDefault();
    },

    mouseuphandler: function(ev) {
        mouse.down = false;
        mouse.dragging = false;

        ev.preventDefault();
    }
};

// Intialize game once page has fully loaded
window.addEventListener("load", function() {
    game.init();
});