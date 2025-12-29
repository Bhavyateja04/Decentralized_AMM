DEX AMM Project
Overview

This project implements a simplified Decentralized Exchange (DEX) using the Automated Market Maker (AMM) model, inspired by Uniswap V2.
The DEX enables permissionless token swaps, liquidity provision, and fee earning, without relying on order books or centralized intermediaries.

Users can:

Add liquidity to a token pair

Remove liquidity proportionally

Swap between two ERC-20 tokens

Earn trading fees as liquidity providers

The system uses the constant product formula (x * y = k) to determine prices and execute trades in a fully decentralized manner.

Features

Initial and subsequent liquidity provision

Liquidity removal with proportional share calculation

Token swaps using the constant product AMM model

0.3% trading fee distributed to liquidity providers

LP token accounting using internal liquidity tracking

Real-time price discovery based on pool reserves

Fully tested with Hardhat + Chai

Dockerized environment for consistent evaluation

Code coverage ≥ 80%

Architecture

The project consists of two main smart contracts:

1. DEX.sol

Core AMM contract

Manages liquidity pools, swaps, and fees

Tracks reserves (reserveA, reserveB)

Maintains LP balances and total liquidity

Emits events for all major actions

2. MockERC20.sol

Simple ERC-20 token used for testing

Allows minting tokens for test scenarios

Supporting Components

Hardhat for compilation and testing

Docker & Docker Compose for reproducible builds

Solidity Coverage for test coverage analysis
Mathematical Implementation
Constant Product Formula

The AMM follows the invariant:

x * y = k


Where:

x = reserve of token A

y = reserve of token B

k = constant value that should not decrease

Trades adjust reserves while preserving (or increasing) k.

Fee Calculation (0.3%)

A 0.3% fee is applied to each swap.

Formula used:

amountInWithFee = amountIn * 997
numerator = amountInWithFee * reserveOut
denominator = (reserveIn * 1000) + amountInWithFee
amountOut = numerator / denominator


Only 99.7% of the input amount is used for the swap

The remaining 0.3% stays in the pool

This causes k to increase over time, benefiting LPs

LP Token Minting
Initial Liquidity Provider

When the pool is empty:

liquidityMinted = sqrt(amountA * amountB)


This sets the initial price ratio.

Subsequent Liquidity Providers

Liquidity must maintain the current price ratio:

liquidityMinted = (amountA * totalLiquidity) / reserveA


LP tokens represent proportional ownership of the pool.

Liquidity Removal

When burning LP tokens:

amountA = (liquidityBurned * reserveA) / totalLiquidity
amountB = (liquidityBurned * reserveB) / totalLiquidity


Liquidity providers receive their share plus accumulated fees.

Setup Instructions
Prerequisites

Docker & Docker Compose

Git

Installation
git clone <your-repo-url>
cd dex-amm

Start Docker Environment
docker-compose up -d

Compile Contracts
docker-compose exec app npm run compile

Run Tests
docker-compose exec app npm test

Check Coverage
docker-compose exec app npm run coverage

Stop Docker
docker-compose down

Running Without Docker (Optional)
npm install
npm run compile
npm test
npm run coverage

Known Limitations

Supports only one token pair

No slippage protection (minAmountOut) implemented

No deadline parameter for swaps

No oracle-based price feeds

No flash swaps

Direct token transfers to the contract are not tracked in reserves

These limitations are intentional to keep the implementation focused and educational.

Security Considerations

Uses Solidity 0.8+, which includes built-in overflow checks

Input validation for zero amounts and insufficient liquidity

Uses ReentrancyGuard to prevent reentrancy attacks

Fee logic ensures pool invariant (k) never decreases

No privileged admin functions (fully permissionless)

Tokens are transferred using standard ERC-20 interfaces

⚠️ This project is for educational purposes and has not been formally audited.
It should not be used in production without further security reviews.

Contract Addresses

Not deployed to a public network.
All testing and verification are performed locally using Hardhat.

Final Notes

This project demonstrates the core mechanics behind modern DeFi AMMs such as Uniswap V2, including liquidity provision, swaps, and fee distribution — all without centralized control.