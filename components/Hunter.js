var util = require('util');
var _    = require('underscore');
var EventEmitter = require('events').EventEmitter;
var Game = require('./Game');

var AsciiTable = require('ascii-table')

//---- $2 Table

var MODES = {
  T: [2,4,6,10,16,26,42,68],
  C: [2,4,8,16,32,64,128],
  R: [3,2,4,6,8,10,12,15,20,25,30,35,40,45,50,55,60]
}

//---- $3 Table
// var MODES = {
//   T: [3,6,9,15,24,39,63,102],
//   C: [3,6,12,24,48,96],
//   R: [4,3,6,8,10,12,15,20,25,30,35,40,45]
// }



var Hunter = function (initialState) {
  EventEmitter.call(this);

  this.table = new AsciiTable('HUNTER');
  this.round = 0;
  this.mode = initialState.mode || 'T';
  this.pattern = initialState.pattern || 'S';
  this.betArea = initialState.betArea || 'P';
  this.betLevel = initialState.betLevel || 1;
  this.startingAmount = initialState.bankroll || 180;
  this.bankroll = this.startingAmount;
  this.stopGap = initialState.stopGap || this.bankroll;

  this.goal = initialState.goal || 20;
  this.deviation = initialState.deviation || 0.2;

  this.maxRounds = initialState.maxRounds || 64;

  this.huntHistory = [];
  this.currentHunt = {};

  this.game = null;


  //METHODS
  this.hunt = hunt;
  this.handleGameEnd = handleGameEnd;
  this.handleHunterEnd = handleHunterEnd;
  this.on('end', this.handleHunterEnd);

  this.table.setHeading('Rnd', 'Dcsn', 'Mode', 'Pattern', 'BetArea', 'BetAmt', 'BetLvl', 'Result', 'Balance', 'Cash on hand');
};


function hunt () {
  var betArea = this.betArea;
  var betAmount;
  var state;

  if (!MODES[this.mode][this.betLevel - 1]) {
    this.emit('end', {
      status: 'lose',
      history: this.huntHistory,
      lastState: _.last(this.huntHistory)
    });
  }
  else {
    betAmount = MODES[this.mode][this.betLevel - 1];

    //increment round
    this.round++;

    state = {
      round: this.round,
      mode: this.mode,
      pattern: this.pattern,
      betArea: betArea,
      betAmount: betAmount,
      betLevel: this.betLevel,
      bankroll: this.bankroll
    }

    this.currentHunt = state;

    this.game = new Game({
      betAmount: state.betAmount,
      betArea: state.betArea
    });

    var boundHandleGameEnd = this.handleGameEnd.bind(this);
    this.game.on('end', boundHandleGameEnd);

    var self = this;
    setImmediate(function () {
      self.game.roll();
    });


  }

}


