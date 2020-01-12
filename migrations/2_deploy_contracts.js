const yargs = require('yargs');

const DeploymentManager = artifacts.require('./DeploymentManager.sol');
const BiliraFundingContractDeployer = artifacts.require(
  './BiliraFundingContractDeployer.sol'
);

const BiliraToken = artifacts.require('./BiliraToken.sol');

let config = {};
// const emptyAddress = '0x0000000000000000000000000000000000000000';
// eg: truffle migrate --config '{"numberOfPlannedPayouts":10, "withdrawPeriod":28, "campaignEndTime":30}'
if (yargs.argv.config) {
  config = JSON.parse(yargs.argv.config);
}

module.exports = function(deployer) {
  if (deployer.network == 'test' || deployer.network == 'coverage') {
    return 'no need to deploy contract';
  }

  return deployer.then(async () => {
    let token;

    if (deployer.network == 'development') {
      // No need to deploy bilira if it's not development
      await deployer.deploy(BiliraToken);
      token = await BiliraToken.deployed();
    }

    // Deploy bilira contract deployer
    await deployer.deploy(BiliraFundingContractDeployer);
    const biliraDeployer = await BiliraFundingContractDeployer.deployed();

    console.log(
      [
        config.numberOfPlannedPayouts,
        config.withdrawPeriod,
        config.campaignEndTime
      ].join(',')
    );
    await deployer.deploy(DeploymentManager, biliraDeployer.address);
    const deploymentManager = await DeploymentManager.deployed();
    debugger;
    // return deployer.deploy(
    //   BiliraFundingContractDeployer,
    //   name,
    //   deposit,
    //   limitOfParticipants,
    //   coolingPeriod,
    //   emptyAddress
    // );
  });
};
