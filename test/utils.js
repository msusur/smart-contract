const { toBN, currentProvider } = require('web3-utils');
const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');

chai.use((_chai, utils) => {
  utils.addMethod(_chai.Assertion.prototype, 'eq', function(val) {
    let result = utils.flag(this, 'object');

    // if bignumber
    if (result.toNumber) {
      if (val.toNumber) {
        result = result.toString(16);
        val = val.toString(16);
      } else if (typeof val === 'string') {
        if (val.startsWith('0x')) {
          result = result.toString(16);
        } else {
          result = result.toString(10);
        }
      } else if (typeof val === 'number') {
        result = result.toNumber();
      }
    }

    return utils.flag(this, 'negate')
      ? new _chai.Assertion(result).to.not.be.equal(val)
      : new _chai.Assertion(result).to.be.equal(val);
  });
});

chai.use(chaiAsPromised);

chai.should();

module.exports.getBalance = async addr => toBN(await web3.eth.getBalance(addr));

module.exports.mulBN = (bn, factor) =>
  bn.mul(toBN(factor * 1000)).div(toBN(1000));

module.exports.getEvents = async (result, eventName) => {
  const events = result.logs.filter(({ event }) => event === eventName);

  assert.isTrue(events.length > 0);

  return events;
};

module.exports.increaseTime = function(duration) {
  const id = Date.now();

  return new Promise((resolve, reject) => {
    currentProvider.sendAsync(
      {
        jsonrpc: '2.0',
        method: 'evm_increaseTime',
        params: [duration],
        id: id
      },
      err1 => {
        if (err1) return reject(err1);

        currentProvider.sendAsync(
          {
            jsonrpc: '2.0',
            method: 'evm_mine',
            id: id + 1
          },
          (err2, res) => {
            return err2 ? reject(err2) : resolve(res);
          }
        );
      }
    );
  });
};

module.exports.outputBNs = bn => {
  console.log('BNs: ');
  Object.keys(bn).forEach(k => {
    console.log(`   ${bn[k].toString(10)} => ${bn[k].toString(2)}`);
  });
};
