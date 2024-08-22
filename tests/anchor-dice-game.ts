import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { AnchorDiceGame } from "../target/types/anchor_dice_game";
import { Transaction, Ed25519Program, Keypair, PublicKey, SystemProgram, LAMPORTS_PER_SOL, SYSVAR_INSTRUCTIONS_PUBKEY, sendAndConfirmTransaction } from "@solana/web3.js";
import { randomBytes } from "crypto"
import { BN } from "bn.js";
import { assert } from "chai";

describe("anchor-dice-game", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());
  const provider = anchor.getProvider();

  const connection = provider.connection;

  const program = anchor.workspace.AnchorDiceGame as Program<AnchorDiceGame>;

  const confirm = async (signature: string): Promise<string> => {
    const block = await connection.getLatestBlockhash();
    await connection.confirmTransaction({
      signature,
      ...block,
    });
    return signature;
  };

  const log = async (signature: string): Promise<string> => {
    console.log(
      `Your transaction signature: https://explorer.solana.com/transaction/${signature}?cluster=custom&customUrl=${connection.rpcEndpoint}`
    );
    return signature;
  };

  const MSG = Uint8Array.from(Buffer.from("1337", "hex"));
  let house = new Keypair();
  let player = new Keypair();
  let seed = new BN(randomBytes(16));

  let vault = PublicKey.findProgramAddressSync([Buffer.from("vault"), house.publicKey.toBuffer()], program.programId)[0];
  let bet = PublicKey.findProgramAddressSync([Buffer.from("bet"), vault.toBuffer(), seed.toBuffer("le", 16)], program.programId)[0];
  
  let signature: Uint8Array;

  const roll = 50;
  const topup = new BN(100 * LAMPORTS_PER_SOL);
  const betAmount = new BN(LAMPORTS_PER_SOL/100);

  it("Airdrop", async () => {
    await Promise.all([house, player].map(async (k) => {
      return await connection.requestAirdrop(
        k.publicKey, 
        1000 * anchor.web3.LAMPORTS_PER_SOL
      )
      .then(confirm)
      .then(log);
    }));
  });

  it("should initialize toping up the vault with 100 SOL!", async () => {
    await program.methods.initialize(topup)
    .accounts({
      house: house.publicKey,
    })
    .signers([
      house
    ])
    .rpc()
    .then(confirm)
    .then(log);

    const vaultBalance = await connection.getBalance(vault);
    assert.equal(vaultBalance.toString(), topup.toString());
  });
 
  it("should place a bet of 0.01 SOL!", async () => {
    const prevSlot = await connection.getSlot();

    await program.methods.placeBet(seed, roll, new BN(LAMPORTS_PER_SOL/100))
    .accounts({
      player: player.publicKey,
      house: house.publicKey,
    })
    .signers([
      player
    ])
    .rpc()
    .then(confirm)
    .then(log);

    // The bet should be added correctly 
    const betAccountData = await program.account.bet.fetch(bet);  
    assert.equal(betAccountData.player.toString(), player.publicKey.toString());
    assert.equal(betAccountData.seed.toString(), seed.toString());
    assert.equal(betAccountData.roll, roll);
    assert.equal(betAccountData.slot.toString(), (prevSlot + 1).toString());
    
    // The vault contain the 0.01 added from the bet
    const vaultBalance = await connection.getBalance(vault);
    assert.equal(vaultBalance.toString(), new BN((100 + 1/100) * LAMPORTS_PER_SOL).toString());
  });

  it("should resolve a bet the house and decide if to pay or not, and the amount", async () => {
    let betAccount = await connection.getAccountInfo(bet, "confirmed");

    let sig_ix = Ed25519Program.createInstructionWithPrivateKey({
      privateKey: house.secretKey,
      message: betAccount.data.subarray(8) // It will slice the data to get all data after the `discriminator`!? 
    });

    const resolve_ix = await program.methods.resolveBet(Buffer.from(sig_ix.data.buffer.slice(16+32, 16+32+64)))
      .accounts({
        player: player.publicKey,
        house: house.publicKey,
        vault,
        bet,
        instructionSysvar: SYSVAR_INSTRUCTIONS_PUBKEY,
        systemProgram:SystemProgram.programId 
      })
      .signers([ house ])
      .instruction();

    const tx = new Transaction().add(sig_ix).add(resolve_ix);

    let evenListener: number; 

    try {

      let betResult: number; 

      evenListener = program.addEventListener('betEvent', (event) => {
        betResult = event.bet;
      });

      await sendAndConfirmTransaction(
        program.provider.connection,
        tx,
        [house]
      ).then(log);

      const vaultBalance = await connection.getBalance(vault);

      if (betResult > roll) {
        // Player lost / house won
        assert.equal(vaultBalance.toString(), new BN((100 + 1/100) * LAMPORTS_PER_SOL).toString());
      } else {
        // player won / house lost
        assert.notEqual(vaultBalance.toString(), new BN((100 + 1/100) * LAMPORTS_PER_SOL).toString());
      }

      // TODO: Check player balance

      // TODO: calculate right house fee 1,5%
    } catch (error) {
      throw Error("It should not fail the program!");
    } finally {
      program.removeEventListener(evenListener);
    }
  });
});
