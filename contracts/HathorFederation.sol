// SPDX-License-Identifier: MIT

pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
//update txhex and signatures

contract HathorFederation is Ownable {
    address private constant NULL_ADDRESS = address(0);
    uint public constant MAX_MEMBER_COUNT = 50;
    //uint256 public signatures_required;

    address[] public members;

    struct Signatures {
        bytes signature;
    }

    /**
	@notice All the addresses that are members of the HathorFederation
	@dev The address should be a member to vote in transactions
	*/

    mapping(address => bool) public isMember;

    mapping(bytes32 => bool) public isProcessed;
    mapping(bytes32 => bool) public isProposed;
    mapping(bytes32 => bytes) public transactionHex;
    mapping(bytes32 => Signatures[]) public transactionSignatures;
    mapping(bytes32 => mapping(address => bool)) public isSigned;

    enum TransactionType {
        MELT,
        MINT,
        TRANSFER,
        RETURN
    }

    modifier onlyMember() {
        require(isMember[_msgSender()], "HathorFederation: Not Federator");
        _;
    }

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

    event ProposalSent(
        bytes32 originalTokenAddress,
        bytes32 transactionHash,
        uint256 value,
        bytes32 sender,
        bytes32 receiver,
        TransactionType transactionType,
        bytes32 indexed transactionId,
        bool processed
    );
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

    event MemberAddition(address indexed member);
    event MemberRemoval(address indexed member);

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

    function updateTransactionState(
        bytes32 originalTokenAddress,
        bytes32 transactionHash,
        uint256 value,
        bytes32 sender,
        bytes32 receiver,
        TransactionType transactionType,
        bool sent,
        bytes calldata txId
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
        emit ProposalSent(originalTokenAddress,
            transactionHash,
            value,
            sender,
            receiver,            
            transactionType,
            transactionId,
            sent
        );
    }

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

    function removeMember(address _oldMember) external onlyOwner {
        require(_oldMember != NULL_ADDRESS, "HathorFederation: Empty member");
        require(
            isMember[_oldMember],
            "HathorFederation: Member doesn't exists"
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
        members.pop(); // remove an element from the end of the array.
        emit MemberRemoval(_oldMember);
    }

    /**
		@notice Return all the current members of the HathorFederation
		@return Current members
		*/
    function getMembers() external view returns (address[] memory) {
        return members;
    }

    function getSignatureCount(
        bytes32 transactionId
    ) external view returns (uint256) {
        return transactionSignatures[transactionId].length;
    }
}
