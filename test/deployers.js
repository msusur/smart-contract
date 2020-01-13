const { toHex, toWei } = require('web3-utils');
const { getEvents } = require('./utils');

const DeploymentManager = artifacts.require('DeploymentManager.sol');
const BiliraFundingContractDeployer = artifacts.require(
  'BiliraFundingContractDeployer.sol'
);
const AbstractFundingContract = artifacts.require(
  'AbstractFundingContract.sol'
);
const BiliraToken = artifacts.require('BiliraToken.sol');

contract('DeploymentManager', accounts => {
  let deployer, erc20Deployer;
  let emptyAddress = '0x0000000000000000000000000000000000000000';

  beforeEach(async () => {
    erc20Deployer = await BiliraFundingContractDeployer.new();
    deployer = await DeploymentManager.new(erc20Deployer.address);
  });

  it('does not accept ETH', async () => {
    await deployer.send(1, { from: accounts[0] }).should.be.rejected;
  });

  it('has an owner', async () => {
    await deployer.owner().should.eventually.eq(accounts[0]);
  });

  it('is destructible', async () => {
    const { address } = deployer;

    await deployer.destroy().should.be.fulfilled;

    await DeploymentManager.at(address).should.be.rejected;
  });

  it('can deploy a BiliraFundingContractDeployer', async () => {
    const token = await BiliraToken.new();
    /**
     *  uint256 _numberOfPlannedPayouts,
        uint256 _withdrawPeriod,
        uint256 _campaignEndTime,
        address payable __owner,
        address _tokenAddress,
        address _adminAddress
     */
    const result = await deployer.deploy(
      toHex(10),
      toHex(28),
      toHex(2),
      accounts[0],
      token.address
    );

    const events = await getEvents(result, 'NewFundingContract');

    assert.deepEqual(events.length, 1);

    const [event] = events;

    assert.nestedInclude(event.args, {
      deployer: accounts[0]
    });

    const { deployedAddress } = event.args;

    const fundingContract = await AbstractFundingContract.at(deployedAddress);
    await fundingContract.numberOfPlannedPayouts().should.eventually.eq(10);
    await fundingContract.withdrawPeriod().should.eventually.eq(28);
  });

  it('when it deploys a FundingContract the owner is the wallet owner', async () => {
    /**
     *  uint256 _numberOfPlannedPayouts,
        uint256 _withdrawPeriod,
        uint256 _campaignEndTime,
        address payable __owner,
        address _tokenAddress,
        address _adminAddress
     */
    const token = await BiliraToken.new();
    const result = await deployer.deploy(
      toHex(10),
      toHex(28),
      toHex(2),
      accounts[1],
      token.address
    );

    const [
      {
        args: { deployedAddress }
      }
    ] = await getEvents(result, 'NewFundingContract');

    const fundingContract = await AbstractFundingContract.at(deployedAddress);

    await fundingContract.owner().should.eventually.eq(accounts[1]);
  });
});
