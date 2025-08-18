import Web3 from 'web3';
import ContractABI from '../abis/contractABI'; // Import your contract ABI (JSON)
import ContractAddressData from "../abis/contractAddress.json"

const CONTRACT_ADDRESS = ContractAddressData.address; // Replace with your actual contract address

let web3;
let contract;
let account;
let isOwner;

export const setupBlockchain = async (token) => {
  if (window.ethereum) {
    try {
      // Request account access (MetaMask permission)
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      const accounts = await window.ethereum.request({ method: 'eth_accounts' });
      const activeAccount = accounts[0];

      // Assuming token contains the Ethereum address
      const ethAddress = getEthAddress(token); // Replace with how you get the ETH address
      isOwner = activeAccount.toLowerCase() === ethAddress.toLowerCase();

      // Set up Web3
      web3 = new Web3(window.ethereum);
      contract = new web3.eth.Contract(ContractABI, CONTRACT_ADDRESS);
      
      account = activeAccount;
      console.log('Blockchain setup successful', { account, isOwner });
    } catch (error) {
      console.error('Error initializing Web3:', error);
      alert('Please connect to MetaMask or another Ethereum wallet.');
    }
  } else {
    alert('Please install MetaMask!');
  }
};

export const submitSymptomToBlockchain = async ({ consent_type, role }) => {
  if (!contract || !account) {
    console.log(contract);
    console.log(account);
    throw new Error('Blockchain not initialized. Please ensure MetaMask is connected.');
  }

  const { treatment, referral, research } = consent_type;

  try {
    const tx = await contract.methods.submitSymptom(
      treatment,
      referral,
      research,
      role
    ).send({ from: account });

    console.log('Blockchain transaction successful:', tx);
  } catch (error) {
    console.error("Blockchain transaction failed:", error);
    throw new Error('Blockchain transaction failed');
  }
};

export const getEthAddress = (token) => {
  // You can define how to get the Ethereum address using the token
  // For example, decoding the token to extract the address.
  return '0xYourEthereumAddress'; // Replace with the actual logic
};

