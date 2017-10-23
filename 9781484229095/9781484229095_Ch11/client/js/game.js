var game = {

    // Start initializing objects, preloading assets and display start screen
    init: function() {
        // Initialize objects
        loader.init();
        mouse.init();
        sidebar.init();
        sounds.init();

        // Initialize and store contexts for both the canvases
        game.initCanvases();

            // If wAudio has been added, automatically enable mobile audio on the first user touch event
        if (window.wAudio) {
            wAudio.mobileAutoEnable = true;
        }


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

        // Initialize all the arrays for the game
        game.resetArrays();

        // Load all the assets for every entity defined in the level requirements array
        for (let type in level.requirements) {
            let requirementArray = level.requirements[type];

            requirementArray.forEach(function(name) {
                if (window[type] && typeof window[type].load === "function") {
                    window[type].load(name);
                } else {
                    console.log("Could not load type :", type);
                }
            });
        }

        // Add all the items defined in the level items array to the game
        level.items.forEach(function(itemDetails) {
            game.add(itemDetails);
        });

        // Load starting cash for the level
        game.cash = Object.assign({}, level.cash);

        sidebar.initRequirementsForLevel();
    },

    start: function() {
        // Display the game interface
        game.hideScreens();
        game.showScreen("gameinterfacescreen");

        game.running = true;
        game.refreshBackground = true;
        game.canvasResized = true;

        game.drawingLoop();

        // Clear the game messages area
        let gamemessages = document.getElementById("gamemessages");

        gamemessages.innerHTML = "";

        // Initialize All Game Triggers
        game.currentLevel.triggers.forEach(function(trigger) {
            game.initTrigger(trigger);
        });
    },

    // A control loop that runs at a fixed period of time
    animationTimeout: 100, // 100 milliseconds or 10 times a second

    animationLoop: function() {

        // Animate the sidebar
        sidebar.animate();

        // Process orders for any item that handles orders
        game.items.forEach(function(item) {
            if (item.processOrders) {
                item.processOrders();
            }
        });

        // Animate each of the elements within the game
        game.items.forEach(function(item) {
            item.animate();
        });

        // Sort game items into a sortedItems array based on their x,y coordinates
        game.sortedItems = Object.assign([], game.items);
        game.sortedItems.sort(function(a, b) {
            return a.y - b.y + ((a.y === b.y) ? (b.x - a.x) : 0);
        });

        fog.animate();

        // Save the time that the last animation loop completed
        game.lastAnimationTime = Date.now();
    },

    // The map is broken into square tiles of this size (20 pixels x 20 pixels)
    gridSize: 20,
    // X & Y panning offsets for the map
    offsetX: 0,
    offsetY: 0,

    drawingLoop: function() {
        // Pan the map if the cursor is near the edge of the canvas
        game.handlePanning();

        // Check the time since the game was animated and calculate a linear interpolation factor (-1 to 0)
        game.lastDrawTime = Date.now();
        if (game.lastAnimationTime) {
            game.drawingInterpolationFactor = (game.lastDrawTime - game.lastAnimationTime) / game.animationTimeout - 1;

            // No point interpolating beyond the next animation loop...
            if (game.drawingInterpolationFactor > 0) {
                game.drawingInterpolationFactor = 0;
            }
        } else {
            game.drawingInterpolationFactor = -1;
        }

        // Draw the background whenever necessary
        game.drawBackground();

        // Clear the foreground canvas
        game.foregroundContext.clearRect(0, 0, game.canvasWidth, game.canvasHeight);

        // Start drawing the foreground elements
        game.sortedItems.forEach(function(item) {
            item.draw();
        });

        // Draw exploding bullets on top of everything else
        game.bullets.forEach(function(bullet) {
            if (bullet.action === "explode") {
                bullet.draw();
            }
        });

        fog.draw();

        // Draw the mouse
        mouse.draw();

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

    resetArrays: function() {
        // Count items added in game, to assign them a unique id
        game.counter = 0;

        // Track all the items currently in the game
        game.items = [];
        game.buildings = [];
        game.vehicles = [];
        game.aircraft = [];
        game.terrain = [];

        // Track items that have been selected by the player
        game.selectedItems = [];

        game.bullets = [];
    },

    add: function(itemDetails) {
        // Set a unique id for the item
        if (!itemDetails.uid) {
            itemDetails.uid = ++game.counter;
        }

        var item = window[itemDetails.type].add(itemDetails);

        // Add the item to the items array
        game.items.push(item);

        // Add the item to the type specific array
        game[item.type].push(item);

        // Reset currentMapPassableGrid whenever the map changes
        if (item.type === "buildings" || item.type === "terrain") {
            game.currentMapPassableGrid = undefined;
        }

        // Play bullet firing sound when a bullet is created
        if (item.type === "bullets") {
            sounds.play(item.name);
        }

        return item;
    },

    remove: function(item) {
        // Unselect item if it is selected
        item.selected = false;
        for (let i = game.selectedItems.length - 1; i >= 0; i--) {
            if (game.selectedItems[i].uid === item.uid) {
                game.selectedItems.splice(i, 1);
                break;
            }
        }

        // Remove item from the items array
        for (let i = game.items.length - 1; i >= 0; i--) {
            if (game.items[i].uid === item.uid) {
                game.items.splice(i, 1);
                break;
            }
        }

        // Remove items from the type specific array
        for (let i = game[item.type].length - 1; i >= 0; i--) {
            if (game[item.type][i].uid === item.uid) {
                game[item.type].splice(i, 1);
                break;
            }
        }

        // Reset currentMapPassableGrid whenever the map changes
        if (item.type === "buildings" || item.type === "terrain") {
            game.currentMapPassableGrid = undefined;
        }
    },

    clearSelection: function() {
        while (game.selectedItems.length > 0) {
            game.selectedItems.pop().selected = false;
        }
    },

    selectItem: function(item, shiftPressed) {
        // Pressing shift and clicking on a selected item will deselect it
        if (shiftPressed && item.selected) {
            // Deselect item
            item.selected = false;

            for (let i = game.selectedItems.length - 1; i >= 0; i--) {
                if (game.selectedItems[i].uid === item.uid) {
                    game.selectedItems.splice(i, 1);
                    break;
                }
            }

            return;
        }

        if (item.selectable && !item.selected) {
            item.selected = true;
            game.selectedItems.push(item);
        }
    },

    // Send command to either singleplayer or multiplayer object
    sendCommand: function(uids, details) {
        if (game.type === "singleplayer") {
            singleplayer.sendCommand(uids, details);
        } else {
            multiplayer.sendCommand(uids, details);
        }
    },

    getItemByUid: function(uid) {
        for (let i = game.items.length - 1; i >= 0; i--) {
            if (game.items[i].uid === uid) {
                return game.items[i];
            }
        }
    },

    // Receive command from singleplayer or multiplayer object and send it to units
    processCommand: function(uids, details) {
        // In case the target "to" object is in terms of uid, fetch the target object
        var toObject;

        if (details.toUid) {
            toObject = game.getItemByUid(details.toUid);
            if (!toObject || toObject.lifeCode === "dead") {
                // To object no longer exists. Invalid command
                return;
            }
        }

        uids.forEach(function(uid) {
            let item = game.getItemByUid(uid);

            // If uid is for a valid item, set the order for the item
            if (item) {
                item.orders = Object.assign({}, details);
                if (toObject) {
                    item.orders.to = toObject;
                }
            }
        });
    },

    // Create a grid that stores all obstructed tiles as 1 and unobstructed as 0
    createTerrainGrid: function() {

        let map = game.currentMap;

        // Initialize Terrain Grid to 2d array of zeroes
        game.currentMapTerrainGrid = new Array(map.gridMapHeight);

        var row = new Array(map.gridMapWidth);

        for (let x = 0; x < map.mapGridWidth; x++) {
            row[x] = 0;
        }

        for (let y = 0; y < map.mapGridHeight; y++) {
            game.currentMapTerrainGrid[y] = row.slice(0);
        }

        // Take all the obstructed terrain coordinates and mark them on the terrain grid as unpassable
        map.mapObstructedTerrain.forEach(function(obstruction) {
            game.currentMapTerrainGrid[obstruction[1]][obstruction[0]] = 1;
        }, this);

        // Reset the passable grid
        game.currentMapPassableGrid = undefined;

        game.rebuildPassableGrid();

    },

    // Make a copy of a 2 Dimensional Array
    makeArrayCopy: function(originalArray) {
        var length = originalArray.length;
        var copy = new Array(length);

        for (let i = 0; i < length; i++) {
            copy[i] = originalArray[i].slice(0);
        }

        return copy;
    },

    rebuildPassableGrid: function() {

        // Initialize Passable Grid with the value of Terrain Grid
        game.currentMapPassableGrid = game.makeArrayCopy(game.currentMapTerrainGrid);

        // Also mark all building and terrain as unpassable items
        for (let i = game.items.length - 1; i >= 0; i--) {
            var item = game.items[i];

            if (item.type === "buildings" || item.type === "terrain") {
                for (let y = item.passableGrid.length - 1; y >= 0; y--) {
                    for (let x = item.passableGrid[y].length - 1; x >= 0; x--) {
                        if (item.passableGrid[y][x]) {
                            game.currentMapPassableGrid[item.y + y][item.x + x] = 1;
                        }
                    }
                }
            }
        }
    },

    // Profile pictures for game characters
    characters: {
        "system": {
            "name": "System Control",
            "image": "system.png"
        },
        "op": {
            "name": "Operator",
            "image": "girl1.png"
        },
        "pilot": {
            "name": "Pilot",
            "image": "girl2.png"
        },
        "driver": {
            "name": "Driver",
            "image": "man1.png"
        }
    },

    showMessage: function(from, message) {

        sounds.play("message-received");

        let callerpicture = document.getElementById("callerpicture");
        let gamemessages = document.getElementById("gamemessages");

        // If the message is from a defined game character, show profile picture
        let character = game.characters[from];

        if (character) {

            // Use the character's defined name
            from = character.name;

            if (character.image) {
                // Display the character image in the caller picture area
                callerpicture.innerHTML = "<img src=\"images/characters/" + character.image + "\"/>";

                // Remove the caller picture after six seconds
                setTimeout(function() {
                    callerpicture.innerHTML = "";
                }, 6000);
            }
        }

        // Append message to messages pane and scroll to the bottom

        let messageHTML = "<span>" + from + ": </span>" + message + "<br>";

        gamemessages.innerHTML += messageHTML;
        gamemessages.scrollTop = gamemessages.scrollHeight;

    },

    rebuildBuildableGrid: function() {
        game.currentMapBuildableGrid = game.makeArrayCopy(game.currentMapTerrainGrid);

        game.items.forEach(function(item) {

            if (item.type === "buildings" || item.type === "terrain") {
                // Mark all squares that the building uses as unbuildable
                for (let y = item.buildableGrid.length - 1; y >= 0; y--) {
                    for (let x = item.buildableGrid[y].length - 1; x >= 0; x--) {
                        if (item.buildableGrid[y][x]) {
                            game.currentMapBuildableGrid[item.y + y][item.x + x] = 1;
                        }
                    }
                }
            } else if (item.type === "vehicles") {
                // Mark all squares under or near the vehicle as unbuildable
                let radius = item.radius / game.gridSize;
                let x1 = Math.max(Math.floor(item.x - radius), 0);
                let x2 = Math.min(Math.floor(item.x + radius), game.currentMap.mapGridWidth - 1);
                let y1 = Math.max(Math.floor(item.y - radius), 0);
                let y2 = Math.min(Math.floor(item.y + radius), game.currentMap.mapGridHeight - 1);

                for (let x = x1; x <= x2; x++) {
                    for (let y = y1; y <= y2; y++) {
                        game.currentMapBuildableGrid[y][x] = 1;
                    }
                }
            }

        });
    },

    /* Message Box related code*/

    messageBoxOkCallback: undefined,
    messageBoxCancelCallback: undefined,
    showMessageBox: function(message, onOK, onCancel) {
        // Set message box text
        let messageBoxText = document.getElementById("messageboxtext");

        messageBoxText.innerHTML = message.replace(/\n/g, "<br><br>");

        // Set message box onOK handler
        if (typeof onOK === "function") {
            game.messageBoxOkCallback = onOK;
        } else {
            game.messageBoxOkCallback = undefined;
        }

        // Set onCancel handler if defined and show Cancel button
        let cancelButton = document.getElementById("messageboxcancel");

        if (typeof onCancel === "function") {
            game.messageBoxCancelCallback = onCancel;
            // Show the cancel button
            cancelButton.style.display = "";
        } else {
            game.messageBoxCancelCallback = undefined;
            // Hide the cancel button
            cancelButton.style.display = "none";
        }

        // Display the message box and wait for user to click a button
        game.showScreen("messageboxscreen");
    },

    messageBoxOK: function() {
        game.hideScreen("messageboxscreen");
        if (typeof game.messageBoxOkCallback === "function") {
            game.messageBoxOkCallback();
        }
    },

    messageBoxCancel: function() {
        game.hideScreen("messageboxscreen");
        if (typeof game.messageBoxCancelCallback === "function") {
            game.messageBoxCancelCallback();
        }
    },

    /* Methods for handling triggered events within the game */

    initTrigger: function(trigger) {
        if (trigger.type === "timed") {
            trigger.timeout = setTimeout(function() {
                game.runTrigger(trigger);
            }, trigger.time);
        } else if (trigger.type === "conditional") {
            trigger.interval = setInterval(function() {
                game.runTrigger(trigger);
            }, 1000);
        }
    },

    runTrigger: function(trigger) {
        if (trigger.type === "timed") {
            // Re initialize the trigger based on repeat settings
            if (trigger.repeat) {
                game.initTrigger(trigger);
            }
            // Call the trigger action
            trigger.action(trigger);
        } else if (trigger.type === "conditional") {
            //Check if the condition has been satisfied
            if (trigger.condition()) {
                // Clear the trigger
                game.clearTrigger(trigger);
                // Call the trigger action
                trigger.action(trigger);
            }
        }
    },

    clearTrigger: function(trigger) {
        if (trigger.timeout !== undefined) {
            clearTimeout(trigger.timeout);
            trigger.timeout = undefined;
        }

        if (trigger.interval !== undefined) {
            clearInterval(trigger.interval);
            trigger.interval = undefined;
        }
    },

    end: function() {
        // Clear Any Game Triggers
        if (game.currentLevel.triggers) {
            for (var i = game.currentLevel.triggers.length - 1; i >= 0; i--) {
                game.clearTrigger(game.currentLevel.triggers[i]);
            }
        }

        game.running = false;
    },

    isItemDead: function(uid) {
        let item = game.getItemByUid(uid);

        return !item || item.lifeCode === "dead";
    }

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