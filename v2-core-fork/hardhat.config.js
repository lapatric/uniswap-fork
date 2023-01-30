require("@nomiclabs/hardhat-waffle")
require("@nomiclabs/hardhat-etherscan")
require("hardhat-deploy")
require("solidity-coverage")
require("hardhat-gas-reporter")
require("hardhat-contract-sizer")
require("dotenv").config()

const GOERLI_RPC_URL = process.env.GOERLI_RPC_URL;
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const COINMARKETCAP_API_KEY = process.env.COINMARKETCAP_API_KEY;
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY;

module.exports = {
  solidity: {
    compilers: [{ version: "0.5.0" }, { version: "0.5.16" }, { version: "0.6.6" }, { version: "0.8.0" }, { version: "0.8.9" } ],
    // version: "0.8.9",
    settings: {
      optimizer: {
        enabled: false,
        runs: 99999,
      },
    },
  },
  defaultNetwork: "hardhat",
  networks: {
    hardhat: {
      chainId: 31337,
      blockConfirmations: 1,
      mining: {
        auto: true, // set to FALSE when testing frontend for a more realistic experience!
        interval: [3000, 6000] // only relevant when {auto: FALSE}
      }
    },
    goerli: {
      chainId: 5,
      blockConfirmations: 6,
      url: GOERLI_RPC_URL,
      accounts: [PRIVATE_KEY],
      saveDeployments: 6,
    },
    localhost: {
      chainId: 31337,
    },
  },
  namedAccounts: {
    deployer: {
        default: 0, // deployer by default
    },
  },
  etherscan: {
    // yarn hardhat verify --network <NETWORK> <CONTRACT_ADDRESS> <CONSTRUCTOR_PARAMETERS>
    apiKey: {
        rinkeby: ETHERSCAN_API_KEY,
        goerli: ETHERSCAN_API_KEY,
    },
  },
  gasReporter: { // print gas output when running tests
    enabled: false,
    outputFile: "gas-report.txt",
    noColors: true,
    currency: "USD",
    // coinmarketcap: "COINMARKETCAP_API_KEY",
    token: "MATIC",
  },
  mocha: {
    timeout: 300000, // timeout on test afer 300ms
  }
};