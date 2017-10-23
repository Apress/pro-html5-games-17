var mouse = {
    init: function() {
        // Listen for mouse events on the game foreground canvas
        let canvas = document.getElementById("gameforegroundcanvas");

        canvas.addEventListener("mousemove", mouse.mousemovehandler, false);

        canvas.addEventListener("mouseenter", mouse.mouseenterhandler, false);
        canvas.addEventListener("mouseout", mouse.mouseouthandler, false);

        canvas.addEventListener("mousedown", mouse.mousedownhandler, false);
        canvas.addEventListener("mouseup", mouse.mouseuphandler, false);

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
        mouse.checkIfDragging();
    },

    // Is the player is dragging and selecting with the left mouse button pressed
    dragSelect: false,
    // If the mouse is dragged more than this, assume the player is trying to select something
    dragSelectThreshold: 5,

    checkIfDragging: function() {
        if (mouse.buttonPressed) {
            // If the mouse has been dragged more than threshold treat it as a drag
            if ((Math.abs(mouse.dragX - mouse.gameX) > mouse.dragSelectThreshold && Math.abs(mouse.dragY - mouse.gameY) > mouse.dragSelectThreshold)) {
                mouse.dragSelect = true;
            }
        } else {
            mouse.dragSelect = false;
        }
    },

    mouseenterhandler: function() {
        mouse.insideCanvas = true;
    },

    mouseouthandler: function() {
        mouse.insideCanvas = false;
    },

    // Is the left mouse button currently pressed
    buttonPressed: false,

    mousedownhandler: function(ev) {
        mouse.insideCanvas = true;
        mouse.setCoordinates(ev.clientX, ev.clientY);

        if (ev.button === 0) { // Left mouse button was pressed
            mouse.buttonPressed = true;

            mouse.dragX = mouse.gameX;
            mouse.dragY = mouse.gameY;

            // ev.preventDefault();
        }
    },

    // Called whenever player completes a left click on the game canvas
    leftClick: function(shiftPressed) {
        let clickedItem = mouse.itemUnderMouse();

        if (clickedItem) {
            // Pressing shift adds to existing selection. If shift is not pressed, clear existing selection
            if (!shiftPressed) {
                game.clearSelection();
            }

            game.selectItem(clickedItem, shiftPressed);
        }
    },

    // Return the first item detected under the mouse.
    itemUnderMouse: function() {
        for (let i = game.items.length - 1; i >= 0; i--) {
            let item = game.items[i];

            // Dead items will not be detected
            if (item.lifeCode === "dead") {
                continue;
            }

            let x = item.x * game.gridSize;
            let y = item.y * game.gridSize;

            if (item.type === "buildings" || item.type === "terrain") {
                // If mouse coordinates are within rectangular area of building or terrain
                if (x <= mouse.gameX && x >= (mouse.gameX - item.baseWidth) && y <= mouse.gameY && y >= (mouse.gameY - item.baseHeight)) {
                    return item;
                }
            } else if (item.type === "aircraft") {
                    // If mouse coordinates are within radius of aircraft (adjusted for pixelShadowHeight)
                if (Math.pow(x - mouse.gameX, 2) + Math.pow(y - mouse.gameY - item.pixelShadowHeight, 2) < Math.pow(item.radius, 2)) {
                    return item;
                }
            } else if (item.type === "vehicles") {
                    // If mouse coordinates are within radius of item
                if (Math.pow(x - mouse.gameX, 2) + Math.pow(y - mouse.gameY, 2) < Math.pow(item.radius, 2)) {
                    return item;
                }
            }
        }
    },

    mouseuphandler: function(ev) {
        mouse.setCoordinates(ev.clientX, ev.clientY);

        let shiftPressed = ev.shiftKey;

        if (ev.button === 0) { // Left mouse button was released
            if (mouse.dragSelect) {
                // If currently drag-selecting, attempt to select items with the selection rectangle
                mouse.finishDragSelection(shiftPressed);
            } else {
                // If not dragging, treat this as a normal click once the mouse is released
                mouse.leftClick(shiftPressed);
            }

            mouse.buttonPressed = false;

            // ev.preventDefault();
        }
    },

    finishDragSelection: function(shiftPressed) {
        if (!shiftPressed) {
            // If shift key is not pressed, clear any previosly selected items
            game.clearSelection();
        }

        // Calculate the bounds of the selection rectangle
        let x1 = Math.min(mouse.gameX, mouse.dragX);
        let y1 = Math.min(mouse.gameY, mouse.dragY);
        let x2 = Math.max(mouse.gameX, mouse.dragX);
        let y2 = Math.max(mouse.gameY, mouse.dragY);

        game.items.forEach(function(item) {
            // Unselectable items, dead items, opponent team items and buildings are not drag-selectable
            if (!item.selectable || item.lifeCode === "dead" || item.team !== game.team || item.type === "buildings") {
                return;
            }

            let x = item.x * game.gridSize;
            let y = item.y * game.gridSize;

            if (x1 <= x && x2 >= x) {
                if ((item.type === "vehicles" && y1 <= y && y2 >= y)
                    // In case of aircraft, adjust for pixelShadowHeight
                    || (item.type === "aircraft" && (y1 <= y - item.pixelShadowHeight) && (y2 >= y - item.pixelShadowHeight))) {

                    game.selectItem(item, shiftPressed);
                }
            }
        });

        mouse.dragSelect = false;
    },

    draw: function() {
        // If the player is dragging and selecting, draw a white box to mark the selection area
        if (this.dragSelect) {
            let x = Math.min(this.gameX, this.dragX);
            let y = Math.min(this.gameY, this.dragY);

            let width = Math.abs(this.gameX - this.dragX);
            let height = Math.abs(this.gameY - this.dragY);

            game.foregroundContext.strokeStyle = "white";
            game.foregroundContext.strokeRect(x - game.offsetX, y - game.offsetY, width, height);
        }
    },
};