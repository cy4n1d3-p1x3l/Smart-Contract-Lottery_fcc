const { getNamedAccounts, deployments, ethers, network } = require("hardhat");
const { developmentChains } = require("../../helper-hardhat-config");
const { assert, expect } = require("chai");
const { networkConfig } = require("../../helper-hardhat-config");
const { randomBytes, resolveAddress } = require("ethers");

!developmentChains.includes(network.name)
  ? describe.skip
  : describe("Raffle Unit test", function () {
      let raffle, vrfCoordinatorV2Mock, deployer, interval, raffleEntranceFee;
      const chainId = network.config.chainId;
      beforeEach(async function () {
        deployer = (await getNamedAccounts()).deployer;
        await deployments.fixture("all");
        raffle = await ethers.getContract("Raffle");
        vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock");
        raffleEntranceFee = await raffle.getEntranceFee();
        interval = await raffle.getInterval();
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
        it("records players when they enter", async function () {
          await raffle.enterRaffle({ value: raffleEntranceFee });
          const playerfromContract = await raffle.getPlayer(0);
          assert.equal(playerfromContract, deployer);
        });
        // it("emits an event on enter", async function () {
        //   await expect(
        //     raffle.enterRaffle({ value: raffleEntranceFee })
        //   ).to.emit(raffle, "RaffleEnter");
        // });
        it("doesn't allow to enter when raffle is calculating", async () => {
          await raffle.enterRaffle({ value: raffleEntranceFee });
          await network.provider.send("evm_increaseTime", [
            Number(interval) + 1,
          ]);
          await network.provider.send("evm_mine", []);
          await raffle.performUpkeep("0x");
          await expect(raffle.enterRaffle({ value: raffleEntranceFee })).to.be
            .reverted;
        });
      });
      describe("checkUpkeep", () => {
        it("returns false if people haven't sent any ETH", async () => {
          await network.provider.send("evm_increaseTime", [
            Number(interval) + 1,
          ]);
          await network.provider.send("evm_mine", []);
          const { upkeepNeeded } = await raffle.checkUpkeep("0x");
          assert(!upkeepNeeded);
        });
        it("returns false if raffle isn't open", async () => {
          await raffle.enterRaffle({ value: raffleEntranceFee });
          await network.provider.send("evm_increaseTime", [
            Number(interval) + 1,
          ]);
          await network.provider.send("evm_mine", []);
          await raffle.performUpkeep("0x");
          const raffleState = await raffle.getRaffleState();
          const { upkeepNeeded, hell } = await raffle.checkUpkeep("0x");

          assert.equal(raffleState.toString(), "1");
          assert.equal(upkeepNeeded, false);
        });
        it("returns false if enough time hasn't passed", async () => {
          await raffle.enterRaffle({ value: raffleEntranceFee });
          await network.provider.send("evm_increaseTime", [
            Number(interval) - 5,
          ]); // use a higher number here if this test fails
          await network.provider.request({ method: "evm_mine", params: [] });
          const { upkeepNeeded, hell } = await raffle.checkUpkeep("0x"); // upkeepNeeded = (timePassed && isOpen && hasBalance && hasPlayers)
          assert(!upkeepNeeded);
        });
        it("returns true if enough time has passed, has players, eth, and is open", async () => {
          await raffle.enterRaffle({ value: raffleEntranceFee });
          await network.provider.send("evm_increaseTime", [
            Number(interval) + 1,
          ]);
          await network.provider.request({ method: "evm_mine", params: [] });
          const { upkeepNeeded, hell } = await raffle.checkUpkeep("0x"); // upkeepNeeded = (timePassed && isOpen && hasBalance && hasPlayers)
          assert(upkeepNeeded);
        });
      });
      describe("performUpkeep", function () {
        it("it can only run if checkUpkeep is true", async function () {
          await raffle.enterRaffle({ value: raffleEntranceFee });
          await network.provider.send("evm_increaseTime", [
            Number(interval) + 1,
          ]);
          await network.provider.send("evm_mine", []);
          // const { upkeepNeeded, hell } = await raffle.checkUpkeep("0x");
          const tx = await raffle.performUpkeep("0x");
          assert(tx);
        });
        it("revert when checkUpkeep is false", async function () {
          await expect(raffle.performUpkeep("0x")).to.be.reverted;
        });
        it("updates the raffle state,emits an event, and calls the vrfocoordinator", async () => {
          await raffle.enterRaffle({ value: raffleEntranceFee });
          await network.provider.send("evm_increaseTime", [
            Number(interval) + 1,
          ]);
          await network.provider.send("evm_mine", []);
          const tx = await raffle.performUpkeep("0x");
          const txreceipt = await tx.wait(1);
          const requestId = txreceipt.logs[1].args.requestId;
          const raffleState = await raffle.getRaffleState();
          assert(Number(requestId) > 0);
          assert(raffleState.toString() == "1");
        });
      });
      describe("fulfillRandomWprds", function () {
        beforeEach(async () => {
          await raffle.enterRaffle({ value: raffleEntranceFee });
          await network.provider.send("evm_increaseTime", [
            Number(interval) + 1,
          ]);
          await network.provider.send("evm_mine", []);
        });
        it("can only be called after performUpkeep", async () => {
          await expect(
            vrfCoordinatorV2Mock.fulfillRandomWords(
              0,
              await raffle.getAddress()
            )
          ).to.be.reverted;
        });
        it("picks a winner,resets the lottery and sends the money", async function () {
          const additionalEntrants = 3;
          const startingCountIndex = 1;
          const accounts = await ethers.getSigners();
          for (
            let i = startingCountIndex;
            i < startingCountIndex + additionalEntrants;
            i++
          ) {
            const accountConnectedRaffle = raffle.connect(accounts[i]);
            await accountConnectedRaffle.enterRaffle({
              value: raffleEntranceFee,
            });
          }
          const startingTimeStamp = await raffle.getLatestTimestamp();
          await new Promise(async (resolve, reject) => {
            raffle.once("winnerPicked", async () => {
              console.log("Found the Event");
              try {
                const recentWinner = await raffle.getRecentWinner();
                console.log(recentWinner);
                console.log(await accounts[0].getAddress);
                const raffleState = await raffle.getRaffleState();
                const endingTimeStamp = await raffle.getLatestTimestamp();
                const numPlayers = await raffle.getNumPlayers();
                // const winnerEndingBalance=await accounts[].getBalance();
                assert(numPlayers.toString(), "0");
                assert.equal(raffleState.toString(), "0");
                assert(endingTimeStamp > startingTimeStamp);
                // assert.equal(winnerEndingBalance.toString(),(winnerStartingBalance+(additionalEntrants+1)*raffleEntranceFee).toString());
              } catch (e) {
                reject(e);
              }
              resolve();
            });
            const tx = await raffle.performUpkeep("0x");
            const txreceipt = await tx.wait(1);

            // const winnerStartingBalance=await accounts[].getBalance();
            await vrfCoordinatorV2Mock.fulfillRandomWords(
              txreceipt.logs[1].args.requestId,
              await raffle.getAddress()
            );
          });
        });
      });
    });
