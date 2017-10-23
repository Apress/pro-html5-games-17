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
                    this.imageOffset = this.imageList.offset + this.animationIndex;
                    this.animationIndex++;

                    if (this.animationIndex >= this.imageList.count) {
                        this.animationIndex = 0;
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
    },

    load: loadItem,
    add: addItem,
};
