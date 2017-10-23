var buildings = {
    list: {
        "base": {
            name: "base",
            // Properties for drawing the object

            // Dimensions of the individual sprite
            pixelWidth: 60,
            pixelHeight: 60,

            // Dimensions of the base area
            baseWidth: 40,
            baseHeight: 40,

            // Offset of the base area from the top left corner of the sprite
            pixelOffsetX: 0,
            pixelOffsetY: 20,

            // Grid squares necessary for constructing the building
            buildableGrid: [
                [1, 1],
                [1, 1]
            ],

            // Grid squares that are passable or obstructed for pathfinding
            passableGrid: [
                [1, 1],
                [1, 1]
            ],

            // How far the building can "see" through fog of war
            sight: 3,

            // Maximum possible life
            hitPoints: 500,

            cost: 5000,

            spriteImages: [
                { name: "healthy", count: 4 },
                { name: "damaged", count: 1 },
                { name: "constructing", count: 3 }
            ],

            processOrders: function() {
                switch (this.orders.type) {
                    case "construct-building":
                        this.action = "construct";
                        this.animationIndex = 0;

                        // Teleport in building and subtract the cost from player cash
                        var itemDetails = this.orders.details;

                        itemDetails.team = this.team;
                        itemDetails.action = "teleport";

                        var item = game.add(itemDetails);

                        game.cash[this.team] -= item.cost;

                        this.orders = { type: "stand" };

                        break;
                }
            }
        },

        "starport": {
            name: "starport",
            pixelWidth: 40,
            pixelHeight: 60,
            baseWidth: 40,
            baseHeight: 55,
            pixelOffsetX: 1,
            pixelOffsetY: 5,
            buildableGrid: [
                [1, 1],
                [1, 1],
                [1, 1]
            ],
            passableGrid: [
                [1, 1],
                [0, 0],
                [0, 0]
            ],
            sight: 3,
            cost: 2000,
            canConstruct: true,
            hitPoints: 300,
            spriteImages: [
                { name: "teleport", count: 9 },
                { name: "closing", count: 18 },
                { name: "healthy", count: 4 },
                { name: "damaged", count: 1 }
            ],

            isUnitOnTop: function() {
                let unitOnTop = false;

                for (let i = game.items.length - 1; i >= 0; i--) {
                    let item = game.items[i];

                    if (item.type === "vehicles" || item.type === "aircraft") {
                        if (item.x > this.x && item.x < this.x + 2 && item.y > this.y && item.y < this.y + 3) {
                            unitOnTop = true;
                            break;
                        }
                    }
                }

                return unitOnTop;
            },

            processOrders: function() {
                switch (this.orders.type) {
                    case "construct-unit":
                        if (this.lifeCode !== "healthy") {
                            // If the building isn't healthy, ignore the order
                            this.orders = { type: "stand" };
                            break;
                        }


                        var unitOnTop = this.isUnitOnTop();
                        var cost = window[this.orders.details.type].list[this.orders.details.name].cost;
                        var cash = game.cash[this.team];

                        if (unitOnTop) {
                            // Check whether there is a unit standing on top of the building
                            if (this.team === game.team) {
                                game.showMessage("system", "Warning! Cannot teleport unit while landing bay is occupied.");
                            }

                        } else if (cash < cost) {
                            // Check whether player has insufficient cash
                            if (this.team === game.team) {
                                game.showMessage("system", "Warning! Insufficient Funds. Need " + cost + " credits.");
                            }
                        } else {
                            this.action = "open";
                            this.animationIndex = 0;

                            let itemDetails = Object.assign({}, this.orders.details);

                            // Position new unit above center of starport
                            itemDetails.x = this.x + 0.5 * this.pixelWidth / game.gridSize;
                            itemDetails.y = this.y + 0.5 * this.pixelHeight / game.gridSize;

                            // Subtract the cost from player cash
                            game.cash[this.team] -= cost;

                            // Set unit to be teleported in once it is constructed
                            itemDetails.action = "teleport";
                            itemDetails.team = this.team;
                            this.constructUnit = itemDetails;
                        }

                        this.orders = { type: "stand" };
                        break;
                }
            }
        },

        "harvester": {
            name: "harvester",
            pixelWidth: 40,
            pixelHeight: 60,
            baseWidth: 40,
            baseHeight: 20,
            pixelOffsetX: -2,
            pixelOffsetY: 40,
            buildableGrid: [
                [1, 1]
            ],
            passableGrid: [
                [1, 1]
            ],
            sight: 3,
            cost: 5000,
            hitPoints: 300,
            spriteImages: [
                { name: "deploy", count: 17 },
                { name: "healthy", count: 3 },
                { name: "damaged", count: 1 }
            ],
        },

        "ground-turret": {
            name: "ground-turret",
            canAttack: true,
            canAttackLand: true,
            canAttackAir: false,
            weaponType: "cannon-ball",
            action: "stand",
            direction: 0, // Face upward (0) by default
            directions: 8, // Total of 8 turret directions allowed (0-7)
            orders: { type: "guard" },
            pixelWidth: 38,
            pixelHeight: 32,
            baseWidth: 20,
            baseHeight: 18,
            cost: 1500,
            canConstruct: true,
            pixelOffsetX: 9,
            pixelOffsetY: 12,
            buildableGrid: [
                [1]
            ],
            passableGrid: [
                [1]
            ],
            sight: 5,
            hitPoints: 200,
            spriteImages: [
                { name: "teleport", count: 9 },
                { name: "healthy", count: 1, directions: 8 },
                { name: "damaged", count: 1 }
            ],
        }
    },

    defaults: {
        type: "buildings",

        processActions: function() {
            switch (this.action) {

                case "stand":
                    if (this.name === "ground-turret" && this.lifeCode === "healthy") {
                        // For a healthy turret, use direction to choose image list
                        let direction = Math.round(this.direction) % this.directions;

                        this.imageList = this.spriteArray[this.lifeCode + "-" + direction];
                    } else {
                        // In all other cases, use lifeCode
                        this.imageList = this.spriteArray[this.lifeCode];
                    }

                    this.imageOffset = this.imageList.offset + this.animationIndex;
                    this.animationIndex++;

                    if (this.animationIndex >= this.imageList.count) {
                        this.animationIndex = 0;
                    }

                    break;
                case "construct":
                    this.imageList = this.spriteArray["constructing"];
                    this.imageOffset = this.imageList.offset + this.animationIndex;
                    this.animationIndex++;

                    // Once constructing is complete go back to standing
                    if (this.animationIndex >= this.imageList.count) {
                        this.animationIndex = 0;
                        this.action = "stand";
                    }

                    break;

                case "teleport":
                    this.imageList = this.spriteArray["teleport"];
                    this.imageOffset = this.imageList.offset + this.animationIndex;
                    this.animationIndex++;

                    // Once teleporting is complete, move to stand mode
                    if (this.animationIndex >= this.imageList.count) {
                        this.animationIndex = 0;
                        this.action = "stand";
                    }

                    break;

                case "close":
                    this.imageList = this.spriteArray["closing"];
                    this.imageOffset = this.imageList.offset + this.animationIndex;
                    this.animationIndex++;

                    // Once closing is complete go back to standing
                    if (this.animationIndex >= this.imageList.count) {
                        this.animationIndex = 0;
                        this.action = "stand";
                    }

                    break;

                case "open":
                    this.imageList = this.spriteArray["closing"];
                    // Opening is just the closing sprites running backwards
                    this.imageOffset = this.imageList.offset + this.imageList.count - this.animationIndex;
                    this.animationIndex++;

                    // Once opening is complete, go back to close
                    if (this.animationIndex >= this.imageList.count) {
                        this.animationIndex = 0;
                        this.action = "close";

                        // If constructUnit has been set, add the new unit to the game
                        if (this.constructUnit) {
                            game.add(this.constructUnit);
                            this.constructUnit = undefined;
                        }
                    }

                    break;

                case "deploy":
                    this.imageList = this.spriteArray["deploy"];
                    this.imageOffset = this.imageList.offset + this.animationIndex;
                    this.animationIndex++;

                    // Once deploying is complete, go to harvest
                    if (this.animationIndex >= this.imageList.count) {
                        this.animationIndex = 0;
                        this.action = "harvest";
                    }

                    break;

                case "harvest":
                    this.imageList = this.spriteArray[this.lifeCode];
                    this.imageOffset = this.imageList.offset + this.animationIndex;
                    this.animationIndex++;

                    if (this.animationIndex >= this.imageList.count) {
                        this.animationIndex = 0;
                        if (this.lifeCode === "healthy") {
                            // Harvesters mine 2 credits of cash per animation cycle
                            game.cash[this.team] += 2;
                        }
                    }

                    break;

            }
        },

        // Default function for drawing a building
        drawSprite: function() {
            let x = this.drawingX;
            let y = this.drawingY;

            // All sprite sheets will have blue in the first row and green in the second row
            let colorIndex = (this.team === "blue") ? 0 : 1;
            let colorOffset = colorIndex * this.pixelHeight;

            // Draw the sprite at x, y
            game.foregroundContext.drawImage(this.spriteSheet, this.imageOffset * this.pixelWidth, colorOffset, this.pixelWidth, this.pixelHeight, x, y, this.pixelWidth, this.pixelHeight);
        },

        drawLifeBar: function() {
            let x = this.drawingX + this.pixelOffsetX;
            let y = this.drawingY - 2 * this.lifeBarHeight;

            game.foregroundContext.fillStyle = (this.lifeCode === "healthy") ? this.lifeBarHealthyFillColor : this.lifeBarDamagedFillColor;

            game.foregroundContext.fillRect(x, y, this.baseWidth * this.life / this.hitPoints, this.lifeBarHeight);

            game.foregroundContext.strokeStyle = this.lifeBarBorderColor;
            game.foregroundContext.lineWidth = 1;

            game.foregroundContext.strokeRect(x, y, this.baseWidth, this.lifeBarHeight);
        },

        drawSelection: function() {
            let x = this.drawingX + this.pixelOffsetX;
            let y = this.drawingY + this.pixelOffsetY;

            game.foregroundContext.strokeStyle = this.selectionBorderColor;
            game.foregroundContext.lineWidth = 1;
            game.foregroundContext.fillStyle = this.selectionFillColor;

            // Draw a filled rectangle around the building
            game.foregroundContext.fillRect(x - 1, y - 1, this.baseWidth + 2, this.baseHeight + 2);
            game.foregroundContext.strokeRect(x - 1, y - 1, this.baseWidth + 2, this.baseHeight + 2);
        },
    },

    load: loadItem,
    add: addItem,

};
