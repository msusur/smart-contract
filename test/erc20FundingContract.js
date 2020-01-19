const { toWei } = require('web3-utils');
const FundingContract = artifacts.require('ERC20FundingContract.sol');
const Token = artifacts.require('BiliraToken.sol');
const EthVal = require('ethval');

web3.currentProvider.sendAsync = web3.currentProvider.send;
contract('ERC20 Funding Contract', accounts => {
  let token;
  const [owner, donator, student, ...others] = accounts;
  const createFundingContract = ({
    /**
      uint256 _numberOfPlannedPayouts,
      uint256 _withdrawPeriod,
      uint256 _campaignEndTime,
      address payable __owner,
      address _tokenAddress,
      address _adminAddress
   */
    numberOfPlannedPayouts = 10,
    withdrawPeriod = 28,
    campaignEndTime = 10,
    _owner = student,
    tokenAddress = token.address,
    gasPrice = toWei('1', 'gwei')
  }) => {
    return FundingContract.new(
      numberOfPlannedPayouts,
      withdrawPeriod,
      campaignEndTime,
      _owner,
      tokenAddress,
      owner,
      { gasPrice: gasPrice, from: owner }
    );
  };
  const getBalance = async account => await token.balanceOf(account);

  beforeEach(async () => {
    token = await Token.new();
    await token.transfer(donator, '1000');
  });

  describe('on creation', () => {
    it('tokenAddress is not empty', async () => {
      let fundingContract = await createFundingContract({});
      await fundingContract.token().should.eventually.be.not.null;
    });

    it('tokenAddress cannot be empty', async () => {
      const emptyAddress = '0x0000000000000000000000000000000000000000';
      await createFundingContract({
        tokenAddress: emptyAddress
      }).should.be.rejected;
    });
  });

  describe('adding funds', () => {
    it('someone should be able to add funds', async () => {
      let fundingContract = await createFundingContract({
        numberOfPlannedPayouts: 10,
        withdrawPeriod: 1,
        campaignEndTime: 0,
        student,
        tokenAddress: token.address
      });
      await token.transfer(fundingContract.address, '100', { from: donator });
      await getBalance(fundingContract.address).should.eventually.eq(100);
    });

    it('student cannot withdraw money if the campaign is not over', async () => {
      const latestBlock = await web3.eth.getBlock('latest');

      let fundingContract = await createFundingContract({
        numberOfPlannedPayouts: 10,
        withdrawPeriod: 10000,
        campaignEndTime: latestBlock.timestamp,
        student,
        tokenAddress: token.address
      });
      await token.transfer(fundingContract.address, '100', { from: donator });
      await fundingContract.withdraw({ from: student }).should.eventually.be
        .rejected;
    });
  });
});
