var mouse = {
    init: function() {
        // Listen for mouse events on the game foreground canvas
        let canvas = document.getElementById("gameforegroundcanvas");

        canvas.addEventListener("mousemove", mouse.mousemovehandler, false);

        canvas.addEventListener("mouseenter", mouse.mouseenterhandler, false);
        canvas.addEventListener("mouseout", mouse.mouseouthandler, false);

        canvas.addEventListener("mousedown", mouse.mousedownhandler, false);
        canvas.addEventListener("mouseup", mouse.mouseuphandler, false);

        canvas.addEventListener("contextmenu", mouse.mouserightclickhandler, false);

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
        if (mouse.buttonPressed && !sidebar.deployBuilding) {
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
        }
    },

    // Called whenever player completes a left click on the game canvas
    leftClick: function(shiftPressed) {
        if (sidebar.deployBuilding) {
            if (sidebar.canDeployBuilding) {
                sidebar.finishDeployingBuilding();
            } else {
                game.showMessage("system", "Warning! Cannot deploy building here.");
            }

            return;
        }

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
        // If the mouse is over fog, don't detect any items
        if (fog.isPointOverFog(mouse.gameX, mouse.gameY)) {
            return;
        }


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

    buildableColor: "rgba(0,0,255,0.3)",
    unbuildableColor: "rgba(255,0,0,0.3)",
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

        if (mouse.insideCanvas && sidebar.deployBuilding && sidebar.placementGrid) {
            let x = (this.gridX * game.gridSize) - game.offsetX;
            let y = (this.gridY * game.gridSize) - game.offsetY;

            for (let i = sidebar.placementGrid.length - 1; i >= 0; i--) {
                for (let j = sidebar.placementGrid[i].length - 1; j >= 0; j--) {
                    let tile = sidebar.placementGrid[i][j];

                    if (tile) {
                        game.foregroundContext.fillStyle = (tile === 1) ? this.buildableColor : this.unbuildableColor;
                        game.foregroundContext.fillRect(x + j * game.gridSize, y + i * game.gridSize, game.gridSize, game.gridSize);
                    }
                }
            }
        }
    },

    mouserightclickhandler: function(ev) {
        mouse.rightClick();

        // Prevent the browser from showing the context menu
        ev.preventDefault(true);
    },

    // Called whenever player completes a right click on the game canvas
    rightClick: function() {
        // If the game is in deployBuilding mode, right clicking will cancel deployBuilding mode
        if (sidebar.deployBuilding) {
            sidebar.cancelDeployingBuilding();

            return;
        }

        let clickedItem = mouse.itemUnderMouse();

        // Handle actions like attacking and movement of selected units
        if (clickedItem) { // Player right-clicked on something
            if (clickedItem.type !== "terrain") {
                if (clickedItem.team !== game.team) { // Player right-clicked on an enemy item
                    let uids = [];

                    // Identify selected units from player's team that can attack
                    game.selectedItems.forEach(function(item) {
                        if (item.team === game.team && item.canAttack) {
                            uids.push(item.uid);
                        }
                    }, this);

                    // Command units to attack the clicked item
                    if (uids.length > 0) {
                        game.sendCommand(uids, { type: "attack", toUid: clickedItem.uid });
                    }
                } else { // Player right-clicked on a friendly item
                    let uids = [];

                    // Identify selected units from player's team that can move
                    game.selectedItems.forEach(function(item) {
                        if (item.team === game.team && item.canAttack && item.canMove) {
                            uids.push(item.uid);
                        }
                    }, this);

                    // Command units to guard the clicked item
                    if (uids.length > 0) {
                        game.sendCommand(uids, { type: "guard", toUid: clickedItem.uid });
                    }

                }
            } else if (clickedItem.name === "oilfield") { // Player right-clicked on an oilfield
                let uids = [];

                // Identify the first selected harvester (since only one can deploy at a time)
                for (let i = game.selectedItems.length - 1; i >= 0; i--) {
                    let item = game.selectedItems[i];

                    if (item.team === game.team && item.type === "vehicles" && item.name === "harvester") {
                        uids.push(item.uid);
                        break;
                    }
                }

                // Command it to deploy on the oilfield
                if (uids.length > 0) {
                    game.sendCommand(uids, { type: "deploy", toUid: clickedItem.uid });
                }
            }
        } else { // Player right-clicked on the ground
            let uids = [];

            // Identify selected units from player's team that can move
            game.selectedItems.forEach(function(item) {
                if (item.team === game.team && item.canMove) {
                    uids.push(item.uid);
                }
            }, this);

            // Command units to move to the clicked location
            if (uids.length > 0) {
                game.sendCommand(uids, { type: "move", to: { x: mouse.gameX / game.gridSize, y: mouse.gameY / game.gridSize } });
            }
        }
    },
};