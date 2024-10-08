require("@nomicfoundation/hardhat-toolbox");
require("@nomicfoundation/hardhat-ignition-ethers");


const fs = require('fs');
const MNEMONIC = fs.existsSync('./mnemonic.key') ? fs.readFileSync('./mnemonic.key', {encoding: 'utf8'}) : ''; // Your metamask's recovery words
const INFURA_PROJECT_ID = fs.existsSync('./infura.key') ? fs.readFileSync('./infura.key', {encoding: 'utf8'}) : ''; //  Your Infura project ID


/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.24",
  networks: {
    sepolia: {
      live: false,
      url: 'https://sepolia.infura.io/v3/' + INFURA_PROJECT_ID,
      network_id: 11155111,
      token_symbol: 'e',
      gas: 6700000,
      gasPrice: 1100000000,
      accounts: {
        mnemonic: MNEMONIC,
      }
    },
    arbitrum_sepolia: {
      live: false,
      url: 'https://arbitrum-sepolia.infura.io/v3/' + INFURA_PROJECT_ID,
      network_id: 421614,
      token_symbol: 'p',
      gas: 6700000,
      gasPrice: 160000000000,
      accounts: {
        mnemonic: MNEMONIC,
      },
      tags: ['staging'],
    }, 
    amoy: {
      live: false,
      url: 'https://polygon-amoy.infura.io/v3/' + INFURA_PROJECT_ID,
      network_id: 80002,
      token_symbol: 'p',
      gas: 6700000,
      gasPrice: 160000000000,
      accounts: {
        mnemonic: MNEMONIC,
      },
      tags: ['staging'],
    }
  },
   
  settings: {
    optimizer: {
      enabled: true,
      runs: 1000,
    },
  }
} 

