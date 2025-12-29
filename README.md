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