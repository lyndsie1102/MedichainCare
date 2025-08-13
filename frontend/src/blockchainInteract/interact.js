import Web3 from 'web3';
import { jwtDecode } from 'jwt-decode';
import contractAddress from '../abis/contractAddress.json';


// Declare global variables
let web3;
let contract;
let currentAccount;

// Initialize Web3 (MetaMask or RPC)
const initializeWeb3 = async () => {
  if (web3) {
    // If web3 is already initialized, skip initialization
    console.log("Web3 already initialized");
    return web3;
  }

  // Proceed with initialization if Web3 is not initialized
  if (window.ethereum) {
    try {
      web3 = new Web3(window.ethereum);
      
      // Check if account is already connected
      const accounts = await web3.eth.getAccounts();
      if (accounts.length > 0) {
        currentAccount = accounts[0];
        console.log('MetaMask already connected:', currentAccount);
      } else {
        // Request MetaMask connection
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        currentAccount = accounts[0];  // Set first account as the current account
        console.log('MetaMask connected:', currentAccount);
      }
      console.log('Web3 initialized with MetaMask');
    } catch (error) {
      console.error('Error initializing Web3:', error);
    }
  } else {
    // Fallback to local provider if MetaMask is not available
    console.warn('MetaMask not detected, falling back to local provider.');
    web3 = new Web3(new Web3.providers.HttpProvider('http://127.0.0.1:7545'));
  }

  return web3;
};


// Load the contract address from a JSON file
const loadContract = async () => {
  console.log("Loading contract from address:", contractAddress.address);
  return contractAddress.address;
};


// Get the current account from localStorage or MetaMask
const loadAccount = () => {
  const token = localStorage.getItem('access_token');
  if (!token) {
    throw new Error("No access token found.");
  }

  try {
    const decodedToken = jwtDecode(token);
    currentAccount = decodedToken.eth_address
    console.log("Current account loaded:", currentAccount);
    return decodedToken.eth_address || null;
  } catch (error) {
    console.error("Error decoding token:", error);
    return null;
  }
};


// Sign and send a transaction
const signAndSendTransaction = async (method, params) => {
  try {
    if (!web3 || !currentAccount || !contract) {
      throw new Error('Web3 or Contract not initialized.');
    }

    // Check if the method exists
    if (!contract.methods[method]) {
      throw new Error(`Method ${method} not found in contract.`);
    }

    // Execute contract method with given params
    const transaction = await contract.methods[method](...params).send({
      from: currentAccount,
    });

    console.log('Transaction successful:', transaction);
    return transaction;
  } catch (error) {
    console.error('Error in signing and sending transaction:', error);
    throw error;
  }
};

// Export the functions for reuse in components
export {
  initializeWeb3,
  loadContract,
  loadAccount,
  signAndSendTransaction,
};
