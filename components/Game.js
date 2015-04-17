var util = require('util');
var EventEmitter = require('events').EventEmitter;
var Dice = require('./Dice');

var Game = function (cfg) {
  EventEmitter.call(this);

  this.state = 'off';
  this.betAmount = cfg.betAmount;
  this.betArea = cfg.betArea; // 'P' or 'D'
  this.diceValue = null;
  this.point = null;
  this.dice1 = new Dice();
  this.dice2 = new Dice();
  this.rollHistory = [];

  this.setState = setState;
  this.end = end;
  this.roll = roll;
  this.handleRoll = handleRoll;
  this.win = win;
  this.lose = lose;
  this.setPoint = setPoint;
  this.handlePointSet = handlePointSet;


  this.on('rolled', this.handleRoll);
  this.on('pointSet', this.handlePointSet);
};

function setState (state) {
  this.emit('stateChanged', state);
  this.state = state;
}

function end(data) {
  this.setState('off');
  this.emit('end', data);
}


function roll () {
  var value1 = this.dice1.roll();
  var value2 = this.dice2.roll();
  var totalValue = value1 + value2;
  var state = this.state;

  this.diceValue = totalValue;
  this.emit('rolled', totalValue);
  return this.diceValue;
}

function handleRoll (rolledValue) {
  var state = this.state;
  var betAmount = this.betAmount;
  var betArea = this.betArea;
  var point = this.point;

  this.rollHistory.push(rolledValue);


  if (state === 'off') {

    if (betArea === 'P') {
      if (rolledValue === 7 || rolledValue === 11) {
        this.win();
      }

      else if (rolledValue === 2 || rolledValue === 3 || rolledValue === 12) {
        this.lose();
      }
      else {
        this.setPoint(rolledValue);
      }
    }

    //betArea === 'D'
    else if (betArea === 'D') {
      if (rolledValue === 7 || rolledValue === 11) {
        this.lose();
      }

      else if (rolledValue === 2 || rolledValue === 3) {
        this.win();
      }

      else if (rolledValue === 12) {
        this.roll();
      }
      else {
        this.setPoint(rolledValue);
      }
    }
  }

  else if (state === 'on') {
    if (betArea === 'P') {
      if (rolledValue === 7) {
        this.lose();
      }
      else if (rolledValue === point) {
        this.win();
      }
      else {
        this.roll();
      }
    }

    else if (betArea === 'D') {
      if (rolledValue === 7) {
        this.win();
      }
      else if (rolledValue === point) {
        this.lose();
      }
      else {
        this.roll();
      }
    }
  }
}

function win () {
  this.emit('win', this.betAmount);
  this.end({
    status: 'win',
    amount: this.betAmount
  });
}

function lose () {
  this.emit('lose');
  this.end({
    status: 'lose'
  });
}

function setPoint (point) {
  this.emit('pointSet', point);
  this.setState('on');
  this.roll();
}

function handlePointSet (point) {
  this.point = point;
}


// extend the EventEmitter class using our Game class
util.inherits(Game, EventEmitter);
module.exports = Game;
