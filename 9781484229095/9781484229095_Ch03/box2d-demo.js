// Declare all the commonly used objects as variables for convenience
var b2Vec2 = Box2D.Common.Math.b2Vec2;
var b2BodyDef = Box2D.Dynamics.b2BodyDef;
var b2Body = Box2D.Dynamics.b2Body;
var b2FixtureDef = Box2D.Dynamics.b2FixtureDef;
var b2World = Box2D.Dynamics.b2World;
var b2PolygonShape = Box2D.Collision.Shapes.b2PolygonShape;
var b2CircleShape = Box2D.Collision.Shapes.b2CircleShape;
var b2DebugDraw = Box2D.Dynamics.b2DebugDraw;
var b2RevoluteJointDef = Box2D.Dynamics.Joints.b2RevoluteJointDef;

var world;

//30 pixels on our canvas correspond to 1 meter in the box2d world
var scale = 30;

function init() {
    // Setup the box2d World that will do most of the physics calculation
    var gravity = new b2Vec2(0, 9.8); // Declare gravity as 9.8 m/s^2 downwards

    // Allow objects that are at rest to fall asleep and be excluded from calculations
    var allowSleep = true;

    world = new b2World(gravity, allowSleep);

    createFloor();

    // Create some bodies with simple shapes
    createRectangularBody();
    createCircularBody();
    createSimplePolygonBody();

    // Create a body combining two shapes
    createComplexBody();

    // Join two bodies using a revolute joint
    createRevoluteJoint();

    // Create a body with special user data
    createSpecialBody();

    // Create contact listeners and track events
    listenForContact();    

    setupDebugDraw();

    // Start the Box2D animation loop
    animate();
}

function createFloor() {
    //A body definition holds all the data needed to construct a rigid body.
    var bodyDef = new b2BodyDef;

    bodyDef.type = b2Body.b2_staticBody;
    bodyDef.position.x = 640 / 2 / scale;
    bodyDef.position.y = 450 / scale;

    // A fixture is used to attach a shape to a body for collision detection.
    // A fixture definition is used to create a fixture
    var fixtureDef = new b2FixtureDef;

    fixtureDef.density = 1.0;
    fixtureDef.friction = 0.5;
    fixtureDef.restitution = 0.2;

    fixtureDef.shape = new b2PolygonShape;
    fixtureDef.shape.SetAsBox(320 / scale, 10 / scale); //640 pixels wide and 20 pixels tall

    var body = world.CreateBody(bodyDef);
    var fixture = body.CreateFixture(fixtureDef);
}


var context;

function setupDebugDraw() {
    context = document.getElementById("canvas").getContext("2d");

    var debugDraw = new b2DebugDraw();

    // Use this canvas context for drawing the debugging screen
    debugDraw.SetSprite(context);
    // Set the scale
    debugDraw.SetDrawScale(scale);
    // Fill boxes with an alpha transparency of 0.3
    debugDraw.SetFillAlpha(0.3);
    // Draw lines with a thickness of 1
    debugDraw.SetLineThickness(1.0);
    // Display all shapes and joints
    debugDraw.SetFlags(b2DebugDraw.e_shapeBit | b2DebugDraw.e_jointBit);

    // Start using debug draw in our world
    world.SetDebugDraw(debugDraw);
}

var timeStep = 1 / 60;

//As per the Box2d manual, the suggested iteration count for Box2D is 8 for velocity and 3 for position.
var velocityIterations = 8;
var positionIterations = 3;

function animate() {
    world.Step(timeStep, velocityIterations, positionIterations);
    world.ClearForces();

    world.DrawDebugData();

    // Custom Drawing
    if (specialBody) {
        drawSpecialBody();
    }

    //Kill Special Body if Dead
    if (specialBody && specialBody.GetUserData().life <= 0) {
        world.DestroyBody(specialBody);
        specialBody = undefined;
        console.log("The special body was destroyed");
    }

    setTimeout(animate, timeStep);
}

