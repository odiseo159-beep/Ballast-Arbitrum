// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";

/// @title AllocationDesk — Ballast settlement contract on Robinhood Chain
/// @author Ballast (Arbitrum Open House Buildathon 2026)
/// @notice Holds a USDG + stock-token reserve and settles user allocations
///         and redemptions at a price supplied by a trusted off-chain oracle.
/// @dev Testnet design note: Robinhood Chain testnet has no DEX liquidity
///      and no on-chain price feed, so this desk operates as a settlement
///      contract, not a market maker. The off-chain agent backend (oracle
///      role) pushes real US-stock prices via setPrices() before each
///      execute(). On mainnet the same interface would route through the
///      chain's real liquidity venues.
contract AllocationDesk is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20Metadata;

    // ───────────────────────── Constants ─────────────────────────

    /// @notice Basis-points denominator (10_000 = 100.00%).
    uint256 public constant BPS_DENOMINATOR = 10_000;

    /// @notice Fixed-point scale for `priceUsdgPerStock`. A human price of
    ///         200.50 USDG per stock is stored as 200_500000000000000000.
    uint256 public constant PRICE_SCALE = 1e18;

    // ───────────────────────── Immutable ─────────────────────────

    IERC20Metadata public immutable USDG;
    uint8 public immutable USDG_DECIMALS;

    // ───────────────────────── Storage ─────────────────────────

    /// @notice Address authorized to push prices via setPrices().
    address public oracle;

    mapping(address stock => bool) public supportedStock;
    mapping(address stock => uint8) public stockDecimals;
    mapping(address stock => uint256) public priceUsdgPerStock;

    // ───────────────────────── Errors ─────────────────────────

    error ZeroAmount();
    error ZeroAddress();
    error LengthMismatch();
    error WeightsMismatch(uint256 expected, uint256 actual);
    error StockNotSupported(address stock);
    error PriceNotSet(address stock);
    error InsufficientReserve(address token, uint256 needed, uint256 available);
    error NotOracle(address caller);
    error UnknownToken(address token);
    error UnsupportedDecimals(uint8 tokenDecimals, uint8 usdgDecimals);

    // ───────────────────────── Events ─────────────────────────

    event OracleChanged(address indexed oldOracle, address indexed newOracle);
    event StockSupported(address indexed stock, uint8 decimals);
    event PricesUpdated(address[] stocks, uint256[] pricesUsdg18);
    event Executed(
        address indexed beneficiary,
        address indexed payer,
        uint256 usdgAmount,
        address[] stocks,
        uint256[] weightsBps,
        uint256[] stockAmountsOut
    );
    event Redeemed(
        address indexed redeemer,
        address indexed stock,
        uint256 stockAmount,
        uint256 usdgAmountOut
    );
    event ReserveDeposited(address indexed token, address indexed from, uint256 amount);
    event ReserveWithdrawn(address indexed token, address indexed to, uint256 amount);

    // ───────────────────────── Modifiers ─────────────────────────

    modifier onlyOracle() {
        if (msg.sender != oracle) revert NotOracle(msg.sender);
        _;
    }

    // ───────────────────────── Constructor ─────────────────────────

    /// @param _owner          Admin (sets oracle, manages reserve, supports stocks).
    /// @param _oracle         Address allowed to push prices.
    /// @param _usdg           USDG token (the stablecoin).
    /// @param _initialStocks  List of stock tokens to whitelist at deploy time.
    constructor(
        address _owner,
        address _oracle,
        IERC20Metadata _usdg,
        address[] memory _initialStocks
    ) Ownable(_owner) {
        if (_owner == address(0) || _oracle == address(0) || address(_usdg) == address(0)) {
            revert ZeroAddress();
        }

        USDG = _usdg;
        USDG_DECIMALS = _usdg.decimals();
        oracle = _oracle;
        emit OracleChanged(address(0), _oracle);

        for (uint256 i; i < _initialStocks.length; ++i) {
            _addSupportedStock(_initialStocks[i]);
        }
    }

    // ───────────────────────── Admin (owner) ─────────────────────────

    /// @notice Replace the off-chain oracle signer.
    function setOracle(address newOracle) external onlyOwner {
        if (newOracle == address(0)) revert ZeroAddress();
        address old = oracle;
        oracle = newOracle;
        emit OracleChanged(old, newOracle);
    }

    /// @notice Whitelist a stock token. Reads decimals() once and caches.
    function addSupportedStock(address stock) external onlyOwner {
        _addSupportedStock(stock);
    }

    function _addSupportedStock(address stock) internal {
        if (stock == address(0)) revert ZeroAddress();
        if (supportedStock[stock]) return; // idempotent
        uint8 d = IERC20Metadata(stock).decimals();
        // Math invariant: require 18 + Dstock >= Dusdg so the exponent
        // in _usdgToStock / _stockToUsdg is non-negative.
        if (uint256(d) + 18 < uint256(USDG_DECIMALS)) {
            revert UnsupportedDecimals(d, USDG_DECIMALS);
        }
        supportedStock[stock] = true;
        stockDecimals[stock] = d;
        emit StockSupported(stock, d);
    }

    /// @notice Pull `amount` of `token` into the reserve. Token must be USDG
    ///         or a supported stock — random tokens are rejected.
    function depositReserve(address token, uint256 amount) external onlyOwner {
        if (amount == 0) revert ZeroAmount();
        if (token != address(USDG) && !supportedStock[token]) revert UnknownToken(token);
        IERC20Metadata(token).safeTransferFrom(msg.sender, address(this), amount);
        emit ReserveDeposited(token, msg.sender, amount);
    }

    /// @notice Withdraw `amount` of `token` from the reserve to the owner.
    function withdrawReserve(address token, uint256 amount) external onlyOwner {
        if (amount == 0) revert ZeroAmount();
        if (token != address(USDG) && !supportedStock[token]) revert UnknownToken(token);
        IERC20Metadata(token).safeTransfer(msg.sender, amount);
        emit ReserveWithdrawn(token, msg.sender, amount);
    }

    // ───────────────────────── Oracle ─────────────────────────

    /// @notice Push fresh prices for one or more stock tokens.
    /// @param stocks       Token addresses (must already be supported).
    /// @param pricesUsdg18 USDG-per-stock prices, each scaled by PRICE_SCALE.
    function setPrices(
        address[] calldata stocks,
        uint256[] calldata pricesUsdg18
    ) external onlyOracle {
        uint256 n = stocks.length;
        if (n == 0 || n != pricesUsdg18.length) revert LengthMismatch();
        for (uint256 i; i < n; ++i) {
            address s = stocks[i];
            uint256 p = pricesUsdg18[i];
            if (!supportedStock[s]) revert StockNotSupported(s);
            if (p == 0) revert ZeroAmount();
            priceUsdgPerStock[s] = p;
        }
        emit PricesUpdated(stocks, pricesUsdg18);
    }

    // ───────────────────────── Settlement ─────────────────────────

    /// @notice Pull `usdgAmount` USDG from msg.sender and send the corresponding
    ///         stock tokens to `beneficiary`, allocated by `weightsBps`.
    /// @dev    weightsBps MUST sum to BPS_DENOMINATOR (10_000).
    /// @dev    Every stock in `stocks` must currently have a non-zero oracle
    ///         price, even those passed with weight 0 — the support + price
    ///         checks run over the full input array. Callers (the agent
    ///         backend) should filter to currently-priced stocks before
    ///         invoking, otherwise the call reverts with PriceNotSet.
    function execute(
        address beneficiary,
        uint256 usdgAmount,
        address[] calldata stocks,
        uint256[] calldata weightsBps
    ) external nonReentrant {
        if (beneficiary == address(0)) revert ZeroAddress();
        if (usdgAmount == 0) revert ZeroAmount();
        uint256 n = stocks.length;
        if (n == 0 || n != weightsBps.length) revert LengthMismatch();

        uint256[] memory amounts = _quote(usdgAmount, stocks, weightsBps);

        // CEI: pull USDG first, then push stock tokens.
        USDG.safeTransferFrom(msg.sender, address(this), usdgAmount);

        for (uint256 i; i < n; ++i) {
            uint256 out = amounts[i];
            if (out == 0) continue;
            address s = stocks[i];
            uint256 bal = IERC20Metadata(s).balanceOf(address(this));
            if (bal < out) revert InsufficientReserve(s, out, bal);
            IERC20Metadata(s).safeTransfer(beneficiary, out);
        }

        emit Executed(beneficiary, msg.sender, usdgAmount, stocks, weightsBps, amounts);
    }

    /// @notice Quote how many stock tokens a given USDG amount + weights yields.
    function quote(
        uint256 usdgAmount,
        address[] calldata stocks,
        uint256[] calldata weightsBps
    ) external view returns (uint256[] memory) {
        return _quote(usdgAmount, stocks, weightsBps);
    }

    function _quote(
        uint256 usdgAmount,
        address[] calldata stocks,
        uint256[] calldata weightsBps
    ) internal view returns (uint256[] memory amounts) {
        uint256 n = stocks.length;
        amounts = new uint256[](n);
        uint256 sumBps;
        for (uint256 i; i < n; ++i) {
            address s = stocks[i];
            if (!supportedStock[s]) revert StockNotSupported(s);
            uint256 p = priceUsdgPerStock[s];
            if (p == 0) revert PriceNotSet(s);
            uint256 w = weightsBps[i];
            sumBps += w;
            if (w == 0) continue;

            uint256 weightedUsdg = (usdgAmount * w) / BPS_DENOMINATOR;
            amounts[i] = _usdgToStock(weightedUsdg, s, p);
        }
        if (sumBps != BPS_DENOMINATOR) revert WeightsMismatch(BPS_DENOMINATOR, sumBps);
    }

    /// @notice Redeem `stockAmount` of `stock` back to USDG at current oracle price.
    function redeem(address stock, uint256 stockAmount) external nonReentrant {
        if (stockAmount == 0) revert ZeroAmount();
        if (!supportedStock[stock]) revert StockNotSupported(stock);
        uint256 p = priceUsdgPerStock[stock];
        if (p == 0) revert PriceNotSet(stock);

        uint256 usdgOut = _stockToUsdg(stockAmount, stock, p);

        uint256 usdgBal = USDG.balanceOf(address(this));
        if (usdgBal < usdgOut) revert InsufficientReserve(address(USDG), usdgOut, usdgBal);

        // CEI: pull stock first, then push USDG.
        IERC20Metadata(stock).safeTransferFrom(msg.sender, address(this), stockAmount);
        USDG.safeTransfer(msg.sender, usdgOut);

        emit Redeemed(msg.sender, stock, stockAmount, usdgOut);
    }

    // ───────────────────────── Math ─────────────────────────
    // Uses OZ Math.mulDiv (512-bit intermediate, rounds toward zero) so the
    // intermediate products cannot overflow at any realistic input size.
    //
    // Invariant established at addSupportedStock: 18 + Dstock >= Dusdg.

    /// @dev stockOut = usdg * 10^(18 + Dstock - Dusdg) / price18
    function _usdgToStock(
        uint256 usdg,
        address stock,
        uint256 price18
    ) internal view returns (uint256) {
        uint256 exp = 18 + uint256(stockDecimals[stock]) - uint256(USDG_DECIMALS);
        return Math.mulDiv(usdg, 10 ** exp, price18);
    }

    /// @dev usdgOut = stock * price18 / 10^(18 + Dstock - Dusdg)
    function _stockToUsdg(
        uint256 stock,
        address stockToken,
        uint256 price18
    ) internal view returns (uint256) {
        uint256 exp = 18 + uint256(stockDecimals[stockToken]) - uint256(USDG_DECIMALS);
        return Math.mulDiv(stock, price18, 10 ** exp);
    }
}
