const { ethers, network } = require("hardhat")

module.exports = async ({ getNamedAccounts, deployments }) => {
    const { deploy, log } = deployments; // https://www.npmjs.com/package/hardhat-deploy
    const { deployer } = await getNamedAccounts();

    console.log("Deploying smart contracts...");

    await deploy("UniswapV2Factory", {
        from: deployer,
        args: [deployer], // constructor arguments
        log: true,
        waitConfirmations: network.config.blockConfirmations || 1,
    });

    await deploy("TokenA", {
        from: deployer,
        contract: "TokenERC20",
        args: [ethers.utils.parseEther("1000"), "TokenA", "TKA"], // constructor arguments
        log: true,
        waitConfirmations: network.config.blockConfirmations || 1,
    });

    await deploy("TokenB", {
        from: deployer,
        contract: "TokenERC20",
        args: [ethers.utils.parseEther("10000"), "TokenB", "TKB"], // constructor arguments
        log: true,
        waitConfirmations: network.config.blockConfirmations || 1,
    });

    log("-------------------------------------------------------------------")
}

module.exports.tags = ["all", "factory"];