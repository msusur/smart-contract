pragma solidity ^0.5.11;

import './FundingContract.sol';
import './zeppelin/ownership/Ownable.sol';
import './zeppelin/ownership/AdminControlled.sol';

contract AbstractFundingContract is FundingContract, Ownable, AdminControlled {

  uint256 public numberOfPlannedPayouts;
  uint256 public withdrawPeriod;
  uint256 public lastWithdraw;
  bool public cancelled;
  uint256 public totalNumberOfPayoutsLeft;
  uint256 public withdrawLimit;

  modifier notCancelled {
    require(!cancelled, 'Campaign is cancelled');
    _;
  }

  modifier isCancelled {
    require(cancelled, 'Campaign should be cancelled');
    _;
  }

  constructor(uint256 _numberOfPlannedPayouts,
    uint256 _withdrawPeriod,
    uint256 _campaignEndTime,
    address payable __owner,
    address _administrator
  )
    AdminControlled(_administrator)
    public {

    numberOfPlannedPayouts = _numberOfPlannedPayouts;
    withdrawPeriod = _withdrawPeriod;
    owner = __owner;
    totalNumberOfPayoutsLeft = numberOfPlannedPayouts;

    // consider the last withdraw date is the last day of campaign
    lastWithdraw = _campaignEndTime;
  }

  function canWithdraw() public view returns(bool) {
    // Check when was the last time the withdraw happened, and add withdraw period.
    return now > lastWithdraw + withdrawPeriod;
  }

  // Functions
  // AbstractFundingContract
  function withdraw() external notCancelled onlyOwner {
    require(canWithdraw(), 'Not allowed to withdraw');
    uint256 leftBalance = totalBalance(msg.sender);
    require(leftBalance > 0, 'Insufficient funds');
    uint256 payoutAmount = uint256(leftBalance) / totalNumberOfPayoutsLeft;
    // withdraw money and make the transfer to the owner.
    doWithdraw(msg.sender, payoutAmount);
    totalNumberOfPayoutsLeft--;
    lastWithdraw = now;
    emit PayoutWithdrawed(msg.sender, payoutAmount);
  }

  function toggleCancellation() external onlyAdmin returns(bool) {
    cancelled = !cancelled;
    return cancelled;
  }

  function paybackTokens(address payable originalPayee, uint256 amount) external isCancelled onlyAdmin {

    doWithdraw(originalPayee, amount);
  }

  function deposit(address donator, uint256 amount) external notCancelled {
    doDeposit(donator, amount);
    emit NewDeposit(donator, amount);
  }

  function totalBalance(address payable /* owner */) public view returns (uint256) {
    revert('This must be implemented in the inheriting class');
  }

  function doWithdraw(address payable /* owner */, uint256 /* amount */) internal {
    revert('This must be implemented in the inheriting class');
  }

  function doDeposit(address /* donator */, uint256 /* amount */) internal {
    revert('This must be implemented in the inheriting class');
  }
}