const { getNamedAccounts, deployments, ethers } = require("hardhat");
const { developmentChains } = require("../../helper-hardhat-config");
const { assert, expect } = require("chai");
const { networkConfig } = require("../../helper-hardhat-config");

!developmentChains.includes(network.name)
  ? describe.skip
  : describe("Raffle Unit test", function () {
      let raffle, vrfCoordinatorV2Mock;
      const chainId = network.config.chainId;
      beforeEach(async function () {
        const { deployer } = await getNamedAccounts();
        await deployments.fixture("all");
        raffle = await ethers.getContract("Raffle");
        vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock");
      });
      describe("constructor", function () {
        it("initializes the raffle correctly", async function () {
          const raffleState = await raffle.getRaffleState();
          const interval = await raffle.getInterval();

          assert.equal(raffleState.toString(), "0");
          assert.equal(interval, networkConfig[chainId]["interval"]);
        });
      });
      describe("enterRaffle", function () {
        it("Reverts when you don't pay enough", async function () {
          await expect(raffle.enterRaffle()).to.be.reverted;
        });
      });
    });
