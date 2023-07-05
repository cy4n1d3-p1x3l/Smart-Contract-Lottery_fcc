const { deployments, network } = require("hardhat");
const { ethers } = require("hardhat");
const { developmentChains } = require("../helper-hardhat-config");
const BASE_FEE = "250000000000000000";
const GAS_PRICE_LINK = 1e9;

module.exports = async function ({ getNamedAccounts, deplyments }) {
  const { deploy, log } = deployments;
  const { deployer } = await getNamedAccounts();
  const chainId = network.config.chainId;

  if (developmentChains.includes(network.name)) {
    console.log("Local network here , deploying --------");
    const raffle = await deploy("VRFCoordinatorV2Mock", {
      from: deployer,
      args: [BASE_FEE, GAS_PRICE_LINK],
      log: true,
    });
    log("Mocks deployed");
    log("------------------");
  }
};

module.exports.tags = ["all", "mocks"];
