// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract DEX is ReentrancyGuard {
    address public tokenA;
    address public tokenB;

    uint256 public reserveA;
    uint256 public reserveB;

    uint256 public totalLiquidity;
    mapping(address => uint256) public liquidity;

    event LiquidityAdded(
        address indexed provider,
        uint256 amountA,
        uint256 amountB,
        uint256 liquidityMinted
    );

    event LiquidityRemoved(
        address indexed provider,
        uint256 amountA,
        uint256 amountB,
        uint256 liquidityBurned
    );

    event Swap(
        address indexed trader,
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOut
    );

    constructor(address _tokenA, address _tokenB) {
        require(_tokenA != _tokenB, "Identical tokens");
        tokenA = _tokenA;
        tokenB = _tokenB;
    }

    /// @notice Add liquidity
    function addLiquidity(uint256 amountA, uint256 amountB)
        external
        nonReentrant
        returns (uint256 liquidityMinted)
    {
        require(amountA > 0 && amountB > 0, "Zero amount");

        IERC20(tokenA).transferFrom(msg.sender, address(this), amountA);
        IERC20(tokenB).transferFrom(msg.sender, address(this), amountB);

        if (totalLiquidity == 0) {
            liquidityMinted = sqrt(amountA * amountB);
        } else {
            require(
                amountB * reserveA == amountA * reserveB,
                "Ratio mismatch"
            );
            liquidityMinted = (amountA * totalLiquidity) / reserveA;
        }

        require(liquidityMinted > 0, "Zero liquidity");

        liquidity[msg.sender] += liquidityMinted;
        totalLiquidity += liquidityMinted;

        reserveA += amountA;
        reserveB += amountB;

        emit LiquidityAdded(msg.sender, amountA, amountB, liquidityMinted);
    }

    /// @notice Remove liquidity
    function removeLiquidity(uint256 liquidityAmount)
        external
        nonReentrant
        returns (uint256 amountA, uint256 amountB)
    {
        require(liquidityAmount > 0, "Zero amount");
        require(liquidity[msg.sender] >= liquidityAmount, "Not enough LP");

        amountA = (liquidityAmount * reserveA) / totalLiquidity;
        amountB = (liquidityAmount * reserveB) / totalLiquidity;

        liquidity[msg.sender] -= liquidityAmount;
        totalLiquidity -= liquidityAmount;

        reserveA -= amountA;
        reserveB -= amountB;

        IERC20(tokenA).transfer(msg.sender, amountA);
        IERC20(tokenB).transfer(msg.sender, amountB);

        emit LiquidityRemoved(msg.sender, amountA, amountB, liquidityAmount);
    }

    /// @notice Swap A → B
    function swapAForB(uint256 amountAIn)
        external
        nonReentrant
        returns (uint256 amountBOut)
    {
        require(amountAIn > 0, "Zero input");

        IERC20(tokenA).transferFrom(msg.sender, address(this), amountAIn);

        amountBOut = getAmountOut(amountAIn, reserveA, reserveB);
        require(amountBOut > 0, "Zero output");

        reserveA += amountAIn;
        reserveB -= amountBOut;

        IERC20(tokenB).transfer(msg.sender, amountBOut);

        emit Swap(msg.sender, tokenA, tokenB, amountAIn, amountBOut);
    }

    /// @notice Swap B → A
    function swapBForA(uint256 amountBIn)
        external
        nonReentrant
        returns (uint256 amountAOut)
    {
        require(amountBIn > 0, "Zero input");

        IERC20(tokenB).transferFrom(msg.sender, address(this), amountBIn);

        amountAOut = getAmountOut(amountBIn, reserveB, reserveA);
        require(amountAOut > 0, "Zero output");

        reserveB += amountBIn;
        reserveA -= amountAOut;

        IERC20(tokenA).transfer(msg.sender, amountAOut);

        emit Swap(msg.sender, tokenB, tokenA, amountBIn, amountAOut);
    }

    /// @notice Price = reserveB / reserveA
    function getPrice() external view returns (uint256) {
        if (reserveA == 0) return 0;
        return (reserveB * 1e18) / reserveA;
    }

    function getReserves()
        external
        view
        returns (uint256, uint256)
    {
        return (reserveA, reserveB);
    }

    /// @notice AMM math with 0.3% fee
    function getAmountOut(
        uint256 amountIn,
        uint256 reserveIn,
        uint256 reserveOut
    ) public pure returns (uint256) {
        require(amountIn > 0, "Zero input");
        require(reserveIn > 0 && reserveOut > 0, "Empty pool");

        uint256 amountInWithFee = amountIn * 997;
        uint256 numerator = amountInWithFee * reserveOut;
        uint256 denominator = reserveIn * 1000 + amountInWithFee;
        return numerator / denominator;
    }

    function sqrt(uint256 y) internal pure returns (uint256 z) {
        if (y > 3) {
            z = y;
            uint256 x = y / 2 + 1;
            while (x < z) {
                z = x;
                x = (y / x + x) / 2;
            }
        } else if (y != 0) {
            z = 1;
        }
    }
}