function createRectangularBody() {
    var bodyDef = new b2BodyDef;

    bodyDef.type = b2Body.b2_dynamicBody;
    bodyDef.position.x = 40 / scale;
    bodyDef.position.y = 100 / scale;

    var fixtureDef = new b2FixtureDef;

    fixtureDef.density = 1.0;
    fixtureDef.friction = 0.5;
    fixtureDef.restitution = 0.3;

    fixtureDef.shape = new b2PolygonShape;
    fixtureDef.shape.SetAsBox(30 / scale, 50 / scale);

    var body = world.CreateBody(bodyDef);
    var fixture = body.CreateFixture(fixtureDef);
}

function createCircularBody() {
    var bodyDef = new b2BodyDef;

    bodyDef.type = b2Body.b2_dynamicBody;
    bodyDef.position.x = 130 / scale;
    bodyDef.position.y = 100 / scale;

    var fixtureDef = new b2FixtureDef;

    fixtureDef.density = 1.0;
    fixtureDef.friction = 0.5;
    fixtureDef.restitution = 0.7;

    fixtureDef.shape = new b2CircleShape(30 / scale);

    var body = world.CreateBody(bodyDef);
    var fixture = body.CreateFixture(fixtureDef);
}

function createSimplePolygonBody() {
    var bodyDef = new b2BodyDef;

    bodyDef.type = b2Body.b2_dynamicBody;
    bodyDef.position.x = 230 / scale;
    bodyDef.position.y = 50 / scale;

    var fixtureDef = new b2FixtureDef;

    fixtureDef.density = 1.0;
    fixtureDef.friction = 0.5;
    fixtureDef.restitution = 0.6;

    fixtureDef.shape = new b2PolygonShape;
    // Create an array of b2Vec2 points in clockwise direction
    var points = [
        new b2Vec2(0, 0),
        new b2Vec2(40 / scale, 50 / scale),
        new b2Vec2(50 / scale, 100 / scale),
        new b2Vec2(-50 / scale, 100 / scale),
        new b2Vec2(-40 / scale, 50 / scale),

    ];

    // Use SetAsArray to define the shape using the points array
    fixtureDef.shape.SetAsArray(points, points.length);

    var body = world.CreateBody(bodyDef);

    var fixture = body.CreateFixture(fixtureDef);

}

function createComplexBody() {
    var bodyDef = new b2BodyDef;

    bodyDef.type = b2Body.b2_dynamicBody;
    bodyDef.position.x = 350 / scale;
    bodyDef.position.y = 50 / scale;
    var body = world.CreateBody(bodyDef);

    //Create first fixture and attach a circular shape to the body
    var fixtureDef = new b2FixtureDef;

    fixtureDef.density = 1.0;
    fixtureDef.friction = 0.5;
    fixtureDef.restitution = 0.7;
    fixtureDef.shape = new b2CircleShape(40 / scale);
    body.CreateFixture(fixtureDef);

    // Create second fixture and attach a polygon shape to the body.
    fixtureDef.shape = new b2PolygonShape;
    var points = [
        new b2Vec2(0, 0),
        new b2Vec2(40 / scale, 50 / scale),
        new b2Vec2(50 / scale, 100 / scale),
        new b2Vec2(-50 / scale, 100 / scale),
        new b2Vec2(-40 / scale, 50 / scale),
    ];

    fixtureDef.shape.SetAsArray(points, points.length);
    body.CreateFixture(fixtureDef);
}

