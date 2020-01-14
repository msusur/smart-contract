const { toWei } = require('web3-utils');
const FundingContract = artifacts.require('ERC20FundingContract.sol');
const Token = artifacts.require('BiliraToken.sol');
const EthVal = require('ethval');

web3.currentProvider.sendAsync = web3.currentProvider.send;
contract('ERC20 Funding Contract', accounts => {
  let token;

  beforeEach(async function() {
    token = await Token.new();
    this.accounts = accounts;
    this.createFundingContract = ({
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
      owner = accounts[0],
      tokenAddress = token.address,
      gasPrice = toWei('1', 'gwei')
    }) => {
      return FundingContract.new(
        numberOfPlannedPayouts,
        withdrawPeriod,
        campaignEndTime,
        owner,
        tokenAddress,
        { gasPrice: gasPrice }
      );
    };
    this.getBalance = async function(account) {
      return new EthVal(await token.balanceOf(account));
    };
  });

  describe('on creation', function() {
    it('tokenAddress is not empty', async function() {
      let fundingContract = await this.createFundingContract({});
      await fundingContract.token().should.eventually.be.not.null;
    });

    it('tokenAddress cannot be empty', async function() {
      const emptyAddress = '0x0000000000000000000000000000000000000000';
      await this.createFundingContract({
        tokenAddress: emptyAddress
      }).should.be.rejected;
    });
  });
});
