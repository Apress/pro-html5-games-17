var multiplayer = {

    // Open multiplayer game lobby
    websocket: undefined,
    start: function() {
        if (!window.WebSocket) {
            game.showMessageBox("Your browser does not support WebSocket. Multiplayer will not work.");

            return;
        }

        const websocketUrl = "ws://" + (window.location.hostname || "localhost") + ":8080";

        this.websocket = new WebSocket(websocketUrl);

        this.websocket.addEventListener("open", multiplayer.handleWebSocketOpen);
        this.websocket.addEventListener("message", multiplayer.handleWebSocketMessage);

        this.websocket.addEventListener("close", multiplayer.handleWebSocketConnectionError);
        this.websocket.addEventListener("error", multiplayer.handleWebSocketConnectionError);
    },

    // Display an error message and end game in case of a connection error
    handleWebSocketConnectionError: function() {
        multiplayer.endGame("Error connecting to multiplayer server.");
    },

    // Display multiplayer lobby screen after connection is opened
    handleWebSocketOpen: function() {
        game.hideScreens();
        game.showScreen("multiplayerlobbyscreen");
    },

    handleWebSocketMessage: function(message) {
        var messageObject = JSON.parse(message.data);

        switch (messageObject.type) {
            case "room-list":
                multiplayer.updateRoomStatus(messageObject.roomList);
                break;

            case "joined-room":
                multiplayer.roomId = messageObject.roomId;
                multiplayer.color = messageObject.color;
                break;

            case "initialize-level":
                multiplayer.currentLevel = messageObject.currentLevel;
                multiplayer.initLevel(messageObject.spawnLocations);
                break;

            case "play-game":
                multiplayer.play();
                break;

            case "latency-ping":
                multiplayer.sendWebSocketMessage({ type: "latency-pong" });
                break;

            case "game-tick":
                multiplayer.lastReceivedTick = messageObject.tick;
                multiplayer.commands[messageObject.tick] = messageObject.commands;
                break;

            case "end-game":
                multiplayer.endGame(messageObject.message);
                break;

            case "chat":
                game.showMessage(messageObject.from, messageObject.message);
                break;
        }
    },

    statusMessages: {
        "starting": "Game Starting",
        "running": "Game in Progress",
        "waiting": "Waiting for second player",
        "empty": "Open"
    },

    selectRow: function(index) {
        var list = document.getElementById("multiplayergameslist");

        // Remove any existing selected rows
        for (let i = list.rows.length - 1; i >= 0; i--) {
            let row = list.rows[i];

            row.classList.remove("selected");
        }

        list.selectedIndex = index;
        let row = list.rows[index];

        list.value = row.cells[0].value;
        row.classList.add("selected");
    },

    updateRoomStatus: function(roomList) {
        var list = document.getElementById("multiplayergameslist");

        // Clear all the old options
        for (let i = list.rows.length - 1; i >= 0; i--) {
            list.deleteRow(i);
        }

        roomList.forEach(function(status, index) {
            let statusMessage = multiplayer.statusMessages[status];
            let roomId = index + 1;
            let label = "Game " + roomId + ". " + statusMessage;

            // Create a new option for the room
            let row = document.createElement("tr");
            let cell = document.createElement("td");

            cell.innerHTML = label;
            cell.value = roomId;

            row.appendChild(cell);

            row.addEventListener("click", function() {
                if (!list.disabled && !row.disabled) {
                    multiplayer.selectRow(index);
                }
            });

            row.className = status;

            list.appendChild(row);


            // Disable rooms that are running or starting
            if (status === "running" || status === "starting") {
                row.disabled = true;
            }

            // In case multiplayer.roomId is set, select the room with that roomId and unselect others
            if (multiplayer.roomId === roomId) {
                this.selectRow(index);
            }

        }, this);

    },

    join: function() {
        var selectedRoom = document.getElementById("multiplayergameslist").value;

        if (selectedRoom) {
            // If a room has been selected, try to join the room
            multiplayer.sendWebSocketMessage({ type: "join-room", roomId: selectedRoom });

            // Disable room list and join button
            document.getElementById("multiplayergameslist").disabled = true;
            document.getElementById("multiplayerjoin").disabled = true;
        } else {
            // Otherwise ask player to select a room first
            game.showMessageBox("Please select a game room to join.");
        }
    },

    cancel: function() {
        if (multiplayer.roomId) {
            // If the player is in a room, cancel will just leave the room
            multiplayer.sendWebSocketMessage({ type: "leave-room", roomId: multiplayer.roomId });
            document.getElementById("multiplayergameslist").disabled = false;
            document.getElementById("multiplayerjoin").disabled = false;

            // Clear roomId and color
            delete multiplayer.roomId;
            delete multiplayer.color;
        } else {
            // If the player is not in a room, leave the multiplayer screen itself
            multiplayer.closeAndExit();
        }
    },

    closeAndExit: function() {
        // Clear all handlers and close connection
        multiplayer.websocket.removeEventListener("open", multiplayer.handleWebSocketOpen);
        multiplayer.websocket.removeEventListener("message", multiplayer.handleWebSocketMessage);

        multiplayer.websocket.removeEventListener("close", multiplayer.handleWebSocketConnectionError);
        multiplayer.websocket.removeEventListener("error", multiplayer.handleWebSocketConnectionError);

        multiplayer.websocket.close();

        // Enable room list and join button
        document.getElementById("multiplayergameslist").disabled = false;
        document.getElementById("multiplayerjoin").disabled = false;

        // Show the starting menu layer
        game.hideScreens();
        game.showScreen("gamestartscreen");
    },

    sendWebSocketMessage: function(messageObject) {
        var messageString = JSON.stringify(messageObject);

        this.websocket.send(messageString);
    },

    currentLevel: 0,
    initLevel: function(spawnLocations) {
        game.type = "multiplayer";
        game.team = multiplayer.color;

        // Load all the items for the level
        var level = levels.multiplayer[multiplayer.currentLevel];

        game.loadLevelData(level);

        fog.initLevel();

        // Initialize multiplayer related variables
        multiplayer.commands = [[]];
        multiplayer.lastReceivedTick = 0;
        multiplayer.currentTick = 0;

        // Add starting items for both teams at their respective spawn locations
        for (let team in spawnLocations) {
            let spawnIndex = spawnLocations[team];

            for (let i = 0; i < level.teamStartingItems.length; i++) {
                let itemDetails = Object.assign({}, level.teamStartingItems[i]);

                // Position item at spawn location
                itemDetails.x += level.spawnLocations[spawnIndex].x;
                itemDetails.y += level.spawnLocations[spawnIndex].y;
                itemDetails.team = team;

                game.add(itemDetails);
            }
        }

        // Position current player at correct spanw offset location
        let spawnIndex = spawnLocations[game.team];

        game.offsetX = level.spawnLocations[spawnIndex].startX * game.gridSize;
        game.offsetY = level.spawnLocations[spawnIndex].startY * game.gridSize;

        game.createTerrainGrid();

        // Notify the server once all assets have been loaded
        loader.onload = function() {
            multiplayer.sendWebSocketMessage({ type: "initialized-level" });
        };

    },

    play: function() {
        // Run the animation loop once
        game.animationLoop();

        // Instead of animationLoop, use tickLoop, which will coordinate with the server to call animationLoop
        multiplayer.animationInterval = setInterval(multiplayer.tickLoop, game.animationTimeout);

        game.start();
    },

    sendCommand: function(uids, details) {
        multiplayer.sentCommandForTick = true;
        multiplayer.sendWebSocketMessage({ type: "command", uids: uids, details: details, currentTick: multiplayer.currentTick });
    },

    tickLoop: function() {
        // If the commands for that tick have been received
        // execute the commands and move on to the next tick
        // otherwise wait for server to catch up
        if (multiplayer.currentTick <= multiplayer.lastReceivedTick) {
            var commands = multiplayer.commands[multiplayer.currentTick];

            if (commands) {
                for (var i = 0; i < commands.length; i++) {
                    game.processCommand(commands[i].uids, commands[i].details);
                }
            }

            game.animationLoop();

            // In case no command was sent for this current tick, send an empty command to the server
            // So that the server knows that everything is working smoothly
            if (!multiplayer.sentCommandForTick) {
                multiplayer.sendCommand();
            }

            // Move on to the next tick
            multiplayer.currentTick++;
            multiplayer.sentCommandForTick = false;
        }
    },

    loseGame: function() {
        multiplayer.sendWebSocketMessage({ type: "lose-game" });
    },

    endGame: function(message) {
        game.running = false;
        clearInterval(multiplayer.animationInterval);

        // Show reason for game ending, and on OK, exit multiplayer screen
        game.showMessageBox(message, multiplayer.closeAndExit);
    },

    sendChatMessage: function(message) {
        multiplayer.sendWebSocketMessage({ type: "chat", message: message });
    }
};
