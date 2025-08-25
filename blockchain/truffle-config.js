module.exports = {
  // Specify the networks object to configure your networks
  networks: {
    // Ganache local network
    "ganache-local": {
      host: "host.docker.internal", // Localhost
      port: 7545, // Ganache default port
      network_id: "5777", // Match any network id
      gas: 6721975, // Gas limit
      gasPrice: 20000000000, // 20 Gwei
    }
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
