const { ethers } = require("hardhat");
const fs = require("fs");
const FRONT_END_ADDRESSES_FILE =
  "../nextjs-smartcotract-lottery-fcc/constants/contractAddresses.json";
const FRONT_END_ABI_FILE =
  "../nextjs-smartcotract-lottery-fcc/constants/abi.json";
module.exports = async function () {
  if (process.env.UPDATE_FRONT_END) {
    console.log("updating front end .....");
    await updateContractAddresses();
    await updateAbi();
  }
};

async function updateAbi() {
  const raffle = await ethers.getContract("Raffle");
  // const iface = await new ethers.Interface(raffle.abi);
  // console.log("Formatted ABI", iface.format(FormatTypes.json));

  fs.writeFileSync(FRONT_END_ABI_FILE, raffle.interface.formatJson());
}
async function updateContractAddresses() {
  const raffle = await ethers.getContract("Raffle");
  const currentAddresses = JSON.parse(
    fs.readFileSync(FRONT_END_ADDRESSES_FILE, "utf-8")
  );
  if (network.config.chainId.toString() in currentAddresses) {
    if (
      !currentAddresses[network.config.chainId.toString()].includes(
        await raffle.getAddress()
      )
    ) {
      currentAddresses[network.config.chainId.toString()].push(
        await raffle.getAddress()
      );
    }
  }
  {
    currentAddresses[network.config.chainId.toString()] = [
      await raffle.getAddress(),
    ];
  }
  fs.writeFileSync(FRONT_END_ADDRESSES_FILE, JSON.stringify(currentAddresses));
}

module.exports.tags = ["all", "front-end"];
