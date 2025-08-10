import os
import json
from brownie import accounts, network, LogAudits

def main():
    # Disconnect from the network
    network.disconnect()

    # Explicitly use the "development" network (which points to Ganache GUI)
    network.connect('ganache-local')  # This makes sure you use Ganache GUI's configuration

    patient = accounts[0]  # Use the first Ganache account

    print("Deploying LogAudits contract...")
    healthcare_app = LogAudits.deploy({'from': patient})

    print(f"Contract deployed to: {healthcare_app.address}")
    print(f"Deployed by account: {patient}")

    # Define the correct path to the contract address file
    
    path = "../frontend/src/abis/contractAddress.json"
    # Ensure the directory exists before writing the file
    os.makedirs(os.path.dirname(path), exist_ok=True)

    # Save the contract address to the JSON file
    contract_address = {"address": healthcare_app.address}
    with open(path, "w") as outfile:
        json.dump(contract_address, outfile)

    print(f"Contract address saved to {path}")
