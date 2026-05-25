// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

interface IAllocationDeskMin {
    function execute(
        address beneficiary,
        uint256 usdgAmount,
        address[] calldata stocks,
        uint256[] calldata weightsBps
    ) external;
}

/// @notice Malicious ERC-20 that attempts to re-enter AllocationDesk.execute
///         the first time the desk transfers it out. Used to verify the
///         ReentrancyGuard on `execute`.
contract ReentrantERC20 is ERC20 {
    uint8 private immutable _customDecimals;

    IAllocationDeskMin public target;
    bool public attackArmed;

    address public reentryBeneficiary;
    uint256 public reentryUsdg;
    address[] public reentryStocks;
    uint256[] public reentryWeights;

    constructor(string memory n, string memory s, uint8 d) ERC20(n, s) {
        _customDecimals = d;
    }

    function decimals() public view override returns (uint8) {
        return _customDecimals;
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    function arm(
        IAllocationDeskMin _target,
        address _beneficiary,
        uint256 _usdg,
        address[] calldata _stocks,
        uint256[] calldata _weights
    ) external {
        target = _target;
        reentryBeneficiary = _beneficiary;
        reentryUsdg = _usdg;
        delete reentryStocks;
        delete reentryWeights;
        for (uint256 i; i < _stocks.length; ++i) {
            reentryStocks.push(_stocks[i]);
            reentryWeights.push(_weights[i]);
        }
        attackArmed = true;
    }

    /// @dev `_update` is the OZ ERC20 v5 internal hook called by every transfer.
    function _update(address from, address to, uint256 value) internal override {
        super._update(from, to, value);
        if (attackArmed && from == address(target)) {
            attackArmed = false; // single-shot to avoid infinite recursion
            target.execute(reentryBeneficiary, reentryUsdg, reentryStocks, reentryWeights);
        }
    }
}
