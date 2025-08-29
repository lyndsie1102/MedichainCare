module.exports = {
  networks: {
    // Ganache local network
    "docker": {
      host: "host.docker.internal",
      port: 7545, // Ganache default port
      network_id: "5777", // Match any network id
      gas: 6721975, // Gas limit
      gasPrice: 20000000000, // 20 Gwei
    },
    "ganache-local": {
      host: "127.0.0.1", // Localhost
      port: 7545, // Ganache default port
      network_id: "5777", // Match any network id
      gas: 6721975, // Gas limit
      gasPrice: 20000000000, // 20 Gwei
    },
    "docker_ganache": {
      host: "blockchain", 
      port: 7545,
      network_id: "*",
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
