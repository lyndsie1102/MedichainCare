import Web3 from 'web3';
import ContractABIData from '../abis/LogAudits.json'; // Import your contract ABI (JSON)
import { jwtDecode } from 'jwt-decode';

const CONTRACT_ADDRESS = ContractABIData.address;
const ContractABI = ContractABIData.abi;

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
      account = getEthAddress(token); // Replace with how you get the ETH address
      isOwner = activeAccount.toLowerCase() === account.toLowerCase();
      if (!isOwner) {
        throw new Error("Incorrect MetaMask account"); // Throw an error if accounts don't match
      }

      // Set up Web3
      web3 = new Web3(window.ethereum);
      contract = new web3.eth.Contract(ContractABI, CONTRACT_ADDRESS);

      console.log('Blockchain setup successful', { account, isOwner });
    } catch (error) {
      console.error('Error initializing Web3:', error);
      throw error;
    }
  } else {
    throw new Error('MetaMask is not installed.');
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


// Add Diagnosis to Blockchain
export const addDiagnosisToBlockchain = async ({ role }) => {
  if (!contract || !account) {
    console.log(contract);
    console.log(account);
    throw new Error('Blockchain not initialized. Please ensure MetaMask is connected.');
  }

  try {
    const tx = await contract.methods.addDiagnosis(role).send({ from: account });
    console.log('Diagnosis added successfully:', tx);
  } catch (error) {
    console.error('Error adding diagnosis:', error);
    throw new Error('Blockchain transaction failed');
  }
};

// Refer to Another Doctor on Blockchain
export const referToDoctorOnBlockchain = async ({ role }) => {
  if (!contract || !account) {
    console.log(contract);
    console.log(account);
    throw new Error('Blockchain not initialized. Please ensure MetaMask is connected.');
  }

  try {
    const tx = await contract.methods.referToDoctor(role).send({ from: account });
    console.log('Referral to doctor successful:', tx);
  } catch (error) {
    console.error('Error referring to doctor:', error);
    throw new Error('Blockchain transaction failed');
  }
};

// Assign Test to Lab Staff on Blockchain
export const assignTestToLabBlockchain = async ({ role }) => {
  if (!contract || !account) {
    console.log(contract);
    console.log(account);
    throw new Error('Blockchain not initialized. Please ensure MetaMask is connected.');
  }

  try {
    const tx = await contract.methods.assignTest(role).send({ from: account });
    console.log('Test assigned to lab staff:', tx);
  } catch (error) {
    console.error('Error assigning test:', error);
    throw new Error('Blockchain transaction failed');
  }
};

// Update Test Results on Blockchain
export const updateTestResultsOnBlockchain = async ({ role }) => {
  if (!contract || !account) {
    console.log(contract);
    console.log(account);
    throw new Error('Blockchain not initialized. Please ensure MetaMask is connected.');
  }

  try {
    const tx = await contract.methods.updateTestResults(role).send({ from: account });
    console.log('Test results updated:', tx);
  } catch (error) {
    console.error('Error updating test results:', error);
    throw new Error('Blockchain transaction failed');
  }
};


export const getEthAddress = (token) => {
  try {
    // Decode the token
    const decodedToken = jwtDecode(token);
    // Extract the eth_address
    const ethAddress = decodedToken.eth_address;
    return ethAddress;
    // Use the eth_address as needed
  } catch (error) {
    console.error("Error decoding token:", error);
  }
}
