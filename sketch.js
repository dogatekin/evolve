VEL_LIMIT = 6;

var ctx = document.getElementById('myChart').getContext('2d');
var chart = new Chart(ctx, {
    // The type of chart we want to create
    type: 'line',

    // The data for our dataset
    data: {
        labels: [],
        datasets: [{
            label: 'Best Fitness',
            fill: false,
            borderColor: 'green',
            backgroundColor: 'green',
            lineTension: 0,
            data: [],
        }]
    },

    // Configuration options go here
    options: {
      aspectRatio: 1,
      scales: {
        yAxes: [{
          scaleLabel: {
            display: true,
            labelString: 'Fitness'
          }
        }],
        xAxes: [{
          scaleLabel: {
            display: true,
            labelString: 'Generation'
          }
        }]
      }  
    }
});

function setup() {
  myCanvas = createCanvas(800, 800);
  myCanvas.parent('canvas');

  population = new Population(500, 4, 400)

  goal = new Goal(createVector(width/2, 50), 10)
  
  obstacles = [
    new Obstacle(150, 450, 500, 25),
    new Obstacle(100, 200, 50, 100),
    new Obstacle(650, 200, 50, 100),
    new Obstacle(375, 325, 50, 50)
  ]

  // obstacles = [
  //   new Obstacle(0, 200, 500, 50),
  //   new Obstacle(300, 500, 500, 50)
  // ]

  goal.draw()
  for (obs of obstacles) {
    obs.draw()
  }
  population.draw()
}

function draw() {
  background(200);
  text("Generation: " + population.gen, 10, 20);
  text("Steps: " + population.minStep, 730, 20);
  
  goal.draw()
  for (obs of obstacles) {
    obs.draw()
  }
  
  if (population.allDead()) {
    population.calculateFitness(goal);
    population.naturalSelection();
    population.mutate(0.15);
  } 
  else {
    population.update(goal, obstacles);
    population.draw();
  }
}


class Population {
  constructor(size, d, brainSize) {
    this.size = size
    this.minStep = brainSize

    this.dots = []
    for (let i = 0; i < this.size; i++) {
      this.dots.push(new Dot(d, brainSize))
    }

    this.gen = 1
    this.bestDot = 0
  }

  draw() {
    for (const dot of this.dots) {
      dot.draw()
    }
  }

  update(goal, obstacles) {
    for (const dot of this.dots) {
      if (dot.brain.step > this.minStep) {
        dot.alive = false
      }
      else {
        dot.update(goal, obstacles)
      }
    }
  }

  calculateFitness(goal) { 
    for (const dot of this.dots) {
      dot.calculateFitness(goal)
    }
  }

  allDead() {
    for (const dot of this.dots) {
      if (dot.alive && !dot.reached) {
        return false
      }
    }
    return true
  }

  naturalSelection() {
    let newGeneration = []
    this.setBestDot()

    this.fitnessSum = 0
    for (const dot of this.dots) {
      this.fitnessSum += dot.fitness
    }

    chart.data.labels.push(this.gen)
    chart.data.datasets.forEach((dataset) => {
      dataset.data.push(this.dots[this.bestDot].fitness);
    });
    chart.update();

    newGeneration.push(this.dots[this.bestDot].giveBirth())
    newGeneration[0].isBest = true

    for (let i = 0; i < this.dots.length-1; i++) {
      newGeneration.push(this.selectParent().giveBirth())
    }

    this.dots = newGeneration
    this.gen++
  }

  selectParent() {
    let rand = random(this.fitnessSum)
    let runningSum = 0
    let index = 0
    for(; index < this.dots.length && runningSum < rand; index++) {
      runningSum += this.dots[index].fitness
    }

    return this.dots[index-1]
  }

  mutate(mutationRate) {
    for (let i = 1; i < this.dots.length; i++) {
      this.dots[i].brain.mutate(mutationRate)
    }
  }

  setBestDot() {
    let max = 0
    let i
    for (i = 0; i < this.dots.length; i++) {
      if (this.dots[i].fitness > max) {
        max = this.dots[i].fitness
        this.bestDot = i
      }
    }

    if (this.dots[this.bestDot].reached) {
      this.minStep = this.dots[this.bestDot].brain.step
    }
  }
}


class Dot {
  constructor(d, brainSize) {
    this.brain = new Brain(brainSize)
    
    this.pos = createVector(width/2, height-100)
    this.vel = createVector(0, 0)
    this.acc = createVector(0, 0)

    this.d = d
    this.r = d/2

    this.alive = true
    this.reached = false
    this.isBest = false

    this.fitness = 0
  }

  update(goal, obstacles) {
    if (this.alive && !this.reached) {
      if (this.brain.hasDirections()) {
        this.move()

        if (this.hitWall() || this.hitObstacle(obstacles)) {
          this.alive = false
        }
        else if (this.reachedGoal(goal)) {
          this.reached = true
        }
      }
      else { 
        this.alive = false
      }
    }
  }

  move() {
    this.acc = this.brain.nextDirection();
    this.vel.add(this.acc)
    this.vel.limit(VEL_LIMIT)
    this.pos.add(this.vel)
  }

  draw() {
    if (this.isBest) {
      fill(0, 255, 0)
      ellipse(this.pos.x, this.pos.y, 3*this.d, 3*this.d)
    }
    else {
      fill(0)
      ellipse(this.pos.x, this.pos.y, this.d, this.d)
    }
  }

  hitWall() {
    return this.pos.x < this.r || this.pos.x > width-this.r || this.pos.y < this.r || this.pos.y > height-this.r;
  }

  reachedGoal(goal) {
    return this.pos.dist(goal.pos) < goal.r;
  }

  hitObstacle(obstacles) {
    for (obs of obstacles) {
      if (this.pos.x > obs.x && this.pos.x < (obs.x + obs.w) && this.pos.y > obs.y && this.pos.y < (obs.y + obs.h)) {
        return true
      }
    }
    return false
  }

  calculateFitness(goal) { 
    if (this.reached) {
      this.fitness = 1/16 + 1000/pow(this.brain.step, 2);
    }
    else {
      let distToGoal = this.pos.dist(goal.pos); 
      this.fitness = 1 / pow(distToGoal, 3);
    }
  }

  giveBirth() {
    let baby = new Dot(4, this.brain.directions.length)
    baby.brain = this.brain.clone()
    return baby
  }
}


class Brain {
  constructor(size) {
    this.step = 0
    this.size = size
    this.directions = []
    for (let i = 0; i < this.size; i++) {
      this.directions.push(p5.Vector.fromAngle(random(2*PI)))
    }
  }

  nextDirection() {
    return this.directions[this.step++]
  }

  hasDirections() {
    return this.size > this.step
  }

  clone() {
    let cloneBrain = new Brain(this.size)
    arrayCopy(this.directions, cloneBrain.directions)
    return cloneBrain
  }

  mutate(mutationRate) {
    for (let i = 0; i < this.directions.length; i++) {
      if (random(1) < mutationRate) {
        this.directions[i] = p5.Vector.fromAngle(random(2*PI))
      }
    }
  }
}

class Goal {
  constructor(pos, d) {
    this.pos = pos
    this.d = d
    this.r = d/2
  }

  draw() {
    fill(255, 128, 0)
    ellipse(this.pos.x, this.pos.y, this.d, this.d)
  }
}

class Obstacle {
  constructor(x, y, w, h) {
    this.x = x
    this.y = y
    this.w = w
    this.h = h
  }

  draw() {
    fill(0, 200, 200)
    rect(this.x, this.y, this.w, this.h)
  }
}