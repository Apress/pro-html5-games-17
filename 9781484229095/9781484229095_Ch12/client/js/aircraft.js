var aircraft = {
    list: {
        "chopper": {
            name: "chopper",
            cost: 900,
            canConstruct: true,
            pixelWidth: 40,
            pixelHeight: 40,
            pixelOffsetX: 20,
            pixelOffsetY: 20,
            weaponType: "heatseeker",
            radius: 18,
            sight: 6,
            canAttack: true,
            canAttackLand: true,
            canAttackAir: true,
            hitPoints: 50,
            speed: 25,
            turnSpeed: 4,
            pixelShadowHeight: 40,
            spriteImages: [
                { name: "stand", count: 4, directions: 8 }
            ],
        },
        "wraith": {
            name: "wraith",
            cost: 600,
            canConstruct: true,
            pixelWidth: 30,
            pixelHeight: 30,
            canAttack: true,
            canAttackLand: false,
            canAttackAir: true,
            weaponType: "fireball",
            pixelOffsetX: 15,
            pixelOffsetY: 15,
            radius: 15,
            sight: 8,
            speed: 40,
            turnSpeed: 4,
            hitPoints: 50,
            pixelShadowHeight: 40,
            spriteImages: [
                { name: "stand", count: 1, directions: 8 }
            ],
        }
    },

    defaults: {
        type: "aircraft",
        directions: 8,
        canMove: true,

        processActions: function() {
            let direction = Math.round(this.direction) % this.directions;

            switch (this.action) {
                case "stand":

                    this.imageList = this.spriteArray["stand-" + direction];
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

        drawSprite: function() {
            let x = this.drawingX;
            let y = this.drawingY;

            let colorIndex = (this.team === "blue") ? 0 : 1;
            let colorOffset = colorIndex * this.pixelHeight;
            // The aircraft shadow is on the third row of the sprite sheet
            let shadowOffset = this.pixelHeight * 2;

            // Draw the aircraft pixelShadowHeight pixels above its position
            game.foregroundContext.drawImage(this.spriteSheet, this.imageOffset * this.pixelWidth, colorOffset, this.pixelWidth, this.pixelHeight, x, y - this.pixelShadowHeight, this.pixelWidth, this.pixelHeight);

            // Draw the shadow at aircraft position
            game.foregroundContext.drawImage(this.spriteSheet, this.imageOffset * this.pixelWidth, shadowOffset, this.pixelWidth, this.pixelHeight, x, y, this.pixelWidth, this.pixelHeight);

        },

        drawLifeBar: function() {
            let x = this.drawingX;
            let y = this.drawingY - 2 * this.lifeBarHeight - this.pixelShadowHeight;

            game.foregroundContext.fillStyle = (this.lifeCode === "healthy") ? this.lifeBarHealthyFillColor : this.lifeBarDamagedFillColor;
            game.foregroundContext.fillRect(x, y, this.pixelWidth * this.life / this.hitPoints, this.lifeBarHeight);
            game.foregroundContext.strokeStyle = this.lifeBarBorderColor;
            game.foregroundContext.lineWidth = 1;
            game.foregroundContext.strokeRect(x, y, this.pixelWidth, this.lifeBarHeight);
        },

        drawSelection: function() {
            let x = this.drawingX + this.pixelOffsetX;
            let y = this.drawingY + this.pixelOffsetY - this.pixelShadowHeight;

            game.foregroundContext.strokeStyle = this.selectionBorderColor;
            game.foregroundContext.fillStyle = this.selectionFillColor;
            game.foregroundContext.lineWidth = 2;

            // Draw a filled circle around the aircraft
            game.foregroundContext.beginPath();
            game.foregroundContext.arc(x, y, this.radius, 0, Math.PI * 2, false);
            game.foregroundContext.stroke();
            game.foregroundContext.fill();

            // Draw a circle around the aircraft shadow
            game.foregroundContext.beginPath();
            game.foregroundContext.arc(x, y + this.pixelShadowHeight, 4, 0, Math.PI * 2, false);
            game.foregroundContext.stroke();

            // Join the center of the two circles with a line
            game.foregroundContext.beginPath();
            game.foregroundContext.moveTo(x, y);
            game.foregroundContext.lineTo(x, y + this.pixelShadowHeight);
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
                    // Move toward destination until distance from destination is less than aircraft radius
                    if (distanceFromDestination < radius) {
                        this.orders = { type: "stand" };
                    } else {
                        this.moveTo(this.orders.to, distanceFromDestination);
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

                    // Check if aircraft is within sight range of target
                    if (this.isTargetInSight(this.orders.to)) {
                        // Turn toward target and then start attacking when within range of the target
                        var targetDirection = this.findAngleForFiring(this.orders.to);

                        // Turn towards target direction if necessary
                        this.turnTo(targetDirection);

                        // Check if aircraft has finished turning
                        if (!this.turning) {
                            // If reloading has completed, fire bullet
                            if (!this.reloadTimeLeft) {
                                this.reloadTimeLeft = bullets.list[this.weaponType].reloadTime;
                                var angleRadians = -(targetDirection / this.directions) * 2 * Math.PI ;
                                var bulletX = this.x - (this.radius * Math.sin(angleRadians) / game.gridSize);
                                var bulletY = this.y - (this.radius * Math.cos(angleRadians) / game.gridSize) - this.pixelShadowHeight / game.gridSize;

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
        speedAdjustmentWhileTurningFactor: 0.4,

        moveTo: function(destination, distanceFromDestination) {
            // Find out where we need to turn to get to destination
            let newDirection = this.findAngle(destination);

            // Turn towards new direction if necessary
            this.turnTo(newDirection);

            // Calculate maximum distance that aircraft can move per animation cycle
            let maximumMovement = this.speed * this.speedAdjustmentFactor * (this.turning ? this.speedAdjustmentWhileTurningFactor : 1);
            let movement = Math.min(maximumMovement, distanceFromDestination);

            // Calculate x and y components of the movement
            let angleRadians = -(this.direction / this.directions) * 2 * Math.PI;

            this.lastMovementX = -(movement * Math.sin(angleRadians));
            this.lastMovementY = -(movement * Math.cos(angleRadians));

            this.x = this.x + this.lastMovementX;
            this.y = this.y + this.lastMovementY;
        },
    },

    load: loadItem,
    add: addItem,
};

