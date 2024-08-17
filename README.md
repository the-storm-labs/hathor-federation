
```markdown
# HathorFederation Smart Contract

The `HathorFederation` smart contract is designed to manage a decentralized federation of members who can propose, sign, and process transactions within the Hathor network. This contract enforces federator permissions and ensures that only designated members can participate in the transaction flow.

## Features

- **Federation Management**: Add and remove federation members.
- **Transaction Proposal**: Members can propose transactions, which include MELT, MINT, TRANSFER, and RETURN types.
- **Signature Handling**: Members can sign transaction proposals, and their signatures are recorded.
- **Transaction State Management**: Tracks whether a transaction has been signed by enough members and whether it has been processed.

## Contract Overview

### State Variables

- `members`: An array of addresses representing the current members of the federation.
- `isMember`: A mapping that tracks whether an address is a member.
- `isSigned`: A mapping that tracks if a transaction has been signed by a particular member.
- `isProcessed`: A mapping that tracks if a transaction has been fully processed.
- `isProposed`: A mapping that tracks if a transaction has been proposed.
- `transactionHex`: A mapping that stores the transaction hex data.
- `transactionSignatures`: A mapping that stores the signatures for each transaction.

### Events

- `ProposalSigned`: Emitted when a member signs a transaction proposal.
- `ProposalSent`: Emitted when a transaction has been fully processed.
- `TransactionProposed`: Emitted when a new transaction is proposed.
- `MemberAddition`: Emitted when a new member is added to the federation.
- `MemberRemoval`: Emitted when a member is removed from the federation.

### Modifiers

- `onlyMember`: Ensures that the caller is a member of the federation.

### Functions

#### Constructor

```solidity
constructor(address[] memory _members, address owner)
```
Initializes the contract with a list of members and an owner.

#### Transaction Management

- **getTransactionId**: Generates a unique transaction ID based on the transaction details.
  
  ```solidity
  function getTransactionId(
      bytes32 originalTokenAddress,
      bytes32 transactionHash,
      uint256 value,
      bytes32 sender,
      bytes32 receiver,
      TransactionType transactionType
  ) external pure returns (bytes32);
  ```

- **sendTransactionProposal**: Allows a member to propose a new transaction.
  
  ```solidity
  function sendTransactionProposal(
      bytes32 originalTokenAddress,
      bytes32 transactionHash,
      uint256 value,
      bytes32 sender,
      bytes32 receiver,
      TransactionType transactionType,
      bytes memory txHex
  ) external onlyMember;
  ```

- **updateSignatureState**: Allows a member to sign a transaction proposal.
  
  ```solidity
  function updateSignatureState(
      bytes32 originalTokenAddress,
      bytes32 transactionHash,
      uint256 value,
      bytes32 sender,
      bytes32 receiver,
      TransactionType transactionType,
      bytes memory signature,
      bool signed
  ) external onlyMember;
  ```

- **updateTransactionState**: Marks a transaction as processed once it has received the necessary signatures.
  
  ```solidity
  function updateTransactionState(
      bytes32 originalTokenAddress,
      bytes32 transactionHash,
      uint256 value,
      bytes32 sender,
      bytes32 receiver,
      TransactionType transactionType,
      bool sent
  ) external onlyMember;
  ```

#### Federation Management

- **addMember**: Adds a new member to the federation.
  
  ```solidity
  function addMember(address _newMember) external onlyOwner;
  ```

- **removeMember**: Removes an existing member from the federation.
  
  ```solidity
  function removeMember(address _oldMember) external onlyOwner;
  ```

- **getMembers**: Returns the list of current federation members.
  
  ```solidity
  function getMembers() external view returns (address[] memory);
  ```

## Installation

To deploy the `HathorFederation` smart contract, you'll need to have a working environment with Solidity and a compatible Ethereum development framework like Truffle or Hardhat.

### Try running some of the following tasks:

```bash
npx hardhat help
npx hardhat test
REPORT_GAS=true npx hardhat test
npx hardhat node
npx hardhat ignition deploy ./ignition/modules/Federattion.js
```

### Deploying the Contract

Deploy the contract with an initial set of federation members and an owner:

```solidity
const HathorFederation = artifacts.require("HathorFederation");

module.exports = function(deployer) {
    deployer.deploy(HathorFederation, ["0xAddress1", "0xAddress2"], "0xOwnerAddress");
};
```

### Proposing a Transaction

Once deployed, a member can propose a transaction by calling the `sendTransactionProposal` function.

### Signing a Transaction

Members can sign a proposed transaction by invoking the `updateSignatureState` function.

### Processing a Transaction

Once all necessary signatures are collected, the transaction can be processed by calling `updateTransactionState`.

## License

This project is licensed under the MIT License.
```

This README file now includes instructions for running the Hardhat tasks as part of a sample project setup.