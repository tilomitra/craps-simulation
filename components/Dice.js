var Chance = require("chance");
var chance = new Chance();

var Dice = function() {
  this.roll();
};

Dice.prototype.roll = function() {
  const val = chance.d6();
  this.value = val;
  return this.value;
};

Dice.prototype.getValue = function() {
  return this.value;
};

module.exports = Dice;
