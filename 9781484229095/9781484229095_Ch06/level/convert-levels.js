// Generate a level-obstructed-terrain.json file from the Tiled level.json file, for use in our game

var fs = require("fs");

fs.readFile("level.json", function(err, data) {
    if (err) {
        throw err;
    }

    processFile(data);
});

function processFile(text) {
    // Get level data as a parsed JSON file
    var json = JSON.parse(text);

    var width = json.width;
    var height = json.height;


    // Store list of tiles with obstructed terrain
    var obstructed = [];

    // Iterate through tile data in layer and store any coordinates that have an obstruction
    var obstructionTileData = json.layers[1].data;

    for (var y = 0; y < height; y++) {
        for (var x = 0; x < width; x++) {
            var tile = obstructionTileData[y * width + x];

            if (tile > 0) {
                obstructed.push([x, y]);
            }
        }

    }

    var map = {
        mapGridWidth: width,
        mapGridHeight: height,
        mapObstructedTerrain: obstructed
    };

    // Write map data to map file
    fs.writeFile("level-obstructed-terrain.json", JSON.stringify(map), function(err) {
        if (err) {
            throw err;
        }
        console.log("Level obstructed terrain JSON generated.");
    });



}

