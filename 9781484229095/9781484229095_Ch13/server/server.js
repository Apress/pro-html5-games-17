// Create an HTTP Server
var http = require("http");

// Create a simple web server that returns the same response for any request
var server = http.createServer(function(request, response) {
    console.log("Received HTTP request for URL", request.url);

    response.writeHead(200, { "Content-Type": "text/plain" });
    response.end("This is a simple node.js HTTP server.");
});

// Listen on port 8080
server.listen(8080, function() {
    console.log("Server has started listening on port 8080");
});

// Attach WebSocket Server to HTTP Server
var WebSocketServer = require("websocket").server;
var wsServer = new WebSocketServer({
    httpServer: server,
    autoAcceptConnections: false
});

// Initialize a set of 10 rooms
var gameRooms = [];

for (var i = 0; i < 10; i++) {
    gameRooms.push({ status: "empty", players: [], roomId: i + 1 });
}

// Store all the players currently connected to the server
var players = [];

wsServer.on("request", function(request) {

    var connection = request.accept();

    console.log("Connection from " + request.remoteAddress + " accepted.");

    // Add the player to the players array
    var player = {
        connection: connection,
        latencyTrips: []
    };

    players.push(player);

    // Send a fresh game room status list the first time player connects
    sendRoomList(connection);

    // Measure latency for player
    measureLatencyStart(player);

    // Handle receiving of messages
    connection.on("message", function(message) {
        if (message.type === "utf8") {
            var clientMessage = JSON.parse(message.utf8Data);

            // Handle Message based on message type
            switch (clientMessage.type) {
                case "join-room":
                    joinRoom(player, clientMessage.roomId);
                    sendRoomListToEveryone();

                    if (player.room.players.length === 2) {
                        // Two players have joined. Initialize the game
                        initializeGame(player.room);
                    }

                    break;

                case "leave-room":
                    leaveRoom(player, clientMessage.roomId);
                    sendRoomListToEveryone();
                    break;

                case "initialized-level":
                    player.room.playersReady++;

                    if (player.room.playersReady === 2) {
                        // Both players are ready, Start the game
                        startGame(player.room);
                    }

                    break;

                case "latency-pong":
                    measureLatencyEnd(player);

                    // Measure latency at least thrice
                    if (player.latencyTrips.length < 3) {
                        measureLatencyStart(player);
                    }
                    break;

                case "command":
                    if (player.room && player.room.status === "running") {
                        if (clientMessage.uids) {
                            player.room.commands.push({ uids: clientMessage.uids, details: clientMessage.details });
                        }

                        player.room.lastTickConfirmed[player.color] = clientMessage.currentTick + player.tickLag;
                    }
                    break;

                case "lose-game":
                    if (player.room && player.room.status === "running") {
                        endGame(player.room, "The " + player.color + " team has been defeated.");
                    }
                    break;

                case "chat":
                    if (player.room && player.room.status === "running") {
                        // Sanitize the message to remove any HTML tags
                        var cleanedMessage = clientMessage.message.replace(/[<>]/g, "");

                        sendRoomWebSocketMessage(player.room, { type: "chat", from: player.color, message: cleanedMessage });
                    }
                    break;
            }
        }
    });

    // Handle closing of connection
    connection.on("close", function() {
        console.log("Connection from " + request.remoteAddress + " disconnected.");

        // Remove the player from the players array
        var index = players.indexOf(player);

        if (index > -1) {
            players.splice(index, 1);
        }

        var room = player.room;

        if (room) {
            var status = room.status;

            // If the player was in a room, remove him from the room
            leaveRoom(player, room.roomId);

            // If the game had started or was already running, end the game and notify other player
            if (status === "running" || status === "starting") {
                var message = "The " + player.color + " player has been disconnected.";

                endGame(room, message);
            }

            // Notify everyone about the changes
            sendRoomListToEveryone();
        }

    });

    // Handle closing of connection
    connection.on("close", function() {
        console.log("Connection from " + request.remoteAddress + " disconnected.");

        // Remove the player from the players array
        var index = players.indexOf(player);

        if (index > -1) {
            players.splice(index, 1);
        }

        var room = player.room;

        if (room) {
            // If the player was in a room, remove him from the room
            leaveRoom(player, room.roomId);

            // Notify everyone about the changes
            sendRoomListToEveryone();
        }
    });
});

function getRoomListMessageString() {
    var roomList = [];

    for (var i = 0; i < gameRooms.length; i++) {
        roomList.push(gameRooms[i].status);
    }

    var message = { type: "room-list", roomList: roomList };
    var messageString = JSON.stringify(message);

    return messageString;
}

function sendRoomList(connection) {
    var messageString = getRoomListMessageString();

    connection.send(messageString);
}

function sendRoomListToEveryone() {
    var messageString = getRoomListMessageString();

    // Notify all connected players of the room status changes
    players.forEach(function(player) {
        player.connection.send(messageString);
    });
}

