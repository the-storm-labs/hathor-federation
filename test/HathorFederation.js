const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("HathorFederation Contract", function () {
    let HathorFederation;
    let hathorFederation;
    let owner, member1, member2, nonMember;

    beforeEach(async function () {
        HathorFederation = await ethers.getContractFactory("HathorFederation");
        [owner, member1, member2, nonMember] = await ethers.getSigners();

        hathorFederation = await HathorFederation.deploy(
            [member1.address, member2.address],
            owner.address
        );
        console.log(hathorFederation.address);
    });

    describe("Deployment", function () {
        it("Should set the right owner", async function () {
            expect(await hathorFederation.owner()).to.equal(owner.address);
        });

        it("Should initialize with the correct members", async function () {
            expect(await hathorFederation.isMember(member1.address)).to.be.true;
            expect(await hathorFederation.isMember(member2.address)).to.be.true;
            expect(await hathorFederation.isMember(nonMember.address)).to.be.false;

            const members = await hathorFederation.getMembers();

            console.log("members",members);

            expect(members).to.include(member1.address);
            expect(members).to.include(member2.address);
        });
    });

    describe("Member Management", function () {
        it("Should add a new member", async function () {
            await hathorFederation.addMember(nonMember.address);
            expect(await hathorFederation.isMember(nonMember.address)).to.be.true;
        });

        it("Should not allow non-owner to add a member", async function () {
            await expect(
                hathorFederation.connect(nonMember).addMember(nonMember.address)
            ).to.be.reverted;
        });

        it("Should remove an existing member", async function () {
            await hathorFederation.removeMember(member1.address);
            expect(await hathorFederation.isMember(member1.address)).to.be.false;
        });

        it("Should not allow non-owner to remove a member", async function () {
            await expect(
                hathorFederation.connect(nonMember).removeMember(member1.address)
            ).to.be.reverted;
        });

        it("Should not allow to remove the last member", async function () {
            await hathorFederation.removeMember(member1.address);
            await expect(
                hathorFederation.removeMember(member2.address)
            ).to.be.reverted;
        });
    });

    describe("Transaction Proposals", function () {
        let txData;

        beforeEach(async function () {
            txData = {
                originalTokenAddress:
                    "0x746f6b656e733232000000000000000000000000000000000000000000000000",
                transactionHash:
                    "0x7478313030303030300000000000000000000000000000000000000000000000",
                value: 1000,
                sender:
                    "0x73656e6465723100000000000000000000000000000000000000000000000000",
                receiver:
                    "0x737472696e670000000000000000000000000000000000000000000000000000",
                transactionType: 2, // Assuming TRANSFER
                txHex: "0x1234",
            };
        });

        it("Should propose a new transaction", async function () {
            const txId = await hathorFederation.getTransactionId(
                txData.originalTokenAddress,
                txData.transactionHash,
                txData.value,
                txData.sender,
                txData.receiver,
                txData.transactionType
            );

            await expect(
                hathorFederation.connect(member1).sendTransactionProposal(
                    txData.originalTokenAddress,
                    txData.transactionHash,
                    txData.value,
                    txData.sender,
                    txData.receiver,
                    txData.transactionType,
                    txData.txHex
                )
            )
                .to.emit(hathorFederation, "TransactionProposed")
                .withArgs(
                    txData.originalTokenAddress,
                    txData.transactionHash,
                    txData.value,
                    txData.sender,
                    txData.receiver,
                    txData.transactionType,
                    txId,
                    txData.txHex
                );



            expect(await hathorFederation.isProposed(txId)).to.be.true;
        });

        it("Should not allow non-member to propose a transaction", async function () {
            await expect(
                hathorFederation.connect(nonMember).sendTransactionProposal(
                    txData.originalTokenAddress,
                    txData.transactionHash,
                    txData.value,
                    txData.sender,
                    txData.receiver,
                    txData.transactionType,
                    txData.txHex
                )
            ).to.be.revertedWith("HathorFederation: Not Federator");
        });

        it("Should not allow a member to propose the same transaction twice", async function () {
            await hathorFederation.connect(member1).sendTransactionProposal(
                txData.originalTokenAddress,
                txData.transactionHash,
                txData.value,
                txData.sender,
                txData.receiver,
                txData.transactionType,
                txData.txHex
            );

            await expect(
                hathorFederation.connect(member1).sendTransactionProposal(
                    txData.originalTokenAddress,
                    txData.transactionHash,
                    txData.value,
                    txData.sender,
                    txData.receiver,
                    txData.transactionType,
                    txData.txHex
                )
            ).to.be.revertedWith("HathorFederation: already proposed");
        });
    });

    describe("Transaction Signing", function () {
        let txData, txId;

        beforeEach(async function () {
            txData = {
                originalTokenAddress:
                    "0x746f6b656e733232000000000000000000000000000000000000000000000000",
                transactionHash:
                    "0x7478313030303030300000000000000000000000000000000000000000000000",
                value: 1000,
                sender:
                    "0x73656e6465723100000000000000000000000000000000000000000000000000",
                receiver:
                    "0x737472696e670000000000000000000000000000000000000000000000000000",
                transactionType: 2, // Assuming TRANSFER
                txHex: "0x1234",
            };

            txId = await hathorFederation.getTransactionId(
                txData.originalTokenAddress,
                txData.transactionHash,
                txData.value,
                txData.sender,
                txData.receiver,
                txData.transactionType
            );

            await hathorFederation.connect(member1).sendTransactionProposal(
                txData.originalTokenAddress,
                txData.transactionHash,
                txData.value,
                txData.sender,
                txData.receiver,
                txData.transactionType,
                txData.txHex
            );
        });

        it("Should allow a member to sign a proposed transaction", async function () {
            const signature =
                "0x3078646561646265656600000000000000000000000000000000000000000000";

            await expect(
                hathorFederation.connect(member1).updateSignatureState(
                    txData.originalTokenAddress,
                    txData.transactionHash,
                    txData.value,
                    txData.sender,
                    txData.receiver,
                    txData.transactionType,
                    signature,
                    true
                )
            )
                .to.emit(hathorFederation, "ProposalSigned")
                .withArgs(
                    txData.originalTokenAddress,
                    txData.transactionHash,
                    txData.value,
                    txData.sender,
                    txData.receiver,
                    txData.transactionType,
                    txId,
                    member1.address,
                    true,
                    signature
                );

            expect(await hathorFederation.isSigned(txId, member1.address)).to.be.true;
        });

        it("Should allow another member to sign the same transaction", async function () {
            const signature1 = "0xdeadbeef";
            const signature2 = "0xbeefdead";

            await hathorFederation.connect(member1).updateSignatureState(
                txData.originalTokenAddress,
                txData.transactionHash,
                txData.value,
                txData.sender,
                txData.receiver,
                txData.transactionType,
                signature1,
                true
            );

            await expect(
                hathorFederation.connect(member2).updateSignatureState(
                    txData.originalTokenAddress,
                    txData.transactionHash,
                    txData.value,
                    txData.sender,
                    txData.receiver,
                    txData.transactionType,
                    signature2,
                    true
                )
            )
                .to.emit(hathorFederation, "ProposalSigned")
                .withArgs(
                    txData.originalTokenAddress,
                    txData.transactionHash,
                    txData.value,
                    txData.sender,
                    txData.receiver,
                    txData.transactionType,
                    txId,
                    member2.address,
                    true,
                    signature2
                );

            expect(await hathorFederation.isSigned(txId, member2.address)).to.be.true;

            const signatureCount = await hathorFederation.getSignatureCount(txId);

            expect(signatureCount).to.equal(2);

            const signatureStruct1 = await hathorFederation.transactionSignatures(
                txId,
                0
            );
            const signatureStruct2 = await hathorFederation.transactionSignatures(
                txId,
                1
            );

            console.log("Signature 1:", signatureStruct1);
            console.log("Signature 2:", signatureStruct2);

            expect(signatureStruct1).to.equal(signature1);
            expect(signatureStruct2).to.equal(signature2);
        });

        it("Should not allow a member to sign the same transaction twice", async function () {
            const signature =
                "0x3078646561646265656600000000000000000000000000000000000000000000";

            await hathorFederation.connect(member1).updateSignatureState(
                txData.originalTokenAddress,
                txData.transactionHash,
                txData.value,
                txData.sender,
                txData.receiver,
                txData.transactionType,
                signature,
                true
            );

            await expect(
                hathorFederation.connect(member1).updateSignatureState(
                    txData.originalTokenAddress,
                    txData.transactionHash,
                    txData.value,
                    txData.sender,
                    txData.receiver,
                    txData.transactionType,
                    signature,
                    true
                )
            ).to.be.revertedWith('HathorFederation: Transaction already signed');
        });

        it("Should not allow non-member to sign a transaction", async function () {
            const signature =
                "0x3078646561646265656600000000000000000000000000000000000000000000";

            await expect(
                hathorFederation.connect(nonMember).updateSignatureState(
                    txData.originalTokenAddress,
                    txData.transactionHash,
                    txData.value,
                    txData.sender,
                    txData.receiver,
                    txData.transactionType,
                    signature,
                    true
                )
            ).to.be.revertedWith("HathorFederation: Not Federator");
        });
    });
    it("Should create a proposal, sign it, and send it, emitting the ProposalSent event", async function () {
        const txData = {
            originalTokenAddress: "0x746f6b656e733232000000000000000000000000000000000000000000000000",
            transactionHash: "0x7478313030303030300000000000000000000000000000000000000000000000",
            value: 1000,
            sender: "0x73656e6465723100000000000000000000000000000000000000000000000000",
            receiver: "0x737472696e670000000000000000000000000000000000000000000000000000",
            transactionType: 2, // Assuming TRANSFER
        };

        // Calculate the transaction ID
        const txId = await hathorFederation.getTransactionId(
            txData.originalTokenAddress,
            txData.transactionHash,
            txData.value,
            txData.sender,
            txData.receiver,
            txData.transactionType
        );

        // Step 1: Create the transaction proposal
        await hathorFederation.connect(member1).sendTransactionProposal(
            txData.originalTokenAddress,
            txData.transactionHash,
            txData.value,
            txData.sender,
            txData.receiver,
            txData.transactionType,
            "0x1234" // Placeholder for txHex
        );

        // Step 2: Sign the transaction proposal
        const signature = "0x1234"; // Example signature
        await hathorFederation.connect(member1).updateSignatureState(
            txData.originalTokenAddress,
            txData.transactionHash,
            txData.value,
            txData.sender,
            txData.receiver,
            txData.transactionType,
            signature,
            true
        );
         // Step 3: Update the transaction state, which should emit the ProposalSent event
        await expect(hathorFederation.connect(member1).updateTransactionState(
        txData.originalTokenAddress,
        txData.transactionHash,
        txData.value,
        txData.sender,
        txData.receiver,
        txData.transactionType,
        true, // sent
        "0x737472696e670000000000000000000000000000000000000000000000000000"
        ))
        .to.emit(hathorFederation, "ProposalSent")
        .withArgs(
            txData.originalTokenAddress,
            txData.transactionHash,
            txData.value,
            txData.sender,
            txData.receiver,
            txData.transactionType,
            txId,
            true,
            "0x737472696e670000000000000000000000000000000000000000000000000000"
        );

    // Verify that the transaction is marked as processed
    expect(await hathorFederation.isProcessed(txId)).to.be.true;
        
    });
    describe("Transaction Failure Functions", function () {
        let txData, txId;
    
        beforeEach(async function () {
            txData = {
                originalTokenAddress: "0x746f6b656e733232000000000000000000000000000000000000000000000000",
                transactionHash: "0x7478313030303030300000000000000000000000000000000000000000000000",
                value: 1000,
                sender: "0x73656e6465723100000000000000000000000000000000000000000000000000",
                receiver: "0x737472696e670000000000000000000000000000000000000000000000000000",
                transactionType: 2, // Assuming TRANSFER
                txHex: "0x1234"
            };
    
            txId = await hathorFederation.getTransactionId(
                txData.originalTokenAddress,
                txData.transactionHash,
                txData.value,
                txData.sender,
                txData.receiver,
                txData.transactionType
            );
    
            await hathorFederation.connect(member1).sendTransactionProposal(
                txData.originalTokenAddress,
                txData.transactionHash,
                txData.value,
                txData.sender,
                txData.receiver,
                txData.transactionType,
                txData.txHex
            );
        });
    
        it("Should set a transaction as failed", async function () {
            // Verify the initial state
            expect(await hathorFederation.isProposed(txId)).to.be.true;
            expect(await hathorFederation.isProcessed(txId)).to.be.false;
    
            // Call the function to set the transaction as failed
            await hathorFederation.setTransactionFailed(txId);
    
            // Verify the state after setting as failed
            expect(await hathorFederation.isProposed(txId)).to.be.false;
            expect(await hathorFederation.isProcessed(txId)).to.be.false;
        });
    
        it("Should not allow non-owner to set a transaction as failed", async function () {
            // Call the function with a non-owner address
            await expect(hathorFederation.connect(member1).setTransactionFailed(txId))
                .to.be.reverted;
        });
    });
    describe("Signature Failure Functions", function () {
        let txData, txId;
    
        beforeEach(async function () {
            txData = {
                originalTokenAddress: "0x746f6b656e733232000000000000000000000000000000000000000000000000",
                transactionHash: "0x7478313030303030300000000000000000000000000000000000000000000000",
                value: 1000,
                sender: "0x73656e6465723100000000000000000000000000000000000000000000000000",
                receiver: "0x737472696e670000000000000000000000000000000000000000000000000000",
                transactionType: 2, // Assuming TRANSFER
                txHex: "0x1234"
            };
    
            txId = await hathorFederation.getTransactionId(
                txData.originalTokenAddress,
                txData.transactionHash,
                txData.value,
                txData.sender,
                txData.receiver,
                txData.transactionType
            );
    
            await hathorFederation.connect(member1).sendTransactionProposal(
                txData.originalTokenAddress,
                txData.transactionHash,
                txData.value,
                txData.sender,
                txData.receiver,
                txData.transactionType,
                txData.txHex
            );
    
            const signature = "0x3078646561646265656600000000000000000000000000000000000000000000";
            await hathorFederation.connect(member1).updateSignatureState(
                txData.originalTokenAddress,
                txData.transactionHash,
                txData.value,
                txData.sender,
                txData.receiver,
                txData.transactionType,
                signature,
                true
            );
        });
    
        it("Should set a signature as failed", async function () {
            // Verify the initial state
            expect(await hathorFederation.isSigned(txId, member1.address)).to.be.true;
    
            // Call the function to set the signature as failed
            await hathorFederation.setSignatureFailed(txId, member1.address);
    
            // Verify the state after setting as failed
            expect(await hathorFederation.isSigned(txId, member1.address)).to.be.false;
        });
    
        it("Should not allow non-owner to set a signature as failed", async function () {
            // Call the function with a non-owner address
            await expect(hathorFederation.connect(member1).setSignatureFailed(txId, member1.address))
                .to.be.reverted;
        });
    });
    
    
});
