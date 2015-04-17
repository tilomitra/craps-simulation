var Dice = function () {
  this.roll();
};


Dice.prototype.roll = function () {
  var value = 1 + Math.floor(Math.random() * 6);
  this.value = value;
  return this.value;
}

Dice.prototype.getValue = function () {
  return this.value;
}

module.exports = Dice;
