// SPDX-License-Identifier: MIT
pragma solidity 0.8.0;

import '@openzeppelin/contracts/token/ERC20/ERC20.sol';

contract BonusToken is ERC20 {

    address public admin;
    address public migrator;

    constructor() ERC20('Bonus Token', 'BTK') {
        admin = msg.sender;
    }

    function setMigrator(address _migrator) external {
        require(msg.sender == admin, 'only admin');
        migrator = _migrator;
    }

    function mint(address to, uint amount) external {
        require(msg.sender == migrator, 'only migrator');
        _mint(to, amount);
    }

}