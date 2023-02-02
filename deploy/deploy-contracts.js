const { ethers, network } = require("hardhat");
const { Fetcher } = require('@uniswap/sdk');

module.exports = async ({ getNamedAccounts, deployments }) => {
    const { deploy, log } = deployments; // https://www.npmjs.com/package/hardhat-deploy
    const { deployer } = await getNamedAccounts();

    console.log("------------------------------- Deploy smart contracts from contracts/core -------------------------------");
    await deploy("UniswapV2Factory", {
        from: deployer,
        args: [deployer], // constructor arguments
        log: true,
        waitConfirmations: network.config.blockConfirmations || 1,
    });

    const tokenA = await deploy("TokenA", {
        from: deployer,
        contract: "TokenERC20",
        args: [ethers.utils.parseEther("1000"), "TokenA", "TKA"], // constructor arguments
        log: true,
        waitConfirmations: network.config.blockConfirmations || 1,
    });

    const tokenB = await deploy("TokenB", {
        from: deployer,
        contract: "TokenERC20",
        args: [ethers.utils.parseEther("10000"), "TokenB", "TKB"], // constructor arguments
        log: true,
        waitConfirmations: network.config.blockConfirmations || 1,
    });

    console.log("------------------------------- Create pair through deployed factory contract -------------------------------");
    const factory = await ethers.getContract("UniswapV2Factory", deployer);
    const pairAddress = await factory.createPair(tokenA.address, tokenB.address);
    console.log(`Pair deployed to ${pairAddress}.`);

    
    console.log("-------------------------------Deploy smart contracts from contracts/periphery-------------------------------");
    const weth = await deploy("WETH", {
        from: deployer,
        log: true,
        waitConfirmations: network.config.blockConfirmations || 1,
    });
    
    const router = await deploy("UniswapV2Router02", {
        from: deployer,
        args: [factory.address, weth.address], // constructor arguments
        log: true,
        waitConfirmations: network.config.blockConfirmations || 1,
    });

    log("------------------------------- Deploy smart contracts from contracts/migration -------------------------------");
    const bonusToken = await deploy("BonusToken", {
        from: deployer,
        log: true,
        waitConfirmations: network.config.blockConfirmations || 1,
    });

    const uniswapRouterAddress = "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f";
    const uniswapPairAddress = (await Fetcher.fetchPairData(tokenA.address, tokenB.address)).address;
    const liquidityMigrator = await deploy("LiquidityMigration", {
        from: deployer,
        args: [uniswapRouterAddress, uniswapPairAddress, router.address, pairAddress, bonusToken.address], // constructor arguments
        log: true,
        waitConfirmations: network.config.blockConfirmations || 1,
    });

    await bonusToken.setMigrator(liquidityMigrator.address);
}

module.exports.tags = ["all", "factory"];