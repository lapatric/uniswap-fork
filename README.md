# Forking Uniswap

In this repository we fork Uniswap to create our very own decentralised exchange (DEX).

In order to fork Uniswap we need both Uniswap's [factory contract](https://github.com/Uniswap/v2-core/blob/master/contracts/UniswapV2Factory.sol) which is used to create markets and the [router contract](https://github.com/Uniswap/v2-periphery/blob/master/contracts/UniswapV2Router02.sol) which is used to interact with the created markets. 

## Factory contract

To clone the factory contract from Uniswap we clone the `v2-core` repository and extract the contracts into a seperate working directory `v2-core-fork`.

```bash
git clone https://github.com/Uniswap/v2-core
cp -r v2-core/contracts v2-core-fork
```

We then write a [deploy script](./v2-core-fork/deploy/deploy-contracts.js) to deploy our cloned factory contract. Additionally, we deploy two ERC20 token contracts (implemented [here](./v2-core-fork/contracts/TokenERC20.sol)) which we use to create a market (trading pair). 
Deploying two identical contracts with differing constructor arguments can be done very easily inside Hardhat by specifying the same contract artifact but different deployment names.

```javascript
await deploy("TokenA", {
    from: deployer,
    contract: "TokenERC20",
    ...
});

await deploy("TokenB", {
    from: deployer,
    contract: "TokenERC20",
    ...
});
```

The market is created inside the [`create_market.js`](./v2-core-fork/scripts/create_market.js) script as follows.

```javascript
deployer = (await getNamedAccounts()).deployer;
await deployments.fixture(["all"]);  // runs scripts with exported "all" tag in deploy folder
const factory = await ethers.getContract("UniswapV2Factory", deployer);
const tokenA = await ethers.getContract("TokenA", deployer);
const tokenB = await ethers.getContract("TokenB", deployer);

await factory.createPair(tokenA.address, tokenB.address);
```