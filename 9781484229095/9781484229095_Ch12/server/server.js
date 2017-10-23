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

}

function sendRoomWebSocketMessage(room, messageObject) {
    var messageString = JSON.stringify(messageObject);

    room.players.forEach(function(player) {
        player.connection.send(messageString);
    });
}