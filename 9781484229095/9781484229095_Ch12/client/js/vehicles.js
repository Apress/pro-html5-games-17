var vehicles = {
    list: {
        "transport": {
            name: "transport",
            pixelWidth: 31,
            pixelHeight: 30,
            pixelOffsetX: 15,
            pixelOffsetY: 15,
            radius: 15,
            speed: 15,
            sight: 3,
            cost: 400,
            hitPoints: 100,
            turnSpeed: 3,
            spriteImages: [
                { name: "stand", count: 1, directions: 8 }
            ],
        },
        "harvester": {
            name: "harvester",
            pixelWidth: 21,
            pixelHeight: 20,
            pixelOffsetX: 10,
            pixelOffsetY: 10,
            radius: 10,
            speed: 10,
            sight: 3,
            cost: 1600,
            canConstruct: true,
            hitPoints: 50,
            turnSpeed: 3,
            spriteImages: [
                { name: "stand", count: 1, directions: 8 }
            ],
        },
        "scout-tank": {
            name: "scout-tank",
            canAttack: true,
            canAttackLand: true,
            canAttackAir: false,
            weaponType: "bullet",
            pixelWidth: 21,
            pixelHeight: 21,
            pixelOffsetX: 10,
            pixelOffsetY: 10,
            radius: 11,
            speed: 20,
            sight: 4,
            cost: 500,
            canConstruct: true,
            hitPoints: 50,
            turnSpeed: 5,
            spriteImages: [
                { name: "stand", count: 1, directions: 8 }
            ],
        },
        "heavy-tank": {
            name: "heavy-tank",
            canAttack: true,
            canAttackLand: true,
            canAttackAir: false,
            weaponType: "cannon-ball",
            pixelWidth: 30,
            pixelHeight: 30,
            pixelOffsetX: 15,
            pixelOffsetY: 15,
            radius: 13,
            speed: 15,
            sight: 5,
            cost: 1200,
            canConstruct: true,
            hitPoints: 50,
            turnSpeed: 4,
            spriteImages: [
                { name: "stand", count: 1, directions: 8 }
            ],
        }
    },

    defaults: {
        type: "vehicles",
        directions: 8,
        canMove: true,

        processActions: function() {
            let direction = Math.round(this.direction) % this.directions;

            switch (this.action) {
                case "stand":

                    this.imageList = this.spriteArray["stand-" + direction];
                    if (!this.imageList) {
                        console.log(this.spriteArray, direction)
                    }
                    this.imageOffset = this.imageList.offset + this.animationIndex;
                    this.animationIndex++;

                    if (this.animationIndex >= this.imageList.count) {
                        this.animationIndex = 0;
                    }

                    break;

                case "teleport":

                    this.imageList = this.spriteArray["stand-" + direction];
                    this.imageOffset = this.imageList.offset + this.animationIndex;
                    this.animationIndex++;

                    if (this.animationIndex >= this.imageList.count) {
                        this.animationIndex = 0;
                    }

                    // Initialize the brightness variable when unit is first teleported
                    if (this.brightness === undefined) {
                        this.brightness = 0.6;
                    }

                    this.brightness -= 0.05;

                    // Once brightness gets to zero, clear brightness and just stand normally
                    if (this.brightness <= 0) {
                        this.brightness = undefined;
                        this.action = "stand";
                    }

                    break;
            }
        },

        // Default function for drawing a vehicle
        drawSprite: function() {
            let x = this.drawingX;
            let y = this.drawingY;

            let colorIndex = (this.team === "blue") ? 0 : 1;
            let colorOffset = colorIndex * this.pixelHeight;

            game.foregroundContext.drawImage(this.spriteSheet, this.imageOffset * this.pixelWidth, colorOffset, this.pixelWidth, this.pixelHeight, x, y, this.pixelWidth, this.pixelHeight);
        },

        drawLifeBar: function() {
            let x = this.drawingX;
            let y = this.drawingY - 2 * this.lifeBarHeight;

            game.foregroundContext.fillStyle = (this.lifeCode === "healthy") ? this.lifeBarHealthyFillColor : this.lifeBarDamagedFillColor;

            game.foregroundContext.fillRect(x, y, this.pixelWidth * this.life / this.hitPoints, this.lifeBarHeight);

            game.foregroundContext.strokeStyle = this.lifeBarBorderColor;
            game.foregroundContext.lineWidth = 1;

            game.foregroundContext.strokeRect(x, y, this.pixelWidth, this.lifeBarHeight);
        },

        drawSelection: function() {
            let x = this.drawingX + this.pixelOffsetX;
            let y = this.drawingY + this.pixelOffsetY;

            game.foregroundContext.strokeStyle = this.selectionBorderColor;
            game.foregroundContext.lineWidth = 1;

            // Draw a filled circle around the vehicle
            game.foregroundContext.beginPath();
            game.foregroundContext.arc(x, y, this.radius, 0, Math.PI * 2, false);
            game.foregroundContext.fillStyle = this.selectionFillColor;
            game.foregroundContext.fill();
            game.foregroundContext.stroke();
        },

        processOrders: function() {
            this.lastMovementX = 0;
            this.lastMovementY = 0;

            if (this.orders.to) {
                var distanceFromDestination = Math.pow(Math.pow(this.orders.to.x - this.x, 2) + Math.pow(this.orders.to.y - this.y, 2), 0.5);
                var radius = this.radius / game.gridSize;
            }

            if (this.reloadTimeLeft) {
                this.reloadTimeLeft--;
            }

            var targets;

            switch (this.orders.type) {
                case "move":
                    // Move toward destination until distance from destination is less than vehicle radius
                    if (distanceFromDestination < radius) {
                        // Stop when within on vehicle radius of destination
                        this.orders = { type: "stand" };
                    } else if (this.colliding && distanceFromDestination < 3 * radius) {
                        // Stop when within 3 radius of the destination if colliding with something
                        this.orders = { type: "stand" };
                        break;
                    } else {
                        if (this.colliding && distanceFromDestination < 5 * radius) {
                            // Count collisions within 5 radius distance of goal
                            if (!this.orders.collisionCount) {
                                this.orders.collisionCount = 1;
                            } else {
                                this.orders.collisionCount ++;
                            }

                            // Stop if more than 30 collisions occur
                            if (this.orders.collisionCount > 30) {
                                this.orders = { type: "stand" };
                                break;
                            }
                        }

                        let moving = this.moveTo(this.orders.to, distanceFromDestination);

                        // Pathfinding couldn't find a path so stop
                        if (!moving) {
                            this.orders = { type: "stand" };
                            break;
                        }
                    }

                    break;

                case "deploy":
                    // If oil field has been used already, then cancel order
                    if (this.orders.to.lifeCode === "dead") {
                        this.orders = { type: "stand" };

                        return;
                    }

                    if (distanceFromDestination < radius + 1) {
                        // After reaching within 1 square of oil field, turn harvester to point towards left (direction 6)
                        this.turnTo(6);

                        if (!this.turning) {
                            // If oil field has been used already, then cancel order
                            if (this.orders.to.lifeCode === "dead") {
                                this.orders = { type: "stand" };

                                return;
                            }

                            // Once it is pointing to the left, remove the harvester and oil field and deploy a harvester building
                            game.remove(this.orders.to);
                            this.orders.to.lifeCode = "dead";

                            game.remove(this);
                            this.lifeCode = "dead";

                            game.add({ type: "buildings", name: "harvester", x: this.orders.to.x, y: this.orders.to.y, action: "deploy", team: this.team });
                        }
                    } else {
                        let moving = this.moveTo(this.orders.to, distanceFromDestination);

                        // Pathfinding couldn't find a path so stop
                        if (!moving) {
                            this.orders = { type: "stand" };
                        }
                    }

                    break;

                case "stand":
                    // Look for targets that are within sight range
                    targets = this.findTargetsInSight();

                    if (targets.length > 0) {
                        this.orders = { type: "attack", to: targets[0] };
                    }

                    break;

                case "sentry":
                    // Look for targets upto 2 squares beyond sight range
                    targets = this.findTargetsInSight(2);

                    if (targets.length > 0) {
                        this.orders = { type: "attack", to: targets[0], previousOrder: this.orders };
                    }

                    break;

                case "hunt":
                    // Look for targets anywhere on the map
                    targets = this.findTargetsInSight(100);

                    if (targets.length > 0) {
                        this.orders = { type: "attack", to: targets[0], previousOrder: this.orders };
                    }

                    break;

                case "attack":
                    // If the target is no longer valid, cancel the current order
                    if (!this.isValidTarget(this.orders.to)) {
                        this.cancelCurrentOrder();
                        break;
                    }

                    // Check if vehicle is within sight range of target
                    if (this.isTargetInSight(this.orders.to)) {
                        // Turn toward target and then start attacking when within range of the target
                        var targetDirection = this.findAngleForFiring(this.orders.to);

                        // Turn towards target direction if necessary
                        this.turnTo(targetDirection);

                        // Check if vehicle has finished turning
                        if (!this.turning) {
                            // If reloading has completed, fire bullet
                            if (!this.reloadTimeLeft) {
                                this.reloadTimeLeft = bullets.list[this.weaponType].reloadTime;
                                var angleRadians = -(targetDirection / this.directions) * 2 * Math.PI ;
                                var bulletX = this.x - (this.radius * Math.sin(angleRadians) / game.gridSize);
                                var bulletY = this.y - (this.radius * Math.cos(angleRadians) / game.gridSize);

                                game.add({ name: this.weaponType, type: "bullets", x: bulletX, y: bulletY, direction: targetDirection, target: this.orders.to });
                            }
                        }

                    } else {
                        // Move towards the target
                        this.moveTo(this.orders.to, distanceFromDestination);
                    }

                    break;

                case "patrol":
                    targets = this.findTargetsInSight(1);

                    if (targets.length > 0) {
                        // Attack the target, but save the patrol order as previousOrder
                        this.orders = { type: "attack", to: targets[0], previousOrder: this.orders };
                        break;
                    }

                    // Move toward destination until it is inside of sight range
                    if (distanceFromDestination < this.sight) {
                        // Swap to and from locations
                        var to = this.orders.to;

                        this.orders.to = this.orders.from;
                        this.orders.from = to;

                    } else {
                        // Move towards the next destination
                        this.moveTo(this.orders.to, distanceFromDestination);
                    }

                    break;

                case "guard":
                    // If the item being guarded is dead, cancel the current order
                    if (this.orders.to.lifeCode === "dead") {
                        this.cancelCurrentOrder();
                        break;
                    }

                    // If the target is inside of sight range
                    if (distanceFromDestination < this.sight) {
                        // Find any enemies near
                        targets = this.findTargetsInSight(1);
                        if (targets.length > 0) {
                            // Attack the nearest target, but save the guard order as previousOrder
                            this.orders = { type: "attack", to: targets[0], previousOrder: this.orders };
                            break;
                        }
                    } else {
                        // Move towards the target
                        this.moveTo(this.orders.to, distanceFromDestination);
                    }

                    break;
            }
        },

        // How slow should unit move while turning
        speedAdjustmentWhileTurningFactor: 0.5,

        moveTo: function(destination, distanceFromDestination) {

            let start = [Math.floor(this.x), Math.floor(this.y)];
            let end = [Math.floor(destination.x), Math.floor(destination.y)];

            // Direction that we will need to turn to reach destination
            let newDirection;

            let vehicleOutsideMapBounds = (start[1] < 0 || start[1] > game.currentMap.mapGridHeight - 1 || start[0] < 0 || start[0] > game.currentMap.mapGridWidth);
            let vehicleReachedDestinationTile = (start[0] === end[0] && start[1] === end[1]);

            // Rebuild the passable grid if needed
            if (!game.currentMapPassableGrid) {
                game.rebuildPassableGrid();
            }

            if (vehicleOutsideMapBounds || vehicleReachedDestinationTile) {
                // Don't use A*. Just turn towards destination.
                newDirection = this.findAngle(destination);

                this.orders.path = [[this.x, this.y], [destination.x, destination.y]];
            } else {
                // Use A* to try and find a path to the destination
                let grid;

                if (destination.type === "buildings" || destination.type === "terrain") {
                    // In case of buildings or terrain, modify the grid slightly so algorithm can find a path
                    // First copy the passable grid
                    grid = game.makeArrayCopy(game.currentMapPassableGrid);
                    // Then modify the destination to be "passable"
                    grid[Math.floor(destination.y)][Math.floor(destination.x)] = 0;
                } else {
                    // In all other cases just use the passable grid
                    grid = game.currentMapPassableGrid;
                }

                this.orders.path = AStar(grid, start, end, "Euclidean");

                if (this.orders.path.length > 1) {
                    // The next step is the center of the next path item
                    let nextStep = { x: this.orders.path[1][0] + 0.5, y: this.orders.path[1][1] + 0.5 };

                    newDirection = this.findAngle(nextStep);
                } else {
                    // Let the calling function know that there is no path
                    return false;
                }
            }

            // Collision handling and steering
            let collisionObjects = this.checkForCollisions(game.currentMapPassableGrid);

            // Moving along the present path will cause a collision
            if (this.colliding) {
                newDirection = this.steerAwayFromCollisions(collisionObjects);
            }

            // Turn towards new direction if necessary
            this.turnTo(newDirection);

            // Calculate maximum distance that vehicle can move per animation cycle
            let maximumMovement = this.speed * this.speedAdjustmentFactor * (this.turning ? this.speedAdjustmentWhileTurningFactor : 1);
            let movement = Math.min(maximumMovement, distanceFromDestination);

            // Don't move forward if we are in a hard collision
            if (this.hardCollision) {
                movement = -movement * 0.5;
            }

            // Calculate x and y components of the movement
            let angleRadians = -(this.direction / this.directions) * 2 * Math.PI;

            this.lastMovementX = -(movement * Math.sin(angleRadians));
            this.lastMovementY = -(movement * Math.cos(angleRadians));

            this.x = this.x + this.lastMovementX;
            this.y = this.y + this.lastMovementY;

            // Let the calling function know that we were able to move
            return true;
        },

        // Make a list of collisions that the vehicle will have if it goes along present path
        checkForCollisions: function(grid) {
            // Calculate new position on present path at maximum speed
            let movement = this.speed * this.speedAdjustmentFactor;
            let angleRadians = -(this.direction / this.directions) * 2 * Math.PI;
            let newX = this.x - (movement * Math.sin(angleRadians));
            let newY = this.y - (movement * Math.cos(angleRadians));

            this.colliding = false;
            this.hardCollision = false;

            // List of objects that will collide after next movement step
            let collisionObjects = [];

            // Test for collision with grid upto 3 squares away from this vehicle
            let x1 = Math.max(0, Math.floor(newX) - 3);
            let x2 = Math.min(game.currentMap.mapGridWidth - 1, Math.floor(newX) + 3);
            let y1 = Math.max(0, Math.floor(newY) - 3);
            let y2 = Math.min(game.currentMap.mapGridHeight - 1, Math.floor(newY) + 3);

            let gridHardCollisionThreshold = Math.pow(this.radius * 0.9 / game.gridSize, 2);
            let gridSoftCollisionThreshold = Math.pow(this.radius * 1.1 / game.gridSize, 2);

            for (let j = x1; j <= x2;j++) {
                for (let i = y1; i <= y2 ;i++) {
                    if (grid[i][j] === 1) { // Grid square is obstructed

                        let distanceSquared = Math.pow(j + 0.5 - newX, 2) + Math.pow(i + 0.5 - newY, 2);

                        if (distanceSquared < gridHardCollisionThreshold) {
                            // Distance of obstructed grid from vehicle is less than hard collision threshold
                            collisionObjects.push({ collisionType: "hard", with: { type: "wall", x: j + 0.5, y: i + 0.5 } });

                            this.colliding = true;
                            this.hardCollision = true;

                        } else if (distanceSquared < gridSoftCollisionThreshold) {
                            // Distance of obstructed grid from vehicle is less than soft collision threshold
                            collisionObjects.push({ collisionType: "soft", with: { type: "wall", x: j + 0.5, y: i + 0.5 } });

                            this.colliding = true;
                        }
                    }
                }
            }

            for (let i = game.vehicles.length - 1; i >= 0; i--) {
                let vehicle = game.vehicles[i];

                // Test vehicles that are less than 3 squares away for collisions
                if (vehicle !== this && Math.abs(vehicle.x - this.x) < 3 && Math.abs(vehicle.y - this.y) < 3) {
                    if (Math.pow(vehicle.x - newX, 2) + Math.pow(vehicle.y - newY, 2) < Math.pow((this.radius + vehicle.radius) / game.gridSize, 2)) {
                        // Distance between vehicles is less than hard collision threshold (sum of vehicle radii)
                        collisionObjects.push({ collisionType: "hard", with: vehicle });

                        this.colliding = true;
                        this.hardCollision = true;

                    } else if (Math.pow(vehicle.x - newX, 2) + Math.pow(vehicle.y - newY, 2) < Math.pow((this.radius * 1.5 + vehicle.radius) / game.gridSize, 2)) {
                        // Distance between vehicles is less than soft collision threshold (1.5 times vehicle radius + colliding vehicle radius)
                        collisionObjects.push({ collisionType: "soft", with: vehicle });

                        this.colliding = true;
                    }
                }
            }

            return collisionObjects;
        },

        // Find a direction that steers away from the collision objects
        steerAwayFromCollisions: function(collisionObjects) {
            // Create a force vector object that adds up repulsion from all colliding objects
            let forceVector = { x: 0, y: 0 };

            // By default, the next step has a mild attraction force
            collisionObjects.push({ collisionType: "attraction", with: { x: this.orders.path[1][0] + 0.5, y: this.orders.path[1][1] + 0.5 } });

            for (let i = collisionObjects.length - 1; i >= 0; i--) {
                let collObject = collisionObjects[i];
                let objectAngle = this.findAngle(collObject.with);
                let objectAngleRadians = -(objectAngle / this.directions) * 2 * Math.PI;
                let forceMagnitude;

                switch (collObject.collisionType) {
                    case "hard":
                        forceMagnitude = 2;
                        break;
                    case "soft":
                        forceMagnitude = 1;
                        break;
                    case "attraction":
                        forceMagnitude = -0.25;
                        break;
                }

                forceVector.x += (forceMagnitude * Math.sin(objectAngleRadians));
                forceVector.y += (forceMagnitude * Math.cos(objectAngleRadians));
            }


            // Find a new direction based on the force vector
            let newDirection = this.directions / 2 - (Math.atan2(forceVector.x, forceVector.y) * this.directions / (2 * Math.PI));

            newDirection = (newDirection + this.directions) % this.directions;

            return newDirection;
        },

    },

    load: loadItem,
    add: addItem,
};
