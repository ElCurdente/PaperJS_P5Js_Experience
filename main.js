var Boid = Base.extend({
    initialize: function (position, maxSpeed, maxForce) {
        var strength = Math.random() * 0.5;
        this.acceleration = new Point();
        this.vector = Point.random() * 2 - 1;
        this.position = position.clone();
        this.radius = 30;
        this.maxSpeed = maxSpeed + strength;
        this.maxForce = maxForce + strength;
        this.amount = strength * 10 + 10;
        this.count = 0;
        this.color = this.color();
        this.createItems(this.color);
    },

    run: function (boids) {
        this.lastLoc = this.position.clone();
        if (!groupTogether) {
            this.flock(boids);
        } else {
            this.align(boids);
        }
        this.borders();
        this.update();
        this.calculateTail();
        this.moveHead();
    },

    calculateTail: function () {
        var segments = this.path.segments,
            shortSegments = this.shortPath.segments;
        var speed = this.vector.length;
        var pieceLength = 2 + speed / 3;
        var point = this.position;
        segments[0].point = shortSegments[0].point = point;
        // Chain goes the other way than the movement
        var lastVector = -this.vector;
        for (var i = 1; i < this.amount; i++) {
            var vector = segments[i].point - point;
            this.count += speed * 10;
            var wave = Math.sin((this.count + i * 3) / 300);
            var sway = lastVector.rotate(90).normalize(wave);
            point += lastVector.normalize(pieceLength) + sway;
            segments[i].point = point;
            if (i < 3)
                shortSegments[i].point = point;
            lastVector = vector;
        }
        this.path.smooth();
    },

    createItems: function (color) {

        this.path = new Path({
            strokeColor: color,
            strokeWidth: 2,
            strokeCap: 'round'
        });
        for (var i = 0; i < this.amount; i++)
            this.path.add(new Point());

        this.shortPath = new Path({
            strokeColor: color,
            strokeWidth: 4,
            strokeCap: 'round'
        });
        for (var i = 0; i < Math.min(3, this.amount); i++)
            this.shortPath.add(new Point());

        this.head = new Shape.Ellipse({
            center: [0, 0],
            size: [13, 8],
            fillColor: color
        });
    },

    moveHead: function () {
        this.head.position = this.position;
        this.head.rotation = this.vector.angle;
    },

    // We accumulate a new acceleration each time based on three rules
    flock: function (boids) {
        var separation = this.separate(boids) * 3;
        var alignment = this.align(boids);
        var cohesion = this.cohesion(boids);
        this.acceleration += separation + alignment + cohesion;
    },

    update: function () {
        // Update velocity
        this.vector += this.acceleration;
        // Limit speed (vector#limit?)
        this.vector.length = Math.min(this.maxSpeed, this.vector.length);
        this.position += this.vector;
        // Reset acceleration to 0 each cycle
        this.acceleration = new Point();
    },

    seek: function (target) {
        this.acceleration += this.steer(target, false);
    },

    arrive: function (target) {
        this.acceleration += this.steer(target, true);
    },

    borders: function () {
        var vector = new Point();
        var position = this.position;
        var radius = this.radius;
        var size = view.size;
        if (position.x < -radius) vector.x = size.width + radius;
        if (position.y < -radius) vector.y = size.height + radius;
        if (position.x > size.width + radius) vector.x = -size.width - radius;
        if (position.y > size.height + radius) vector.y = -size.height - radius;
        if (!vector.isZero()) {
            this.position += vector;
            var segments = this.path.segments;
            for (var i = 0; i < this.amount; i++) {
                segments[i].point += vector;
            }
        }
    },

    // A method that calculates a steering vector towards a target
    // Takes a second argument, if true, it slows down as it approaches
    // the target
    steer: function (target, slowdown) {
        var steer,
            desired = target - this.position;
        var distance = desired.length;
        // Two options for desired vector magnitude
        // (1 -- based on distance, 2 -- maxSpeed)
        if (slowdown && distance < 100) {
            // This damping is somewhat arbitrary:
            desired.length = this.maxSpeed * (distance / 100);
        } else {
            desired.length = this.maxSpeed;
        }
        steer = desired - this.vector;
        steer.length = Math.min(this.maxForce, steer.length);
        return steer;
    },

    separate: function (boids) {
        var desiredSeperation = 60;
        var steer = new Point();
        var count = 0;
        // For every boid in the system, check if it's too close
        for (var i = 0, l = boids.length; i < l; i++) {
            var other = boids[i];
            var vector = this.position - other.position;
            var distance = vector.length;
            if (distance > 0 && distance < desiredSeperation) {
                // Calculate vector pointing away from neighbor
                steer += vector.normalize(1 / distance);
                count++;
            }
        }
        // Average -- divide by how many
        if (count > 0)
            steer /= count;
        if (!steer.isZero()) {
            // Implement Reynolds: Steering = Desired - Velocity
            steer.length = this.maxSpeed;
            steer -= this.vector;
            steer.length = Math.min(steer.length, this.maxForce);
        }
        return steer;
    },

    // Alignment
    // For every nearby boid in the system, calculate the average velocity
    align: function (boids) {
        var neighborDist = 25;
        var steer = new Point();
        var count = 0;
        for (var i = 0, l = boids.length; i < l; i++) {
            var other = boids[i];
            var distance = this.position.getDistance(other.position);
            if (distance > 0 && distance < neighborDist) {
                steer += other.vector;
                count++;
            }
        }

        if (count > 0)
            steer /= count;
        if (!steer.isZero()) {
            // Implement Reynolds: Steering = Desired - Velocity
            steer.length = this.maxSpeed;
            steer -= this.vector;
            steer.length = Math.min(steer.length, this.maxForce);
        }
        return steer;
    },

    // Cohesion
    // For the average location (i.e. center) of all nearby boids,
    // calculate steering vector towards that location
    cohesion: function (boids) {
        var neighborDist = 100;
        var sum = new Point();
        var count = 0;
        for (var i = 0, l = boids.length; i < l; i++) {
            var other = boids[i];
            var distance = this.position.getDistance(other.position);
            if (distance > 0 && distance < neighborDist) {
                sum += other.position; // Add location
                count++;
            }
        }
        if (count > 0) {
            sum /= count;
            // Steer towards the location
            return this.steer(sum, false);
        }
        return sum;
    },

    color: function () {
        var letters = '1123456789ABCDEF';
        var color = '#';
        for (var i = 0; i < 6; i++) {
          color += letters[Math.floor(Math.random() * 16)];
        }
        return color;
      }
});

