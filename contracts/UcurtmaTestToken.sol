pragma solidity ^0.5.11;

import './zeppelin/token/ERC20/ERC20.sol';
import './zeppelin/token/ERC20/ERC20Detailed.sol';

contract UcurtmaTestToken is ERC20, ERC20Detailed {
    string private _name = 'Ucurtma Test Token';
    string private _symbol = 'TRYu';
    uint8 private _decimals = 6;

    constructor() ERC20Detailed( _name, _symbol, _decimals) public {
        address account = msg.sender;
        uint value = 1000000 ** uint(_decimals);
        _mint(account, value);
    }
}