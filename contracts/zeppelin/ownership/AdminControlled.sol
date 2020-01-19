pragma solidity ^0.5.11;

contract AdminControlled {
  address public contractAdmin;

  event ContractAdminTransferred(address indexed previousAdmin, address indexed newAdmin);

  constructor(address administrator) public {
    contractAdmin = administrator;
  }

  modifier onlyAdmin() {
    require(msg.sender == contractAdmin, 'Only contract administrator can perform this operation');
    _;
  }

  function transferContractAdmin(address newAdmin) public onlyAdmin {
    require(newAdmin != address(0), 'Need a valid admin');
    emit ContractAdminTransferred(contractAdmin, newAdmin);
    contractAdmin = newAdmin;
  }
}