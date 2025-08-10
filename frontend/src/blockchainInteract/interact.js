import Web3 from 'web3';
import contractABI from '../abis/LogAudits.json'; // The ABI of your contract

let web3;
let contract;

// Check if MetaMask is available
if (window.ethereum) {
  // Initialize Web3 instance
  web3 = new Web3(window.ethereum);
  
  try {
    // Request account access
    window.ethereum.request({ method: 'eth_requestAccounts' }).then(() => {
      console.log("Metamask connected");
    });
  } catch (error) {
    console.error("User denied account access");
  }
} else {
  console.error("Metamask is not installed. Please install it.");
}

// Load Contract Address from JSON File
const loadContractAddress = async () => {
  try {
    const response = await fetch("/contractAddress.json");
    const data = await response.json();
    return data.address;
  } catch (error) {
    console.error("Error loading contract address", error);
  }
};

// Load Account Dynamically
const loadAccount = async () => {
  try {
    const accounts = await window.ethereum.request({
      method: "eth_requestAccounts",
    });
    const account = web3.utils.toChecksumAddress(accounts[0]);
    console.log("Account loaded: ", account);
    return account;
  } catch (error) {
    console.error("Error loading account", error);
  }
};

// Load Contract Dynamically
const loadContract = async () => {
  try {
    const contractAddress = await loadContractAddress(); // Fetch the address
    contract = new web3.eth.Contract(contractABI, contractAddress); // Create contract instance with ABI and address
    console.log("Contract loaded at:", contractAddress);
    return contract;
  } catch (error) {
    console.error("Error loading contract", error);
  }
};

// Example function to submit symptom (using the dynamic account and contract)
const submitSymptom = async (symptomDescription, treatmentConsent, referralConsent, researchConsent) => {
  const account = await loadAccount(); // Dynamically load the account
  const contract = await loadContract(); // Dynamically load the contract

  try {
    const tx = await contract.methods.submitSymptom(
      symptomDescription,
      treatmentConsent,
      referralConsent,
      researchConsent
    ).send({ from: account });

    console.log("Transaction successful:", tx);
  } catch (error) {
    console.error("Error submitting symptom:", error);
  }
};

// Export the functions for use in your components
export { loadAccount, loadContract, submitSymptom };
