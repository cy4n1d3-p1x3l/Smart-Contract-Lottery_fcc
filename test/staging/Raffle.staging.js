const { getNamedAccounts, deployments, ethers, network } = require("hardhat");
const { developmentChains } = require("../../helper-hardhat-config");
const { assert, expect } = require("chai");
const { networkConfig } = require("../../helper-hardhat-config");
const { randomBytes, resolveAddress, getAccountPath } = require("ethers");
var promise = require("promise");

developmentChains.includes(network.name)
  ? describe.skip
  : describe("Raffle Unit test", function () {
      let raffle, vrfCoordinatorV2Mock, deployer, interval, raffleEntranceFee;
      const chainId = network.config.chainId;
      beforeEach(async function () {
        deployer = (await getNamedAccounts()).deployer;
        await deployments.fixture("all");
        raffle = await ethers.getContract("Raffle");
        raffleEntranceFee = await raffle.getEntranceFee();
      });
      describe("fulfillRandomWords", () => {
        it("Works with live Chainlink Keepers and Chainlinl Vrf, we get a Random Winner", async () => {
          const startingTimeStamp = await raffle.getLatestTimestamp();
          const accounts = await ethers.getSigners();
          await new promise(async (resolve, reject) => {
            raffle.once("winnerPicked", async () => {
              console.log("Winner Picked fired");

              try {
                const recentWinner = await raffle.getRecentWinner();
                const raffleState = await raffle.getRaffleState();
                const winnerBalance = await accounts[0].getBalance();
                const endingTimeStamp = await raffle.getLatestTimestamp();

                assert.equal(raffleState, 0);
                await expect(raffle.getPlayer(0)).to.be.reverted;
                assert.equal(recentWinner.toString(), accounts[0].address);
                assert.equal(
                  winnerEndingBalance.toString(),
                  (winnerStartingBalance + 1 * raffleEntranceFee).toString()
                );
                assert(endingTimeStamp > startingTimeStamp);
                resolve();
              } catch (e) {
                console.log(e);
                reject(e);
              }
            });
            await raffle.enterRaffle({ value: raffleEntranceFee });
            const winnerStartingBalance = await accounts[0].getBalance();
          });
        });
      });
    });
