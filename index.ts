import { getHttpEndpoint } from "@orbs-network/ton-access";
import { mnemonicToWalletKey } from "@ton/crypto";
import { TonClient, WalletContractV4, internal } from "@ton/ton";

async function main() {
    const mnemonic = "scorpion client submit copper sphere... (Replace your secret 24 letter key here..)";
    const key = await mnemonicToWalletKey(mnemonic.split(" "));
    const senderWallet = WalletContractV4.create({ publicKey: key.publicKey, workchain: 0 });

    const recipientAddress = "0QDR-b62rg074UUF.... test_Address(Replace it with fixed recipient)"; // Address of the fixed recipient

    const endpoint = await getHttpEndpoint({ network: "testnet" });
    const client = new TonClient({ endpoint });

    if (!await client.isContractDeployed(senderWallet.address)) {
        return console.log("Sender wallet is not deployed");
    }

    const senderContract = client.open(senderWallet);
    const seqno = await senderContract.getSeqno();

    // Calculate the amounts to be sent
    const totalAmount = 0.02;
    const senderAmount = totalAmount * 0.999;
    const recipientAmount = totalAmount * 0.001;

    await senderContract.sendTransfer({
        secretKey: key.secretKey,
        seqno: seqno,
        messages: [
            internal({
                to: senderWallet.address,
                value: senderAmount.toString(),
                body: "Refund from split bill contract",
                bounce: false,
            })
        ]
    });

    await waitForConfirmation(senderContract, seqno);

    // Send 0.1% to the fixed recipient
    await senderContract.sendTransfer({
        secretKey: key.secretKey,
        seqno: seqno + 1,
        messages: [
            internal({
                to: recipientAddress,
                value: recipientAmount.toString(),
                body: "Payment to fixed recipient",
                bounce: false,
            })
        ]
    });

    // Wait for the transaction to confirm
    await waitForConfirmation(senderContract, seqno + 1);

    console.log("Transaction confirmed!");
}

async function waitForConfirmation(contract: any, seqno: any) {
    let currentSeqno = seqno;
    while (currentSeqno <= seqno) {
        console.log("Waiting for transaction to confirm...");
        await sleep(15000);
        currentSeqno = await contract.getSeqno();
    }
}

async function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

main();