function createRevoluteJoint() {
    //Define the first body
    var bodyDef1 = new b2BodyDef;

    bodyDef1.type = b2Body.b2_dynamicBody;
    bodyDef1.position.x = 480 / scale;
    bodyDef1.position.y = 50 / scale;
    var body1 = world.CreateBody(bodyDef1);

    //Create first fixture and attach a rectangular shape to the body
    var fixtureDef1 = new b2FixtureDef;

    fixtureDef1.density = 1.0;
    fixtureDef1.friction = 0.5;
    fixtureDef1.restitution = 0.5;
    fixtureDef1.shape = new b2PolygonShape;
    fixtureDef1.shape.SetAsBox(50 / scale, 10 / scale);

    body1.CreateFixture(fixtureDef1);

    // Define the second body
    var bodyDef2 = new b2BodyDef;

    bodyDef2.type = b2Body.b2_dynamicBody;
    bodyDef2.position.x = 470 / scale;
    bodyDef2.position.y = 50 / scale;
    var body2 = world.CreateBody(bodyDef2);

    //Create second fixture and attach a polygon shape to the body
    var fixtureDef2 = new b2FixtureDef;

    fixtureDef2.density = 1.0;
    fixtureDef2.friction = 0.5;
    fixtureDef2.restitution = 0.5;
    fixtureDef2.shape = new b2PolygonShape;
    var points = [
        new b2Vec2(0, 0),
        new b2Vec2(40 / scale, 50 / scale),
        new b2Vec2(50 / scale, 100 / scale),
        new b2Vec2(-50 / scale, 100 / scale),
        new b2Vec2(-40 / scale, 50 / scale),
    ];

    fixtureDef2.shape.SetAsArray(points, points.length);
    body2.CreateFixture(fixtureDef2);


    // Create a joint between body1 and body2
    var jointDef = new b2RevoluteJointDef;
    var jointCenter = new b2Vec2(470 / scale, 50 / scale);

    jointDef.Initialize(body1, body2, jointCenter);
    world.CreateJoint(jointDef);
}

var specialBody;

function createSpecialBody() {
    var bodyDef = new b2BodyDef;

    bodyDef.type = b2Body.b2_dynamicBody;
    bodyDef.position.x = 450 / scale;
    bodyDef.position.y = 0 / scale;

    specialBody = world.CreateBody(bodyDef);
    specialBody.SetUserData({ name: "special", life: 250 });

    //Create a fixture to attach a circular shape to the body
    var fixtureDef = new b2FixtureDef;

    fixtureDef.density = 1.0;
    fixtureDef.friction = 0.5;
    fixtureDef.restitution = 0.5;

    fixtureDef.shape = new b2CircleShape(30 / scale);

    var fixture = specialBody.CreateFixture(fixtureDef);
}

function listenForContact() {
    var listener = new Box2D.Dynamics.b2ContactListener;

    listener.PostSolve = function(contact, impulse) {
        var body1 = contact.GetFixtureA().GetBody();
        var body2 = contact.GetFixtureB().GetBody();

        // If either of the bodies is the special body, reduce its life
        if (body1 == specialBody || body2 == specialBody) {
            var impulseAlongNormal = impulse.normalImpulses[0];

            specialBody.GetUserData().life -= impulseAlongNormal;
            console.log("The special body was in a collision with impulse", impulseAlongNormal, "and its life has now become ", specialBody.GetUserData().life);
        }
    };
    world.SetContactListener(listener);
}

function drawSpecialBody() {
    // Get body position and angle
    var position = specialBody.GetPosition();
    var angle = specialBody.GetAngle();

    // Translate and rotate axis to body position and angle
    context.translate(position.x * scale, position.y * scale);
    context.rotate(angle);

    // Draw a filled circular face
    context.fillStyle = "rgb(200, 150, 250)";
    context.beginPath();
    context.arc(0, 0, 30, 0, 2 * Math.PI, false);
    context.fill();

    // Draw two rectangular eyes
    context.fillStyle = "rgb(255, 255, 255)";
    context.fillRect(-15, -15, 10, 5);
    context.fillRect(5, -15, 10, 5);

    // Draw an upward or downward arc for a smile depending on life
    context.strokeStyle = "rgb(255, 255, 255)";
    context.beginPath();
    if (specialBody.GetUserData().life > 100) {
        context.arc(0, 0, 10, Math.PI, 2 * Math.PI, true);
    } else {
        context.arc(0, 10, 10, Math.PI, 2 * Math.PI, false);
    }
    context.stroke();

    // Translate and rotate axis back to original position and angle
    context.rotate(-angle);
    context.translate(-position.x * scale, -position.y * scale);
}