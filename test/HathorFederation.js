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
                    "0x00000000000000000000000076c6af5a264a4fa4360432e365f5a80503476415",
                transactionHash:
                    "0x2336a2c4c79a4343392233ea209fede3c48c8531a6d6af5975c6363c4559d38a",
                value: "1000000000000000000",
                sender:
                    "0xCC3CF44397Daa4572CDb20f72dee5700507454E4",
                receiver:
                    "WjDz74uofMpF87xy9F9F1HYs9rjU6vY8Gr",
                transactionType: 1, // Assuming TRANSFER
                txHex: "0x000101020200000d22ea79269e96b4797dc9fa8ac0d261fce7c3b55a23866a74d74eb828d2000000008a5dde956781005a46c585af223fbf4b411b89db26a926ecb7aee2ec02000000000b135b3728d481627da9a0e76b217001f9fd7c665b5bcc20451ce6cccad60100000000006401001976a914e16d82e4b91356d33f22566337a594b7078590e488ac00000001810017a91468a9f4f1fdcf0c1bf958100d16c62c0ac3411aed874030c8ec92a90b1f66d23e5e0000000000",
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
            const signature ="03540e9ab3a4827f3110fe795308c2989055edc519840294a067f01e9652d70efe|0:3045022100d1faae47d7b105b7e8ab223715841d71c761ae85470ca74b93be1b3da39cc45f022008a8c7f001dc19728630af4de25dda8400666d0ba94781859f1ffdc1289cf84b|1:3045022100a1e9690e7b86fbca6088553f31e24e0652e97cb6c2a5a5bdfe7625271fa331110220541eb1cf9816c0ef34bfa6e4160eff48a73752efaf6b8df3c4689d276358017e";

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
            const signature1 = "03540e9ab3a4827f3110fe795308c2989055edc519840294a067f01e9652d70efe|0:3045022100d1faae47d7b105b7e8ab223715841d71c761ae85470ca74b93be1b3da39cc45f022008a8c7f001dc19728630af4de25dda8400666d0ba94781859f1ffdc1289cf84b|1:3045022100a1e9690e7b86fbca6088553f31e24e0652e97cb6c2a5a5bdfe7625271fa331110220541eb1cf9816c0ef34bfa6e4160eff48a73752efaf6b8df3c4689d276358017e";
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
    
        it("Should set a transaction as failed", async function () {
            // Verify the initial state
            expect(await hathorFederation.isProposed(txId)).to.be.true;
            expect(await hathorFederation.isProcessed(txId)).to.be.false;
            expect(await hathorFederation.getSignatureCount(txId)).to.be.equal(1)
    
            // Call the function to set the transaction as failed
            await hathorFederation.setTransactionFailed(txData.originalTokenAddress,
                txData.transactionHash,
                txData.value,
                txData.sender,
                txData.receiver,
                txData.transactionType);
    
            // Verify the state after setting as failed
            expect(await hathorFederation.isProposed(txId)).to.be.false;
            expect(await hathorFederation.isProcessed(txId)).to.be.false;
            expect(await hathorFederation.getSignatureCount(txId)).to.be.equal(0)
        });
    
        it("Should not allow non-owner to set a transaction as failed", async function () {
            // Call the function with a non-owner address
            await expect(hathorFederation.connect(member1).setTransactionFailed( txData.originalTokenAddress,
                txData.transactionHash,
                txData.value,
                txData.sender,
                txData.receiver,
                txData.transactionType))
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
            await hathorFederation.setTransactionFailed( txData.originalTokenAddress,
                txData.transactionHash,
                txData.value,
                txData.sender,
                txData.receiver,
                txData.transactionType);
    
            // Verify the state after setting as failed
            expect(await hathorFederation.isSigned(txId, member1.address)).to.be.false;
        });
    
        it("Should not allow non-owner to set a signature as failed", async function () {
            // Call the function with a non-owner address
            await expect(hathorFederation.connect(member1).setTransactionFailed( txData.originalTokenAddress,
                txData.transactionHash,
                txData.value,
                txData.sender,
                txData.receiver,
                txData.transactionType)).to.be.reverted;
        });
    });
    
    
});
