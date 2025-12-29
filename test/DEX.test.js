const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("DEX", function () {
  let dex, tokenA, tokenB;
  let owner, addr1, addr2;

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();

    const MockERC20 = await ethers.getContractFactory("MockERC20");
    tokenA = await MockERC20.deploy("Token A", "TKA");
    tokenB = await MockERC20.deploy("Token B", "TKB");

    const DEX = await ethers.getContractFactory("DEX");
    dex = await DEX.deploy(tokenA.address, tokenB.address);

    await tokenA.approve(dex.address, ethers.utils.parseEther("1000000"));
    await tokenB.approve(dex.address, ethers.utils.parseEther("1000000"));
  });

  describe("Liquidity Management", function () {

    it("should allow initial liquidity provision", async function () {
      await dex.addLiquidity(
        ethers.utils.parseEther("100"),
        ethers.utils.parseEther("200")
      );

      const [reserveA, reserveB] = await dex.getReserves();
      expect(reserveA).to.equal(ethers.utils.parseEther("100"));
      expect(reserveB).to.equal(ethers.utils.parseEther("200"));
    });

    it("should mint correct LP tokens for first provider", async function () {
      await dex.addLiquidity(
        ethers.utils.parseEther("100"),
        ethers.utils.parseEther("200")
      );

      const lp = await dex.liquidity(owner.address);
      expect(lp).to.be.gt(0);
    });

    it("should revert on zero liquidity addition", async function () {
      await expect(
        dex.addLiquidity(0, ethers.utils.parseEther("10"))
      ).to.be.revertedWith("Zero amount");
    });

    it("should allow partial liquidity removal", async function () {
      await dex.addLiquidity(
        ethers.utils.parseEther("100"),
        ethers.utils.parseEther("200")
      );

      const lp = await dex.liquidity(owner.address);
      await dex.removeLiquidity(lp.div(2));

      const [reserveA] = await dex.getReserves();
      expect(reserveA).to.be.lt(ethers.utils.parseEther("100"));
    });

    it("should revert when removing more liquidity than owned", async function () {
      await dex.addLiquidity(
        ethers.utils.parseEther("100"),
        ethers.utils.parseEther("200")
      );

      await expect(
        dex.removeLiquidity(ethers.utils.parseEther("999"))
      ).to.be.revertedWith("Not enough LP");
    });

  });
    describe("Token Swaps", function () {

    beforeEach(async function () {
      await dex.addLiquidity(
        ethers.utils.parseEther("100"),
        ethers.utils.parseEther("200")
      );
    });

    it("should swap token A for token B", async function () {
      const balanceBefore = await tokenB.balanceOf(owner.address);

      await dex.swapAForB(ethers.utils.parseEther("10"));

      const balanceAfter = await tokenB.balanceOf(owner.address);
      expect(balanceAfter).to.be.gt(balanceBefore);
    });

    it("should swap token B for token A", async function () {
      const balanceBefore = await tokenA.balanceOf(owner.address);

      await dex.swapBForA(ethers.utils.parseEther("20"));

      const balanceAfter = await tokenA.balanceOf(owner.address);
      expect(balanceAfter).to.be.gt(balanceBefore);
    });

    it("should revert on zero swap amount", async function () {
      await expect(
        dex.swapAForB(0)
      ).to.be.revertedWith("Zero input");
    });

    it("should update reserves after swap", async function () {
      const [rA1, rB1] = await dex.getReserves();

      await dex.swapAForB(ethers.utils.parseEther("10"));

      const [rA2, rB2] = await dex.getReserves();
      expect(rA2).to.be.gt(rA1);
      expect(rB2).to.be.lt(rB1);
    });
  });
});
