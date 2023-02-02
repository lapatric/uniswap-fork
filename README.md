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

We then write a [deploy script](deploy/deploy-contracts.js) to deploy our cloned factory contract. Additionally, we deploy two ERC20 token contracts (implemented [here](contracts/core/TokenERC20.sol)) which we use to create a market (trading pair). Note that our ERC20 contract makes use of the `@openzeppelin/contracts` library which we must install using `yarn add --dev @openzeppelin/contracts`.

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

The market is created inside the [`create_market.js`](./scripts/create_market.js) script as follows.

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

## Liquidity Bootstrapping

Once our forked exchange has been deployed to the network and a trading pair has been created, we are ready add some liqudity to it. In order to do so we can entice existing liquidity providers on Uniswap (or another compatible Ethereum exchange) to migrate their liquidity over to our exchange. To do so, we offer them a reward in the form of a [`BonusToken`](contracts/migration/BonusToken.sol).

### BonusToken

 The BonusTokens is sent to the liquidity providers via our `LiquidityMigration` contract, which therefore needs minting rights (set via `setMigrator()`).


```solidity
contract BonusToken is ERC20 {

    address public admin;
    address public migrator;

    constructor() ERC20('Bonus Token', 'BTK') {
        admin = msg.sender;
    }

    function setMigrator(address _migrator) external {
        require(msg.sender == admin, 'only admin');
        migrator = _migrator;
    }

    function mint(address to, uint amount) external {
        require(msg.sender == migrator, 'only migrator');
        _mint(to, amount);
    }

}
```

### Liquidity Migration


An existing liquidity provider over on Uniswap must transfer their LP tokens to our exchange via our [`migration contract`](contracts/migration/LiquidityMigrator.sol). This is done by calling the `deposit()` function. In return they receive some bonusTokens. At the same time, we record the amount of new LP tokens they're eligible for on our exchange. 

```solidity
function deposit(uint amount) external {
    require(migrationDone == false, 'migration already done');
    pair.transferFrom(msg.sender, address(this), amount);
    bonusToken.mint(msg.sender, amount);
    unclaimedBalances[msg.sender] += amount;
}
```

Once enough LP tokens have been deposited, we trigger the migration via a call to `migrate()`. This fetches the underlying tokens for the received LP tokens from the respective liquidity pool over on Uniswap. The obtained tokens are then added to our trading pair via our router.

```solidity
function migrate() external {
    require(msg.sender == admin, 'only admin');
    require(migrationDone == false, 'migration already done');
    IERC20 token0 = IERC20(pair.token0());
    IERC20 token1 = IERC20(pair.token1());
    uint totalBalance = pair.balanceOf(address(this));
    router.removeLiquidity(address(token0), address(token1), totalBalance, 0, 0, address(this), block.timestamp);

    uint token0Balance = token0.balanceOf(address(this));
    uint token1Balance = token1.balanceOf(address(this));
    token0.approve(address(routerFork), token0Balance);
    token1.approve(address(routerFork), token0Balance);
    routerFork.addLiquidity(address(token0), address(token1), token0Balance, token1Balance, token0Balance, token1Balance, address(this), block.timestamp);
    migrationDone = true;
}
```

Finally, our new liquidity providers can claim their new LP tokens using the `claimLpTokens()` function in the migration contract, concluding the bootstrapping of liqudity.

```solidity
function claimLpTokens() external {
    require(unclaimedBalances[msg.sender] >= 0, 'no unclaimed balance');
    require(migrationDone == true, 'migration not done yet');
    uint amountToSend = unclaimedBalances[msg.sender];
    unclaimedBalances[msg.sender] = 0;
    pairFork.transfer(msg.sender, amountToSend);
}
```

## Deployment

To reduce the number of required scripts, the deployment of all contracts is done in a single [deployment script](deploy/deploy-contracts.js). Furthermore, this script also creates the pair (once our factory contract has been deployed) and sets the migration contract address inside our `BonusToken` contract. Note that the script is not entirely compatible with the Uniswap exchange, as it presumes the existance of a (tokenA, tokenB) trading pair on l. 60: `(await Fetcher.fetchPairData(tokenA.address, tokenB.address)).address;`. However, this could quickly be amended to work in real case scenario.