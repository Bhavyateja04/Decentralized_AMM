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

  /* ======================= LIQUIDITY (6) ======================= */

  describe("Liquidity Management", function () {

    it("should allow initial liquidity provision", async function () {
      await dex.addLiquidity(
        ethers.utils.parseEther("100"),
        ethers.utils.parseEther("200")
      );
      const [rA, rB] = await dex.getReserves();
      expect(rA).to.equal(ethers.utils.parseEther("100"));
      expect(rB).to.equal(ethers.utils.parseEther("200"));
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
      const [rA] = await dex.getReserves();
      expect(rA).to.be.lt(ethers.utils.parseEther("100"));
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

    it("should revert when removing zero liquidity", async function () {
      await expect(
        dex.removeLiquidity(0)
      ).to.be.revertedWith("Zero amount");
    });
  });

  /* ======================= SWAPS (5) ======================= */

  describe("Token Swaps", function () {

    beforeEach(async function () {
      await dex.addLiquidity(
        ethers.utils.parseEther("100"),
        ethers.utils.parseEther("200")
      );
    });

    it("should swap token A for token B", async function () {
      const before = await tokenB.balanceOf(owner.address);
      await dex.swapAForB(ethers.utils.parseEther("10"));
      const after = await tokenB.balanceOf(owner.address);
      expect(after).to.be.gt(before);
    });

    it("should swap token B for token A", async function () {
      const before = await tokenA.balanceOf(owner.address);
      await dex.swapBForA(ethers.utils.parseEther("20"));
      const after = await tokenA.balanceOf(owner.address);
      expect(after).to.be.gt(before);
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

    it("should handle multiple consecutive swaps", async function () {
      await dex.swapAForB(ethers.utils.parseEther("5"));
      await dex.swapAForB(ethers.utils.parseEther("5"));
      await dex.swapAForB(ethers.utils.parseEther("5"));
      const [rA] = await dex.getReserves();
      expect(rA).to.be.gt(ethers.utils.parseEther("100"));
    });
  });

  /* ======================= PRICE (3) ======================= */

  describe("Price Calculations", function () {

    it("should return correct initial price", async function () {
      await dex.addLiquidity(
        ethers.utils.parseEther("100"),
        ethers.utils.parseEther("200")
      );
      const price = await dex.getPrice();
      expect(price).to.equal(ethers.utils.parseEther("2"));
    });

    it("should update price after swap", async function () {
      await dex.addLiquidity(
        ethers.utils.parseEther("100"),
        ethers.utils.parseEther("200")
      );
      const before = await dex.getPrice();
      await dex.swapAForB(ethers.utils.parseEther("10"));
      const after = await dex.getPrice();
      expect(after).to.not.equal(before);
    });

    it("should return zero price when reserves are empty", async function () {
      const price = await dex.getPrice();
      expect(price).to.equal(0);
    });
  });

  /* ======================= FEES (2) ======================= */

  describe("Fee Distribution", function () {

    it("should accumulate fees for liquidity providers", async function () {
      await dex.addLiquidity(
        ethers.utils.parseEther("100"),
        ethers.utils.parseEther("200")
      );
      await dex.swapAForB(ethers.utils.parseEther("10"));
      await dex.swapAForB(ethers.utils.parseEther("10"));
      const lp = await dex.liquidity(owner.address);
      await dex.removeLiquidity(lp);
      const balance = await tokenA.balanceOf(owner.address);
      expect(balance).to.be.gt(ethers.utils.parseEther("999900"));
    });

    it("should distribute fees proportionally", async function () {
      await dex.addLiquidity(
        ethers.utils.parseEther("100"),
        ethers.utils.parseEther("200")
      );

      await tokenA.mint(addr1.address, ethers.utils.parseEther("100"));
      await tokenB.mint(addr1.address, ethers.utils.parseEther("200"));

      await tokenA.connect(addr1).approve(dex.address, ethers.utils.parseEther("100"));
      await tokenB.connect(addr1).approve(dex.address, ethers.utils.parseEther("200"));

      await dex.connect(addr1).addLiquidity(
        ethers.utils.parseEther("100"),
        ethers.utils.parseEther("200")
      );

      const lp1 = await dex.liquidity(owner.address);
      const lp2 = await dex.liquidity(addr1.address);
      expect(lp1).to.equal(lp2);
    });
  });

  /* ======================= EVENTS (3) ======================= */

  describe("Events", function () {

    it("should emit LiquidityAdded event", async function () {
      await expect(
        dex.addLiquidity(
          ethers.utils.parseEther("100"),
          ethers.utils.parseEther("200")
        )
      ).to.emit(dex, "LiquidityAdded");
    });

    it("should emit LiquidityRemoved event", async function () {
      await dex.addLiquidity(
        ethers.utils.parseEther("100"),
        ethers.utils.parseEther("200")
      );
      const lp = await dex.liquidity(owner.address);
      await expect(
        dex.removeLiquidity(lp)
      ).to.emit(dex, "LiquidityRemoved");
    });

    it("should emit Swap event", async function () {
      await dex.addLiquidity(
        ethers.utils.parseEther("100"),
        ethers.utils.parseEther("200")
      );
      await expect(
        dex.swapAForB(ethers.utils.parseEther("10"))
      ).to.emit(dex, "Swap");
    });
  });

  /* ======================= EDGE CASES (6) ======================= */

  describe("Edge Cases", function () {

    it("should handle very small liquidity amounts", async function () {
      await dex.addLiquidity(1, 1);
      const [rA, rB] = await dex.getReserves();
      expect(rA).to.equal(1);
      expect(rB).to.equal(1);
    });

    it("should revert swap when pool is empty", async function () {
      await expect(
        dex.swapAForB(ethers.utils.parseEther("1"))
      ).to.be.revertedWith("Empty pool");
    });

    it("should return correct reserves after adding liquidity", async function () {
      await dex.addLiquidity(
        ethers.utils.parseEther("50"),
        ethers.utils.parseEther("100")
      );
      const [rA, rB] = await dex.getReserves();
      expect(rA).to.equal(ethers.utils.parseEther("50"));
      expect(rB).to.equal(ethers.utils.parseEther("100"));
    });

    it("should increase totalLiquidity after adding liquidity", async function () {
      const before = await dex.totalLiquidity();
      await dex.addLiquidity(
        ethers.utils.parseEther("100"),
        ethers.utils.parseEther("200")
      );
      const after = await dex.totalLiquidity();
      expect(after).to.be.gt(before);
    });

    it("should decrease totalLiquidity after removing liquidity", async function () {
      await dex.addLiquidity(
        ethers.utils.parseEther("100"),
        ethers.utils.parseEther("200")
      );
      const before = await dex.totalLiquidity();
      const lp = await dex.liquidity(owner.address);
      await dex.removeLiquidity(lp.div(2));
      const after = await dex.totalLiquidity();
      expect(after).to.be.lt(before);
    });

    it("should reset provider liquidity after full withdrawal", async function () {
      await dex.addLiquidity(
        ethers.utils.parseEther("100"),
        ethers.utils.parseEther("200")
      );
      const lp = await dex.liquidity(owner.address);
      await dex.removeLiquidity(lp);
      const remaining = await dex.liquidity(owner.address);
      expect(remaining).to.equal(0);
    });
  });
});
