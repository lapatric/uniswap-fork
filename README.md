# Forking Uniswap

In this repository we fork Uniswap to create our very own decentralised exchange (DEX).

In order to fork Uniswap we need both Uniswap's [factory contract](https://github.com/Uniswap/v2-core/blob/master/contracts/UniswapV2Factory.sol) which is used to create markets and the [router contract](https://github.com/Uniswap/v2-periphery/blob/master/contracts/UniswapV2Router02.sol) which is used to interact with the created markets. 

## Factory contract

To clone the factory contract from Uniswap we clone the `v2-core` repository and extract the contracts into a seperate working directory `v2-core-fork`.

```bash
git clone https://github.com/Uniswap/v2-core
mkdir contracts/core
cp -r v2-core/contracts v2-core-fork/contracts/core
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

## Router Contract

To deploy a router contract for our forked exchange we need to clone Uniswap's [router contract](https://github.com/Uniswap/v2-periphery/blob/master/contracts/UniswapV2Router02.sol) from their `v2-periphery` repo.

```bash
git clone https://github.com/Uniswap/v2-core
mkdir contracts/periphery
cp -r v2-core/contracts v2-core-fork/contracts/periphery
```

Upon trying to compile this new set of contracts, we find that they require both [`@uniswap/lib`](https://github.com/Uniswap/solidity-lib) and [`uniswap/v2-core`](https://github.com/Uniswap/v2-core), which can be installed as follows.

```bash
yarn add --dev @uniswap/lib
yarn add --dev @uniswap/v2-core
```

Note, that certain contracts in `@uniswap/lib` throw the compliation error `"Explicit type conversion not allowed from "int_const -1" to "uint128""`. This is because our Hardhat environment attempts to compile them using the latest compatible compiler version specified in `hardhat.config.js`. For contracts with `pragma solidity >=...`, the latest compatible version is `0.8.9`. However, since version `0.8.0` the use of `uint128(-1)` which is at the root of the error is no longer allowed:   

> Prior to version 0.8.0, any decimal or hexadecimal number literals could be explicitly converted to an integer type. From 0.8.0, such explicit conversions are as strict as implicit conversions, i.e., they are only allowed if the literal fits in the resulting range.

To amend this issue, we must either change `uint128(-1)` to `type(uint128).max` or upperbound the solidity version to one that is below `0.8.0`. We opt for the second approach by specifying `pragma solidity 0.6.6` in the respective smart contracts.

Hardhat offers a third approach for smart contracts that lie inside the `contracts` folders. In such cases, the exact compiler version to be used by a contract can be specified in `hardhat.config.js` under `solidity.overrides` as described [here](https://hardhat.org/hardhat-runner/docs/advanced/multiple-solidity-versions).

At this point we are ready to deploy our cloned router contract which concludes this section.

```javascript
await deploy("UniswapV2Router02", {
    from: deployer,
    args: [factory.address, weth.address], // constructor arguments
    log: true,
    waitConfirmations: network.config.blockConfirmations || 1,
});
```

