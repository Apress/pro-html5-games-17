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
    },

    load: loadItem,
    add: addItem,
};

