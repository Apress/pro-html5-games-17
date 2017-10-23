var sidebar = {

    init: function() {
        this.cash = document.getElementById("cash");

        let buttons = document.getElementById("sidebarbuttons").getElementsByTagName("input");

        Array.prototype.forEach.call(buttons, function(button) {
            button.addEventListener("click", function() {
                // The input button id is the name of the object that needs to be constructed
                let name = this.id;
                let details = sidebar.constructables[name];

                if (details.type === "buildings") {
                    sidebar.constructBuilding(details);
                } else {
                    sidebar.constructInStarport(details);
                }
            });
        });
    },

    animate: function() {
        // Display the current cash balance value
        this.updateCash(game.cash[game.team]);

        // Enable buttons if player has sufficient cash and has the correct building selected
        this.enableSidebarButtons();

        // If sidebar is in deployBuilding mode, check whether building can be placed
        if (this.deployBuilding) {
            this.checkBuildingPlacement();
        }
    },

    // Cache the value to avoid unnecessary DOM updates
    _cash: undefined,
    updateCash: function(cash) {
        // Only update the DOM value if it is different from cached value
        if (this._cash !== cash) {
            this._cash = cash;
            // Display the cash amount with commas
            this.cash.innerHTML = cash.toLocaleString();
        }
    },

    constructables: undefined,
    initRequirementsForLevel: function() {
        this.constructables = {};
        let constructableTypes = ["buildings", "vehicles", "aircraft"];

        constructableTypes.forEach(function(type) {
            for (let name in window[type].list) {
                let details = window[type].list[name];
                let isInRequirements = game.currentLevel.requirements[type].indexOf(name) > -1;

                if (details.canConstruct) {
                    sidebar.constructables[name] = {
                        name: name,
                        type: type,
                        permitted: isInRequirements,
                        cost: details.cost,
                        constructedIn: (type === "buildings") ? "base" : "starport"
                    };
                }
            }
        });
    },

    enableSidebarButtons: function() {
        let cashBalance = game.cash[game.team];

        // Check if player has a base or starport selected
        let baseSelected = false;
        let starportSelected = false;

        game.selectedItems.forEach(function(item) {
            if (item.team === game.team && item.lifeCode === "healthy" && item.action === "stand") {
                if (item.name === "base") {
                    baseSelected = true;
                } else if (item.name === "starport") {
                    starportSelected = true;
                }
            }
        });

        for (let name in this.constructables) {
            let item = this.constructables[name];
            let button = document.getElementById(name);

            // Does player have sufficient money to buy item
            let sufficientMoney = cashBalance >= item.cost;
            // Does the player have the appropriate building selected?
            let correctBuilding = (baseSelected && item.constructedIn === "base")
                || (starportSelected && item.constructedIn === "starport");

            button.disabled = !(item.permitted && sufficientMoney && correctBuilding);

        }
    },

    constructInStarport: function(details) {

        // Search for a selected starport which can construct the unit
        let starport;

        for (let i = game.selectedItems.length - 1; i >= 0; i--) {
            let item = game.selectedItems[i];

            if (item.name === "starport" && item.team === game.team
                && item.lifeCode === "healthy" && item.action === "stand") {

                starport = item;
                break;
            }
        }

        // If an eligible starport is found, tell it to make the unit
        if (starport) {
            game.sendCommand([starport.uid], { type: "construct-unit", details: details });
        }
    },

    constructBuilding: function(details) {
        sidebar.deployBuilding = details;
    },

    checkBuildingPlacement: function() {

        let name = sidebar.deployBuilding.name;
        let details = buildings.list[name];

        // Create a buildable grid to identify where building can be placed
        game.rebuildBuildableGrid();

        // Use buildableGrid to identify whether we can place the building
        let canDeployBuilding = true;
        let placementGrid = game.makeArrayCopy(details.buildableGrid);

        for (let y = placementGrid.length - 1; y >= 0; y--) {
            for (let x = placementGrid[y].length - 1; x >= 0; x--) {

                // If a tile needs to be buildable for the building
                if (placementGrid[y][x] === 1) {
                    // Check whether the tile is inside the map and buildable
                    if (mouse.gridY + y >= game.currentMap.mapGridHeight
                    || mouse.gridX + x >= game.currentMap.mapGridWidth
                    || game.currentMapBuildableGrid[mouse.gridY + y][mouse.gridX + x]) {
                        // Otherwise mark tile as unbuildable
                        canDeployBuilding = false;
                        placementGrid[y][x] = 2;
                    }
                }
            }
        }

        sidebar.placementGrid = placementGrid;
        sidebar.canDeployBuilding = canDeployBuilding;

    },

    cancelDeployingBuilding: function() {
        sidebar.deployBuilding = undefined;
        sidebar.placementGrid = undefined;
        sidebar.canDeployBuilding = false;
    },

    finishDeployingBuilding: function() {
        // Search for a selected base which can construct the unit
        let base;

        for (let i = game.selectedItems.length - 1; i >= 0; i--) {
            let item = game.selectedItems[i];


            if (item.name === "base" && item.team === game.team
                && item.lifeCode === "healthy" && item.action === "stand") {

                base = item;
                break;
            }
        }

        // If an eligible base is found, tell it to make the unit
        if (base) {
            let name = sidebar.deployBuilding.name;
            let details = {
                name: name,
                type: "buildings",
                x: mouse.gridX,
                y: mouse.gridY
            };

            game.sendCommand([base.uid], { type: "construct-building", details: details });
        }

        // Clear deploy building variables
        sidebar.cancelDeployingBuilding();

    },

};