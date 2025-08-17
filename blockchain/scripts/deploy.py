import os
import json
from brownie import accounts, network, LogAudits
from brownie.network import gas_price
from brownie.network.gas.strategies import LinearScalingStrategy

def main():
    # Disconnect from the network to ensure we start fresh
    network.disconnect()

    # Explicitly connect to the "ganache-local" network (which points to Ganache GUI)
    network.connect('ganache-local')  # This ensures you're using Ganache's configuration

    # Define the gas price strategy for Ganache
    gas_strategy = LinearScalingStrategy("60 gwei", "70 gwei", 1.1)
    
    # Apply the gas price strategy only if using ganache-local network
    if network.show_active() == "ganache-local":
        gas_price(gas_strategy)

    # Use the first Ganache account (patient) for deployment
    patient = accounts[0]

    print("Deploying LogAudits contract...")

    # Deploy the contract from the selected account (patient)
    healthcare_app = LogAudits.deploy({'from': patient})

    print(f"Contract deployed to: {healthcare_app.address}")
    print(f"Deployed by account: {patient}")

    # Define the correct path to save the contract address
    address_path = "../frontend/src/abis/contractAddress.json"
    abi_path = "../frontend/src/abis/contractABI.json"

    # Ensure the directory exists before writing the file
    os.makedirs(os.path.dirname(address_path), exist_ok=True)
    os.makedirs(os.path.dirname(abi_path), exist_ok=True)
    # Save the contract address to the JSON file
    contract_address = {"address": healthcare_app.address}
    with open(address_path, "w") as address_file:
        json.dump(contract_address, address_file)

    # Save the contract ABI to the ABI JSON file
    contract_abi = healthcare_app.abi
    with open(abi_path, "w") as abi_file:
        json.dump(contract_abi, abi_file)

    print(f"Contract address saved to {address_path}")
    print(f"Contract ABI saved to {abi_path}")