// var heartPath = new Path('M 4 8 L 10 1 L 13 0 L 12 3 L 5 9 C 6 10 6 11 7 10 C 7 11 8 12 7 12 A 1.42 1.42 0 0 1 6 13 A 5 5 0 0 0 4 10 Q 3.5 9.9 3.5 10.5 T 2 11.8 T 1.2 11 T 2.5 9.5 T 3 9 A 5 5 90 0 0 0 7 A 1.42 1.42 0 0 1 1 6 C 1 5 2 6 3 6 C 2 7 3 7 4 8 M 10 1 L 10 3 L 12 3 L 10.2 2.8 L 10 1');

var circlePath = new Path.Circle(new Point(50, 50), 150);
circlePath.fillColor = 'black';

var storedArray = [];

var handsPath = new Path();
handsPath.strokeColor = 'white';
handsPath.strokeWidth = 2;
handsPath.selected = true;


var isHands = false;

var boids = [];
var groupTogether = true;

// Add the boids:
for (var i = 0; i < 40; i++) {
    var position = Point.random() * view.size;
    boids.push(new Boid(position, 10, 0.05));
}


function onFrame(event) {

    if (sessionStorage.length > 2) {
        for (var i = 0; i < sessionStorage.length - 1; i++) {
            storedArray.push(JSON.parse(sessionStorage.getItem(i)));
        }
        if (storedArray.length > 0) {
            for (var i = 0; i < storedArray.length; i++) {
                handsPath.add(new Point(storedArray[i].x * 1500, storedArray[i].y * 1000));
            }
            handsPath.closed = true;
        }
    }
    for (var i = 0, l = boids.length; i < l; i++) {
        if (sessionStorage.length == 0) {
            var length = ((i + event.count / 40) % l) / l * circlePath.length;
            var point = circlePath.getPointAt(length);
            if (point)
                boids[i].arrive(point);
        } else {
            var length = ((i + event.count / 40) % l) / l * handsPath.length;
            var point = handsPath.getPointAt(length);
            if (point)
                boids[i].arrive(point);
        }
        boids[i].run(boids);
    }

    if (localStorage.getItem('micLevel') != '') {
        groupTogether = false;
    } else {
        groupTogether = true;
    }

    storedArray = [];
    handsPath.clear();
}

// Reposition the path whenever the window is resized:
function onResize(event) {
    if (sessionStorage.length == 0) {
        handsPath.fitBounds(view.bounds);
        handsPath.scale(0.8);
    } else {
        circlePath.fitBounds(view.bounds);
        circlePath.scale(0.8);
    }
}

function onMouseDown(event) {
    groupTogether = !groupTogether;
}

function onMouseMove(event) {
    circlePath.position = event.point;
}

function onKeyDown(event) {
    if (event.key == 'space') {
        var layer = project.activeLayer;
        layer.selected = !layer.selected;
        return false;
    }
}