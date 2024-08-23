// SPDX-License-Identifier: MIT

pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";

// HathorFederation contract: Manages transaction proposals, voting, and member management
contract HathorFederation is Ownable {
    address private constant NULL_ADDRESS = address(0);
    uint public constant MAX_MEMBER_COUNT = 50;

    address[] public members;  // List of members in the federation

    struct Signatures {
        bytes signature;  // Holds a signature
    }

    // Mapping to check if an address is a member
    mapping(address => bool) public isMember;

    // Mappings for transaction processing and proposal tracking
    mapping(bytes32 => bool) public isProcessed;  // Checks if a transaction has been processed
    mapping(bytes32 => bool) public isProposed;   // Checks if a transaction has been proposed
    mapping(bytes32 => bytes) public transactionHex; // Stores the hex representation of transactions
    mapping(bytes32 => Signatures[]) public transactionSignatures; // Stores signatures for transactions
    mapping(bytes32 => mapping(address => bool)) public isSigned; // Checks if a member has signed a transaction

    enum TransactionType {
        MELT,
        MINT,
        TRANSFER,
        RETURN
    }

    // Modifier to restrict function access to members only
    modifier onlyMember() {
        require(isMember[_msgSender()], "HathorFederation: Not Federator");
        _;
    }

    // Event emitted when a proposal is signed
    event ProposalSigned(
        bytes32 originalTokenAddress,
        bytes32 transactionHash,
        uint256 value,
        bytes32 sender,
        bytes32 receiver,
        TransactionType transactionType,
        bytes32 indexed transactionId,
        address indexed member,
        bool signed,
        bytes signature
    );

    // Event emitted when a proposal is sent
    event ProposalSent(
        bytes32 originalTokenAddress,
        bytes32 transactionHash,
        uint256 value,
        bytes32 sender,
        bytes32 receiver,
        TransactionType transactionType,
        bytes32 indexed transactionId,
        bool processed,
        bytes32 hathorTxId
    );

    // Event emitted when a transaction is proposed
    event TransactionProposed(
        bytes32 originalTokenAddress,
        bytes32 transactionHash,
        uint256 value,
        bytes32 sender,
        bytes32 receiver,
        TransactionType transactionType,
        bytes32 transactionId,
        bytes txHex
    );

    // Event emitted when a new member is added
    event MemberAddition(address indexed member);

    // Event emitted when a member is removed
    event MemberRemoval(address indexed member);

    // Event emitted when a transaction fails
    event TransactionFailed(bytes32 indexed transactionId);

    // Event emitted when a signature fails
    event SignaturaFailed(bytes32 indexed transactionId, address member);

    /**
     * @notice Constructor initializes the federation with members and owner
     * @param _members List of initial members
     * @param owner Address of the contract owner
     */
    constructor(address[] memory _members, address owner) Ownable(owner) {
        require(
            _members.length <= MAX_MEMBER_COUNT,
            "HathorFederation: Too many members"
        );
        members = _members;
        for (uint i = 0; i < _members.length; i++) {
            require(
                !isMember[_members[i]] && _members[i] != NULL_ADDRESS,
                "HathorFederation: Invalid members"
            );
            isMember[_members[i]] = true;
            emit MemberAddition(_members[i]);
        }
    }

    /**
     * @notice Generates a unique transaction ID based on transaction details
     * @param originalTokenAddress Address of the original token
     * @param transactionHash Hash of the transaction
     * @param value Value of the transaction
     * @param sender Address of the sender
     * @param receiver Address of the receiver
     * @param transactionType Type of the transaction (MELT, MINT, TRANSFER, RETURN)
     * @return transactionId Unique identifier for the transaction
     */
    function getTransactionId(
        bytes32 originalTokenAddress,
        bytes32 transactionHash,
        uint256 value,
        bytes32 sender,
        bytes32 receiver,
        TransactionType transactionType
    ) external pure returns (bytes32) {
        bytes32 transactionId = keccak256(
            abi.encodePacked(
                originalTokenAddress,
                sender,
                receiver,
                value,
                transactionHash,
                transactionType
            )
        );
        return transactionId;
    }

    /**
     * @notice Proposes a new transaction for federation members to vote on
     * @param originalTokenAddress Address of the original token
     * @param transactionHash Hash of the transaction
     * @param value Value of the transaction
     * @param sender Address of the sender
     * @param receiver Address of the receiver
     * @param transactionType Type of the transaction (MELT, MINT, TRANSFER, RETURN)
     * @param txHex Hex representation of the transaction
     */
    function sendTransactionProposal(
        bytes32 originalTokenAddress,
        bytes32 transactionHash,
        uint256 value,
        bytes32 sender,
        bytes32 receiver,
        TransactionType transactionType,
        bytes memory txHex
    ) external onlyMember {
        bytes32 transactionId = keccak256(
            abi.encodePacked(
                originalTokenAddress,
                sender,
                receiver,
                value,
                transactionHash,
                transactionType
            )
        );

        require(
            isProposed[transactionId] == false,
            "HathorFederation: already proposed"
        );
        transactionHex[transactionId] = txHex;
        isProposed[transactionId] = true;
        emit TransactionProposed(
            originalTokenAddress,
            transactionHash,
            value,
            sender,
            receiver,
            transactionType,
            transactionId,
            txHex
        );
    }

    /**
     * @notice Updates the signature state of a transaction
     * @param originalTokenAddress Address of the original token
     * @param transactionHash Hash of the transaction
     * @param value Value of the transaction
     * @param sender Address of the sender
     * @param receiver Address of the receiver
     * @param transactionType Type of the transaction (MELT, MINT, TRANS
    /**
     * @notice Updates the signature state of a transaction
     * @param originalTokenAddress Address of the original token
     * @param transactionHash Hash of the transaction
     * @param value Value of the transaction
     * @param sender Address of the sender
     * @param receiver Address of the receiver
     * @param transactionType Type of the transaction (MELT, MINT, TRANSFER, RETURN)
     * @param signature Signature provided by the member
     * @param signed Boolean indicating if the transaction is signed or not
     */
    function updateSignatureState(
        bytes32 originalTokenAddress,
        bytes32 transactionHash,
        uint256 value,
        bytes32 sender,
        bytes32 receiver,
        TransactionType transactionType,
        bytes memory signature,
        bool signed
    ) external onlyMember {
        bytes32 transactionId = keccak256(
            abi.encodePacked(
                originalTokenAddress,
                sender,
                receiver,
                value,
                transactionHash,
                transactionType
            )
        );

        require(
            isSigned[transactionId][_msgSender()] == false,
            "HathorFederation: Transaction already signed"
        );

        isSigned[transactionId][_msgSender()] = signed;
        transactionSignatures[transactionId].push(Signatures(signature));

        emit ProposalSigned(
            originalTokenAddress,
            transactionHash,
            value,
            sender,
            receiver,
            transactionType,
            transactionId,
            _msgSender(),
            signed,
            signature
        );
    }

    /**
     * @notice Updates the processing state of a transaction
     * @param originalTokenAddress Address of the original token
     * @param transactionHash Hash of the transaction
     * @param value Value of the transaction
     * @param sender Address of the sender
     * @param receiver Address of the receiver
     * @param transactionType Type of the transaction (MELT, MINT, TRANSFER, RETURN)
     * @param sent Boolean indicating if the transaction has been sent
     * @param hathorTxId Transaction ID on the Hathor network
     */
    function updateTransactionState(
        bytes32 originalTokenAddress,
        bytes32 transactionHash,
        uint256 value,
        bytes32 sender,
        bytes32 receiver,
        TransactionType transactionType,
        bool sent,
        bytes32  hathorTxId
    ) external onlyMember {
        bytes32 transactionId = keccak256(
            abi.encodePacked(
                originalTokenAddress,
                sender,
                receiver,
                value,
                transactionHash,
                transactionType
            )
        );
        require(
            isProcessed[transactionId] == false,
            "HathorFederation: Transaction already sent"
        );
        isProcessed[transactionId] = sent;
        emit ProposalSent(
            originalTokenAddress,
            transactionHash,
            value,
            sender,
            receiver,
            transactionType,
            transactionId,
            sent,
            hathorTxId
        );
    }

    /**
     * @notice Adds a new member to the federation
     * @param _newMember Address of the new member to be added
     */
    function addMember(address _newMember) external onlyOwner {
        require(_newMember != NULL_ADDRESS, "HathorFederation: Empty member");
        require(
            !isMember[_newMember],
            "HathorFederation: Member already exists"
        );

        isMember[_newMember] = true;
        members.push(_newMember);
        emit MemberAddition(_newMember);
    }

    /**
     * @notice Removes an existing member from the federation
     * @param _oldMember Address of the member to be removed
     */
    function removeMember(address _oldMember) external onlyOwner {
        require(_oldMember != NULL_ADDRESS, "HathorFederation: Empty member");
        require(
            isMember[_oldMember],
            "HathorFederation: Member doesn't exist"
        );
        require(
            members.length > 1,
            "HathorFederation: Can't remove all the members"
        );

        isMember[_oldMember] = false;
        for (uint i = 0; i < members.length - 1; i++) {
            if (members[i] == _oldMember) {
                members[i] = members[members.length - 1];
                break;
            }
        }
        members.pop(); // Remove the last element of the array
        emit MemberRemoval(_oldMember);
    }

    /**
     * @notice Returns all current members of the federation
     * @return Current members of the federation
     */
    function getMembers() external view returns (address[] memory) {
        return members;
    }

    /**
     * @notice Gets the count of signatures for a specific transaction ID
     * @param transactionId Unique identifier for the transaction
     * @return Number of signatures for the transaction
     */
    function getSignatureCount(
        bytes32 transactionId
    ) external view returns (uint256) {
        return transactionSignatures[transactionId].length;
    }

    /**
     * @notice Marks a transaction as failed and resets its state
     * @param transactionId Unique identifier for the transaction
     */
    function setTransactionFailed(bytes32 transactionId) external onlyOwner {
        isProcessed[transactionId] = false;
        isProposed[transactionId] = false;

        emit TransactionFailed(transactionId);
    }

    /**
     * @notice Marks a signature as failed for a specific transaction ID
     * @param transactionId Unique identifier for the transaction
     * @param member Address of the member whose signature failed
     */
    function setSignatureFailed(bytes32 transactionId, address member) external onlyOwner {
        isSigned[transactionId][member] = false;

        emit SignaturaFailed(transactionId, member);
    }
}