function joinRoom(player, roomId) {
    var room = gameRooms[roomId - 1];

    console.log("Adding player to room", roomId);
    // Add the player to the room
    room.players.push(player);
    player.room = room;

    // Update room status and choose player color (blue for first player, green for the second)
    if (room.players.length === 1) {
        room.status = "waiting";
        player.color = "blue";
    } else if (room.players.length === 2) {
        room.status = "starting";
        player.color = "green";
    }

    // Confirm to player that he was added
    var confirmationMessage = { type: "joined-room", roomId: roomId, color: player.color };
    var confirmationMessageString = JSON.stringify(confirmationMessage);

    player.connection.send(confirmationMessageString);

    return room;
}

function leaveRoom(player, roomId) {
    var room = gameRooms[roomId - 1];

    console.log("Removing player from room", roomId);

    // Remove the player from the players array
    var index = room.players.indexOf(player);

    if (index > -1) {
        room.players.splice(index, 1);
    }

    delete player.room;

    // Update room status
    if (room.players.length === 0) {
        room.status = "empty";
    } else if (room.players.length === 1) {
        room.status = "waiting";
    }
}

function initializeGame(room) {
    console.log("Both players Joined. Initializing game for Room " + room.roomId);

    // Number of players who have loaded the level
    room.playersReady = 0;

    // Load the first multiplayer level for both players
    // This logic can change later to let the players pick a level
    var currentLevel = 0;

    // Randomly select two spawn locations between 0 and 3 for both players.
    var spawns = [0, 1, 2, 3];
    var spawnLocations = { "blue": spawns.splice(Math.floor(Math.random() * spawns.length), 1), "green": spawns.splice(Math.floor(Math.random() * spawns.length), 1) };

    sendRoomWebSocketMessage(room, { type: "initialize-level", spawnLocations: spawnLocations, currentLevel: currentLevel });
}

function startGame(room) {
    console.log("Both players are ready. Starting game in room", room.roomId);

    room.status = "running";
    sendRoomListToEveryone();
    // Notify players to start the game
    sendRoomWebSocketMessage(room, { type: "play-game" });

    room.commands = [];
    room.lastTickConfirmed = { "blue": 0, "green": 0 };
    room.currentTick = 0;

        // Calculate tick lag for room as the max of both player's tick lags
    var roomTickLag = Math.max(room.players[0].tickLag, room.players[1].tickLag);

    room.interval = setInterval(function() {
        // Confirm that both players have send in commands for up to present tick
        if (room.lastTickConfirmed["blue"] >= room.currentTick && room.lastTickConfirmed["green"] >= room.currentTick) {
            // Commands should be executed after the tick lag
            sendRoomWebSocketMessage(room, { type: "game-tick", tick: room.currentTick + roomTickLag, commands: room.commands });
            room.currentTick++;
            room.commands = [];
        } else {
            // One of the players is causing the game to lag. Handle appropriately
            if (room.lastTickConfirmed["blue"] < room.currentTick) {
                console.log("Room", room.roomId, "Blue is lagging on Tick:", room.currentTick, "by", room.currentTick - room.lastTickConfirmed["blue"]);
            }

            if (room.lastTickConfirmed["green"] < room.currentTick) {
                console.log("Room", room.roomId, "Green is lagging on Tick:", room.currentTick, "by", room.currentTick - room.lastTickConfirmed["green"]);
            }
        }
    }, gameTimeout);
}

function sendRoomWebSocketMessage(room, messageObject) {
    var messageString = JSON.stringify(messageObject);

    room.players.forEach(function(player) {
        player.connection.send(messageString);
    });
}

function measureLatencyStart(player) {
    var measurement = { start: Date.now() };

    player.latencyTrips.push(measurement);

    var clientMessage = { type: "latency-ping" };

    player.connection.send(JSON.stringify(clientMessage));
}

// The game clock will run at 1 tick every 100 milliseconds
var gameTimeout = 100;

function measureLatencyEnd(player) {
    // Complete the calculations for the current measuremement
    var currentMeasurement = player.latencyTrips[player.latencyTrips.length - 1];

    currentMeasurement.end = Date.now();
    currentMeasurement.roundTrip = currentMeasurement.end - currentMeasurement.start;

    // Calculate the average round trip for all the trips so far
    var totalTime = 0;

    player.latencyTrips.forEach(function (measurement) {
        totalTime += measurement.roundTrip;
    });

    player.averageRoundTrip = totalTime / player.latencyTrips.length;

    // By default game commands are run one tick after they are received by the server
    player.tickLag = 1;

    // If averageRoundTrip is greater than gameTimeout, increase tickLag to adjust for latency
    player.tickLag += Math.round(player.averageRoundTrip / gameTimeout);

    console.log("Measuring Latency for player. Attempt", player.latencyTrips.length, "- Average Round Trip:", player.averageRoundTrip + "ms", "Tick Lag:", player.tickLag);
}

function endGame(room, message) {
    // Stop the game loop on the server
    clearInterval(room.interval);

    // Tell both players to end game
    sendRoomWebSocketMessage(room, { type: "end-game", message: message });

    // Empty the room
    room.players.forEach(function(player) {
        leaveRoom(player, room.roomId);
    });
    room.status = "empty";

    sendRoomListToEveryone();
}