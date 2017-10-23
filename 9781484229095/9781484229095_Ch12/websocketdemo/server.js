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
    httpServer: server
});

// Logic to determine whether a specified connection is allowed.
function connectionIsAllowed(request) {
    // Check criteria such as request.origin, request.remoteAddress
    // Return false to prevent connection, true to allow connection
    return true;
}

// Handle WebSocket Connection Requests
wsServer.on("request", function(request) {
    // Reject requests based on certain criteria
    if (!connectionIsAllowed(request)) {
        request.reject();
        console.log("WebSocket Connection from " + request.remoteAddress + " rejected.");

        return;
    }

    // Accept Connection
    var websocket = request.accept();

    console.log("WebSocket Connection from " + request.remoteAddress + " accepted.");
    websocket.send("Hi there. You are now connected to the WebSocket Server");

    websocket.on("message", function(message) {
        if (message.type === "utf8") {
            console.log("Received Message: " + message.utf8Data);
            websocket.send("Server received your message: " + message.utf8Data);
        }
    });

    websocket.on("close", function(reasonCode, description) {
        console.log("WebSocket Connection from " + request.remoteAddress + " closed.");
    });
});