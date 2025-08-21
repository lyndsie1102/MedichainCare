const fs = require('fs');  // Import Node's file system module
const path = require('path');  // Import path module to handle file paths
const MyContract = artifacts.require("LogAudits");

module.exports = async function (deployer, network, accounts) {
  // Deploy the contract
  await deployer.deploy(MyContract);

  // Get the deployed contract instance
  const contract = await MyContract.deployed();

  // Get ABI and address from the deployed contract
  const contractABI = contract.abi;
  const contractAddress = contract.address;

  // Define the path to save the ABI and address
  const frontendPath = path.join(__dirname, '../frontend/src/abis/LogAudits.json');

  // Create an object with ABI and contract address
  const contractData = {
    abi: contractABI,
    address: contractAddress
  };

  // Write the ABI and address to the file
  fs.writeFileSync(frontendPath, JSON.stringify(contractData, null, 2));

  console.log("Contract ABI and address saved to frontend/src/abis/LogAudits.json");
};
