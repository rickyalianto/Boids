var screenWidth = window.innerWidth;
var screenHeight = window.innerHeight;

var canvasArea = {
	canvas 	: document.createElement("canvas"),
	start 	: function(fps) {
		this.canvas.width = screenWidth;
		this.canvas.height = screenHeight;
		this.context = this.canvas.getContext("2d");
		document.body.insertBefore(this.canvas, document.body.childNodes[0]);
		this.interval = setInterval(update, fps);
	},
	clear	: function() {
		this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
	}
}

function Vector(x, y) {
	this.x = x;
	this.y = y;
	this.add = function(v) {
		this.x += v.x;
		this.y += v.y;
	}
	this.sub = function(v) {
		this.x -= v.x;
		this.y -= v.y;
	}
	this.mult = function(scalar) {
		this.x *= scalar;
		this.y *= scalar;
	}
	this.div = function(scalar) {
		this.x /= scalar;
		this.y /= scalar;
	}
	this.mag = function() {
		return Math.sqrt((this.x * this.x) + (this.y * this.y));
	}
	this.normalize = function() {
		var mag = this.mag();
		this.div(parseFloat(mag));
	}
	this.limit = function(max) {
		if(this.mag() > max) {
			this.normalize();
			this.mult(parseFloat(max));
		}
	}
}

function add(v1, v2) { return new Vector(v1.x + v2.x, v1.y + v2.y); }
function sub(v1, v2) { return new Vector(v1.x - v2.x, v1.y - v2.y); }
function mult(v1, v2) { return new Vector(v1.x * v2.x, v1.y * v2.y); }
function div(v1, v2) { return new Vector(v1.x / v2.x, v1.y / v2.y); }
function dist(v1, v2) { return Math.sqrt((v1.x - v2.x)*(v1.x - v2.x) + (v1.y - v2.y)*(v1.y - v2.y)); }
function heading(v) { return -Math.atan2(-v.y, v.x); }

function Flock() {
	this.boids = [];
	this.run = function() {
		for (var i = this.boids.length - 1; i >= 0; i--) {
			for (var j = predator.length - 1; j >= 0; j--) {
				var flee = this.boids[i].flee(predator[j].position);
				flee.mult(7.5);
				this.boids[i].applyForce(flee);
			}
			this.boids[i].run(this.boids);
		}
	}
	this.addBoid = function(boid) {
		this.boids.push(boid)
	}
}

function Boid(x, y) {
	this.angle = Math.random() * (2 * Math.PI);
	this.position = new Vector(x, y);
	this.velocity = new Vector(Math.cos(this.angle), Math.sin(this.angle));
	this.acceleration = new Vector(0, 0);
	this.size = 2.0;
	this.maxForce = 0.03;
	this.maxSpeed = 2;
	this.run = function(boids) {
		this.flock(boids);
		this.update();
		this.borders();
		this.render();
	}
	this.applyForce = function(force) {
		this.acceleration.add(force);
	}
	this.flock = function(boids) {
		var separation = this.separate(boids);
		var alignment = this.alignment(boids);
		var cohesion = this.cohesion(boids);

		separation.mult(1.5);
		alignment.mult(1.0);
		cohesion.mult(1.0);

		this.applyForce(separation);
		this.applyForce(alignment);
		this.applyForce(cohesion);
	}
	this.update = function() {
		this.velocity.add(this.acceleration);
		this.velocity.limit(this.maxSpeed);
		this.position.add(this.velocity);
		this.acceleration = new Vector(0, 0);
	}
	this.render = function() {
		var theta = heading(this.velocity) + Math.PI/2;
		ctx = canvasArea.context;
		ctx.save();
		ctx.translate(this.position.x , this.position.y);
		ctx.rotate(theta);
		ctx.fillStyle = "#0D47A1";
		ctx.fill();
		ctx.beginPath();
		ctx.moveTo(0, -this.size*2);
		ctx.lineTo(-this.size*2, this.size);
		ctx.lineTo(this.size*2, this.size);
		ctx.closePath();
		ctx.restore();
	}
	this.borders = function() {
		if(this.position.x < -this.size) this.position.x = screenWidth + this.size;
		if(this.position.y < -this.size) this.position.y = screenHeight + this.size;
		if(this.position.x > screenWidth + this.size) this.position.x = -this.size;
		if(this.position.y > screenHeight + this.size) this.position.y = -this.size;
	}
	this.seek = function(target) {
		var desired = sub(target, this.position);
		desired.normalize();
		desired.mult(this.maxSpeed);
		var steer = sub(desired, this.velocity);
		steer.limit(this.maxForce);
		return steer;
	}
	this.flee = function(target) {
		if(dist(this.position, target) < 75) {
			var desired = sub(this.position, target);
			desired.normalize();
			desired.mult(this.maxSpeed);
			var steer = sub(desired, this.velocity);
			steer.limit(this.maxForce);
			return steer;
		}
		return new Vector(0, 0);
	}
	this.separate = function(boids) {
		var desiredSeparation = 25.0;
		var steer = new Vector(0, 0);
		var count = 0;
		for (var i = boids.length - 1; i >= 0; i--) {
			var d = dist(this.position, boids[i].position);
			if((d > 0) && (d < desiredSeparation)) {
				var diff = sub(this.position, boids[i].position);
				diff.normalize();
				diff.div(d);
				steer.add(diff);
				count++;
			}
		}
		if(count > 0) {
			steer.div(parseFloat(count));
		}
		if(steer.mag() > 0) {
			steer.normalize();
			steer.mult(this.maxSpeed);
			steer.sub(this.velocity);
			steer.limit(this.maxForce);
		}
		return steer;
	}
	this.alignment = function(boids) {
		var neighbordist = 50;
		var sum = new Vector(0, 0);
		var count = 0;
		for (var i = boids.length - 1; i >= 0; i--) {
			var d = dist(this.position, boids[i].position);
			if((d > 0) && (d < neighbordist)) {
				sum = add(sum, boids[i].velocity);
				count++;
			}
		}
		if(count > 0) {
			sum.div(parseFloat(count));
			sum.normalize();
			sum.mult(this.maxSpeed);
			var steer = sub(sum, this.velocity);
			steer.limit(this.maxForce);
			return steer;
		}
		return new Vector(0, 0);
	}
	this.cohesion = function(boids) {
		var neighbordist = 50;
		var sum = new Vector(0, 0);
		var count = 0;
		for (var i = boids.length - 1; i >= 0; i--) {
			var d = dist(this.position, boids[i].position);
			if((d > 0) && (d < neighbordist)) {
				sum = add(sum, boids[i].position);
				count++;
			}
		}
		if(count > 0) {
			sum.div(parseFloat(count));
			return this.seek(sum);
		}
		return new Vector(0, 0);
	}
}

