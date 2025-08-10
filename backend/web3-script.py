from web3 import Web3
from models import User

# Connect to the Ganache instance (local Ethereum node)
web3 = Web3(Web3.HTTPProvider('http://127.0.0.1:7545'))

# Check if the connection is successful
if web3.is_connected():
    print("Connected to Ganache")

    # Get the list of accounts from Ganache
    ganache_accounts = web3.eth.accounts
    print("Ganache Accounts:", ganache_accounts)

else:
    print("Failed to connect to Ganache")

