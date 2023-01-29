const { network } = require("hardhat")

module.exports = async ({ getNamedAccounts, deployments }) => {
    const { deploy, log } = deployments; // https://www.npmjs.com/package/hardhat-deploy
    const { deployer } = await getNamedAccounts();

    await deploy("UniswapV2Factory", {
        from: deployer,
        args: [deployer], // constructor arguments
        log: true,
        waitConfirmations: network.config.blockConfirmations || 1,
    });

    log("-------------------------------------------------------------------")
}

module.exports.tags = ["all", "factory"];