const { ethers } = require("hardhat");

module.exports = async ({ getNamedAccounts, deployments }) => {

    deployer = (await getNamedAccounts()).deployer;
    await deployments.fixture(["all"]);  // runs scripts with exported "all" tag in deploy folder
    const factory = await ethers.getContract("UniswapV2Factory", deployer);
    const tokenA = await ethers.getContract("TokenA", deployer);
    const tokenB = await ethers.getContract("TokenB", deployer);

    await factory.createPair(tokenA.address, tokenB.address);

};