function BoidPredator(x, y) {
	this.angle = Math.random() * (2 * Math.PI);
	this.position = new Vector(x, y);
	this.velocity = new Vector(1, 1);
	this.acceleration = new Vector(0, 0);
	this.size = 6.0;
	this.maxForce = 0.05;
	this.maxSpeed = 7;
	this.run = function(boids) {
		this.flock(boids);
		this.update();
		this.borders();
		this.render();
	}
	this.applyForce = function(force) {
		this.acceleration.add(force);
	}
	this.flock = function(boids) {
		var separation = this.separate(boids);
		separation.mult(3);
		this.applyForce(separation);
	}
	this.update = function() {
		this.velocity.add(this.acceleration);
		this.velocity.limit(this.maxSpeed);
		this.position.add(this.velocity);
		this.acceleration = new Vector(0, 0);
	}
	this.render = function() {
		var theta = heading(this.velocity);
		ctx = canvasArea.context;
		ctx.save();
		ctx.translate(this.position.x , this.position.y);
		ctx.rotate(theta);
		ctx.fillStyle = "#424242";
    	ctx.fillRect(0, 0, this.size * 2, this.size);
		ctx.restore();
	}
	this.borders = function() {
		if(this.position.x < -this.size) this.position.x = screenWidth + this.size;
		if(this.position.y < -this.size) this.position.y = screenHeight + this.size;
		if(this.position.x > screenWidth + this.size) this.position.x = -this.size;
		if(this.position.y > screenHeight + this.size) this.position.y = -this.size;
	}
	this.seek = function(target) {
		var desired = sub(target, this.position);
		desired.normalize();
		desired.mult(this.maxSpeed);
		var steer = sub(desired, this.velocity);
		steer.limit(this.maxForce);
		return steer;
	}
	this.separate = function(boids) {
		var desiredSeparation = 25.0;
		var steer = new Vector(0, 0);
		var count = 0;
		for (var i = boids.length - 1; i >= 0; i--) {
			var d = dist(this.position, boids[i].position);
			if((d > 0) && (d < desiredSeparation)) {
				var diff = sub(this.position, boids[i].position);
				diff.normalize();
				diff.div(d);
				steer.add(diff);
				count++;
			}
		}
		if(count > 0) {
			steer.div(parseFloat(count));
		}
		if(steer.mag() > 0) {
			steer.normalize();
			steer.mult(this.maxSpeed);
			steer.sub(this.velocity);
			steer.limit(this.maxForce);
		}
		return steer;
	}
}

var flock = null;
var predator = [];

function init() {
	var fps = 1000/60;
	flock = new Flock();
	for (var i = 150 - 1; i >= 0; i--) {
		var x = Math.random(screenWidth) * screenWidth;
		var y = Math.random(screenHeight) * screenHeight;
		flock.addBoid(new Boid(x, y));
	}
	for (var i = 10 - 1; i >= 0; i--) {
		predator[i] = new BoidPredator(screenWidth/2, screenHeight/2);
	}
	canvasArea.start(fps);
}

function update() {
	canvasArea.clear();
	flock.run();
	for (var i = predator.length - 1; i >= 0; i--) {
		predator[i].run(predator);	
	}
}