module.exports = {
  // Specify the networks object to configure your networks
  networks: {
    // Ganache local network
    "ganache-local": {
      host: "127.0.0.1", // Localhost
      port: 7545, // Ganache default port
      network_id: "*", // Match any network id
      gas: 6721975, // Gas limit
      gasPrice: 20000000000, // 20 Gwei
    },
    // Other networks, such as ropsten or mainnet, can be configured here.
  },

  // Specify compilers for Solidity
  compilers: {
    solc: {
      version: "0.8.0",
    },
  },

  // Enable a deployer to use different environments.
  mocha: {
    // Mocha settings (optional)
    reporter: "spec",
  },

  // Set the network default for Ganache
  db: {
    enabled: false,
  },
};