function handleGameEnd (gameState) {
  var betArea = this.betArea,
      mode = this.mode,
      pattern = this.pattern,
      currentHunt = this.currentHunt,
      previousHunt = this.huntHistory[this.huntHistory.length - 1],
      secondPreviousHunt = this.huntHistory[this.huntHistory.length - 2],
      lastLosingStrikeHunt;

  if (gameState.status === 'win') {
    if (previousHunt) {
      currentHunt.bankroll = previousHunt.bankroll + gameState.amount;
    }
    else {
      currentHunt.bankroll += gameState.amount;
    }
    currentHunt.balance = currentHunt.bankroll - this.startingAmount;
    currentHunt.decision = currentHunt.betArea;
    currentHunt.result = 'W';

    // Won Level 1 Strike Bet
    if (currentHunt.mode === 'T' && currentHunt.betLevel === 1) {
      this.mode = 'R';
      this.betLevel = 1;
      this.pattern = (currentHunt.pattern === 'S') ? 'O' : 'S';
      this.betArea = (this.pattern === 'O') ? getOppositeBetArea(currentHunt.decision) : currentHunt.decision;
    }

    // Won Strike Bet over level 1
    else if (currentHunt.mode === 'T' && currentHunt.betLevel > 1) {
      this.mode = 'T';
      this.pattern = (currentHunt.pattern === 'S') ? 'O' : 'S';
      this.betArea = (this.pattern === 'O') ? getOppositeBetArea(currentHunt.decision) : currentHunt.decision;

      if (previousHunt.result === 'W' ||
          (secondPreviousHunt && secondPreviousHunt.result === 'W') ||
          (currentHunt.balance > -5) ||
          (currentHunt.balance < 5)
        ) {
        this.betLevel = 1;
      }
      else {
        this.betLevel = this.betLevel - 1;
      }
    }

    // Won Performance Bet
    else if (currentHunt.mode === 'R') {
      this.mode = 'R';
      this.betLevel = this.betLevel + 1;
      this.pattern = (currentHunt.pattern === 'S') ? 'O' : 'S';
      this.betArea = (this.pattern === 'O') ? getOppositeBetArea(currentHunt.decision) : currentHunt.decision;
    }

    // Won Counterstrike Bet
    else if (currentHunt.mode === 'C') {
      this.mode = 'T';

      if (currentHunt.bankroll < 3 && currentHunt.bankroll > -3) {
        this.betLevel = 1;
      }

      else {
        lastLosingStrikeHunt = this.huntHistory[_.findLastIndex(this.huntHistory, {
          mode: 'T',
          result: 'L'
        })];

        this.betLevel = lastLosingStrikeHunt.betLevel + 1;
      }

      this.pattern = (currentHunt.pattern === 'S') ? 'O' : 'S';
      this.betArea = (this.pattern === 'O') ? getOppositeBetArea(currentHunt.decision) : currentHunt.decision;
    }
  }

  else if (gameState.status === 'lose') {
    if (previousHunt) {
      currentHunt.bankroll = previousHunt.bankroll - currentHunt.betAmount;
    }
    else {
      currentHunt.bankroll = currentHunt.bankroll - currentHunt.betAmount;
    }
    currentHunt.balance = currentHunt.bankroll - this.startingAmount;
    currentHunt.decision = getOppositeBetArea(currentHunt.betArea);
    currentHunt.result = 'L';

    // Lost a strike bet but the last one was not a strike bet orr performance bet (so it was counterstrike bet)
    if (currentHunt.mode === 'T' && ((previousHunt && previousHunt.mode === 'C') || !previousHunt)){
      //Raise strike bet and try again
      this.mode = 'T';
      this.betLevel = currentHunt.betLevel + 1;
      this.pattern = (currentHunt.pattern === 'S') ? 'O' : 'S';
      this.betArea = (this.pattern === 'O') ? getOppositeBetArea(currentHunt.decision) : currentHunt.decision;
    }

    // Lost a strike bet and the last one was also a strike bet or performance bet
    else if (currentHunt.mode === 'T' && (previousHunt && previousHunt.mode === 'T' || previousHunt.mode === 'R')) {
      // Go into level 1 counterstrike betting
      this.mode = 'C';
      this.betLevel = 1;
      this.pattern = currentHunt.pattern;
      this.betArea = (this.pattern === 'O') ? getOppositeBetArea(currentHunt.decision) : currentHunt.decision;
    }

    // Lost a counter strike bet
    else if (currentHunt.mode === 'C') {
      //go to next level of counterstrike bet
      this.mode = 'C';
      this.betLevel = currentHunt.betLevel + 1;
      this.pattern = currentHunt.pattern;
      this.betArea = (this.pattern === 'O') ? getOppositeBetArea(currentHunt.decision) : currentHunt.decision;
    }

    //Lost a performance bet
    else if (currentHunt.mode === 'R') {
      // Go to the next highest bet amount strike bet up to level 3
      this.mode = 'T';
      this.betLevel = (currentHunt.betLevel <= 2) ? 2 : 3;
      this.pattern = (currentHunt.pattern === 'S') ? 'O' : 'S';
      this.betArea = (this.pattern === 'O') ? getOppositeBetArea(currentHunt.decision) : currentHunt.decision;
    }
  }

  this.huntHistory.push(currentHunt);
  this.table.addRow(
    currentHunt.round,
    currentHunt.decision,
    currentHunt.mode,
    currentHunt.pattern,
    currentHunt.betArea,
    currentHunt.betAmount,
    currentHunt.betLevel,
    currentHunt.result,
    currentHunt.balance,
    currentHunt.bankroll
  );

  //if goal reached, stop.
  if (currentHunt.balance >= (1-this.deviation)*this.goal) {
    this.emit('end', {
      status: 'win',
      history: this.huntHistory,
      lastState: _.last(this.huntHistory)
    });
  }

  // You hit the stop-loss.
  else if (currentHunt.bankroll < -this.stopGap) {
    this.emit('end', {
      status: 'lose',
      history: this.huntHistory,
      lastState: _.last(this.huntHistory)
    });
  }

  // If max-rounds played, stop.
  else if (currentHunt.round === this.maxRounds) {
    this.emit('end', {
      status: 'max-round-reached',
      history: this.huntHistory,
      lastState: _.last(this.huntHistory)
    });
  }

  //if over 25 rounds are done and you are positive, leave
  else if (currentHunt.round >= 25 && currentHunt.balance >= 7) {
    this.emit('end', {
      status: 'win',
      history: this.huntHistory,
      lastState: _.last(this.huntHistory)
    });
  }

  //else keep hunting
  else {
    this.hunt();
  }
}


function handleHunterEnd (e) {
  //console.log(this.table.toString());
}


function getOppositeBetArea (betArea) {
  if (betArea === 'P') return 'D';
  else return 'P';
}

// extend the EventEmitter class using our Hunter class
util.inherits(Hunter, EventEmitter);
module.exports = Hunter;
