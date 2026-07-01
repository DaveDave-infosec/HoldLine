// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

// Mock settlement token for Holdline. Testnet only.
// Open mint, no access control by design, do not ship to a real network.
contract GenUSDC is ERC20 {
    constructor() ERC20("GenUSDC", "genUSDC") {
        _mint(msg.sender, 10_000_000 * 10**18);
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}