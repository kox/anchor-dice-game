# Anchor Dice Game

## Overview

This Solana-based decentralized application (dApp) allows players to place and resolve bets in a secure, transparent, and decentralized manner. The program is built using the Anchor framework, which simplifies the development of Solana programs by providing a structured and easy-to-use environment.
Key Features

* Bet Placement: Players can place bets with a specified amount of SOL, which is securely stored in a house-controlled vault.
* Signature Verification: The program utilizes Ed25519 signatures to ensure the integrity and authenticity of bet placements and resolutions, preventing tampering or fraudulent activities.
* Bet Resolution: The outcome of each bet is determined by a cryptographic hash, ensuring fairness and randomness. The program also applies a configurable house edge to determine the final payout.
* Event Emission: Upon resolving a bet, the program emits events that log the outcome, providing transparency and an auditable record of all bet results.

## Architecture

The program revolves around several key instructions and account structures:

* PlaceBet: Facilitates the placement of a bet by a player. It involves transferring SOL to a vault and initializing a Bet account to store the details of the wager.
* ResolveBet: Handles the resolution of a placed bet. It verifies the bet's signature, calculates the outcome using a cryptographic hash, and transfers the payout to the player if they win.
* House Vault Management: The program uses program-derived accounts (PDAs) to manage vaults where SOL is stored securely until the bet is resolved.

## Security Considerations

* Signature Verification: To ensure that bets are legitimate and have not been tampered with, the program verifies Ed25519 signatures against the expected public key of the house.
* House Edge: A house edge is applied to all bets, ensuring that the house retains a small percentage of all payouts, thus sustaining the operation of the dApp.
* Fairness and Transparency: By using cryptographic hashing and event emission, the program ensures that all bet outcomes are both fair and publicly verifiable.

This program provides a robust foundation for decentralized betting on the Solana blockchain, leveraging the speed, security, and scalability of Solana, combined with the ease of use provided by the Anchor framework.

## Initialize Instruction
### Overview

The Initialize instruction is used to transfer a specified amount of SOL from the house account to a derived vault account. This setup can be used in decentralized applications (dApps) where an initial deposit is required into a vault account for further operations.
Accounts

The following accounts are required by the Initialize instruction:

*    house (Signer):
        Type: Signer<'info>
        Mutability: Mutable (mut)
        Description: This is the account that authorizes and initiates the transfer of SOL. The account must sign the transaction.

*    vault (SystemAccount):
        Type: SystemAccount<'info>
        Mutability: Mutable (mut)
        Description: The target account where the SOL will be transferred to. This account is derived using a seed that includes the house account's public key, ensuring a unique vault for each house. The account is expected to be initialized with sufficient lamports.

*    system_program (Program):
        Type: Program<'info, System>
        Description: A reference to the Solana System Program, which is responsible for managing SOL transfers and account creations.

### Seed Derivation

The vault account is derived using the following seeds:

*    A static string: "vault"
    The public key of the house account: house.key().as_ref()

The combination of these seeds guarantees that each house account has a unique vault account associated with it.
Instruction: initialize
Parameters

*    amount:
        Type: u64
        Description: The amount of SOL (in lamports) to be transferred from the house account to the vault account.

### Execution Flow

* CPI Context Setup:
    A Cross-Program Invocation (CPI) context is created for the Solana System Program's transfer function. This context includes:
        The from account as house.
        The to account as vault.
        The System Program as the program to execute the transfer.

*    SOL Transfer:
    The transfer function from the System Program is called with the constructed CPI context, and the specified amount is transferred from house to vault.

Example Usage

Here is a brief example of how you might call this instruction in your dApp:

```rust
// Initialize accounts
let initialize_accounts = Initialize {
    house: house_account,
    vault: vault_account,
    system_program: system_program_account,
};

// Specify the amount to transfer
let amount_to_transfer: u64 = 1_000_000; // 1 SOL (in lamports)

// Call the initialize function
initialize_accounts.initialize(amount_to_transfer)?;
```

### Error Handling

If the transfer fails, the instruction will return a Result::Err, and no SOL will be moved. Ensure the house account has sufficient balance before calling this instruction to avoid runtime errors.


## PlaceBet Instruction

### Overview

The PlaceBet instruction facilitates the creation of a bet by a player. It involves transferring a specified amount of SOL from the player's account to a house-controlled vault, and it initializes a new Bet account to store the details of the bet.

### Accounts

The following accounts are required by the PlaceBet instruction:

*    player (Signer):
        Type: Signer<'info>
        Mutability: Mutable (mut)
        Description: The player placing the bet. This account will authorize and pay for the transaction and will also fund the bet by transferring SOL to the vault.

*    house (UncheckedAccount):
        Type: UncheckedAccount<'info>
        Description: The account representing the house, which typically owns the vault. This account is unchecked, meaning it is not validated by the Solana runtime for safety, hence the CHECK comment in the code.

*    vault (SystemAccount):
        Type: SystemAccount<'info>
        Mutability: Mutable (mut)
        Description: The vault account associated with the house where the SOL from the player's bet is deposited. This account is derived using a seed that includes the house's public key, ensuring that each house has a unique vault.

*    bet (Account, Bet):
        Type: Account<'info, Bet>
        Mutability: New (init)
        Description: The new Bet account that is initialized to store the details of the player's bet. This account is created and paid for by the player. It is also derived using seeds that include the vault's public key and a unique seed provided by the player.

*    system_program (Program):
        Type: Program<'info, System>
        Description: A reference to the Solana System Program, which is responsible for managing SOL transfers and account creations.

### Seed Derivation

*    vault Account: Derived using the following seeds:
        A static string: "vault"
        The public key of the house account: house.key().as_ref()

*    bet Account: Derived using the following seeds:
        A static string: "bet"
        The public key of the vault account: vault.key().as_ref()
        The seed parameter, which is a unique u128 value provided by the player and converted to a byte array.

### Instruction Methods
#### create_bet

Purpose: Initializes the Bet account with the bet details, including the player's public key, the seed used, the bet amount, and the roll outcome.

Parameters:
        
* seed: u128 - The unique seed provided by the player to distinguish this bet.
*    roll: u8 - The outcome of the bet roll, determined by the dApp logic.
* amount: u64 - The amount of SOL being bet, in lamports.
* bumps: &PlaceBetBumps - A structure containing the bump seeds used for PDA derivation.

Execution:
 
1. Retrieves the current Solana slot using Clock::get()?.
2. Sets the inner state of the Bet account with the provided details.

Returns: 

* Result<()> - Indicates successful execution or error.
deposit

Purpose: 

Transfers the specified amount of SOL from the player account to the vault account.

Parameters:
* amount: u64 - The amount of SOL to transfer from the player's account to the vault, in lamports.

Execution:
1. Creates a Transfer object with from as player and to as vault.
2. Constructs a CPI context with the system_program.
3. Calls the transfer function to move the specified amount of SOL.

Returns: 
* Result<()> - Indicates successful execution or error.

Example Usage

Here's an example of how to use the PlaceBet instruction in a dApp:

```rust
// Initialize the PlaceBet accounts
let place_bet_accounts = PlaceBet {
    player: player_account,
    house: house_account,
    vault: vault_account,
    bet: bet_account,
    system_program: system_program_account,
};

// Call the create_bet function
place_bet_accounts.create_bet(seed, roll, bet_amount, &bumps)?;

// Deposit the bet amount into the vault
place_bet_accounts.deposit(bet_amount)?;
```

Error Handling

* Insufficient Funds: If the player’s account does not have enough SOL to cover the amount, the deposit function will return an error.
* Account Initialization Failure: If the Bet account cannot be initialized (e.g., due to insufficient lamports for rent-exemption), an error will be returned.


## ResolveBet Instruction

### Overview

The ResolveBet instruction is responsible for resolving a bet that has been placed by a player. 

This includes verifying the bet's validity through an Ed25519 signature, determining the outcome of the bet based on a cryptographic hash, and transferring the appropriate payout to the player if they win. 

The house edge is taken into account during the payout calculation.

### Constants

    HOUSE_EDGE:
        Type: u16
        Value: 150 (Represents a 1.5% house edge)
        Description: This constant is used to calculate the house's portion of the payout during a winning bet resolution.

### Accounts

The following accounts are required by the ResolveBet instruction:

*    house (Signer):
        Type: Signer<'info>
        Mutability: Mutable (mut)
        Description: The account representing the house, which authorizes and initiates the resolution of the bet.

*    player (UncheckedAccount):
        Type: UncheckedAccount<'info>
        Mutability: Mutable (mut)
        Description: The account of the player who placed the bet. This account receives the payout if the bet is successful.

*   vault (SystemAccount):
        Type: SystemAccount<'info>
        Mutability: Mutable (mut)
        Description: The vault account associated with the house where the bet amount is stored. This account is used to transfer the payout to the player's account if they win.

*   bet (Account, Bet):
        Type: Account<'info, Bet>
        Mutability: Mutable (mut)
        Close: Closed (close = player)
        Description: The account that stores the details of the bet. It is derived using seeds and will be closed (i.e., any remaining lamports will be transferred to the player) after the bet is resolved.

*   instruction_sysvar (AccountInfo):
        Type: AccountInfo<'info>
        Address: Must be the Solana instructions sysvar (solana_program::sysvar::instructions::ID)
        Description: The sysvar that contains all the instructions in the transaction. Used to verify the Ed25519 signature.

*   system_program (Program):
        Type: Program<'info, System>
        Description: A reference to the Solana System Program, which is responsible for managing SOL transfers and account creations.

### Instruction Methods

#### verify_ed25519_signature

Purpose: Verifies that the Ed25519 signature provided is valid and correctly signed by the house. This is essential to ensure the integrity of the bet resolution process.

Parameters:
* sig: &[u8] - The Ed25519 signature provided as part of the bet resolution.

Execution:
1. Loads the first instruction in the transaction using the instruction_sysvar.
2. Ensures that the instruction is from the Ed25519 program and does not involve any additional accounts.
3. Unpacks and validates the signature data to ensure it is verifiable.
4. Compares the public key and signature in the instruction with the house's key and the provided signature.
5. Confirms that the message in the signature matches the serialized bet data.

Returns: 
* Result<()> - Indicates successful verification or an error if the signature is invalid.

#### resolve_bet

Purpose: 
    
    Resolves the outcome of the bet based on a cryptographic hash of the provided signature, calculates the player's payout (if they win), and transfers the payout from the vault to the player's account.

Parameters:
* sig: &[u8] - The Ed25519 signature used to generate the cryptographic hash for determining the bet outcome.
* bumps: &ResolveBetBumps - A structure containing the bump seeds used for PDA derivation.


Execution:
1. Hashes the provided signature and splits the result into two 128-bit values.
2. Computes a "roll" value from the hash, which determines the bet outcome.
3. Emits a BetEvent with the roll result.
4. Checks if the roll value indicates a win for the player. If the player wins:
    
    a. Calculates the payout after applying the house edge.
    
    b. Transfers the payout from the vault to the player's account using a CPI to the system program's transfer function.
    
    c. The vault's seed and bump are used to sign the transfer.

Returns: 
* Result<()> - Indicates successful bet resolution or an error if the resolution fails.

### Events

    BetEvent:
        Fields:
            bet: u8 - The outcome of the bet roll.
        Description: This event is emitted during the resolve_bet method to log the result of the bet.

### Error Handling

* DiceError::Ed25519Program: Returned if the Ed25519 program is not correctly addressed.
* DiceError::Ed25519Accounts: Returned if there are accounts associated with the Ed25519 instruction (which should not be the case).
* DiceError::Ed25519DataLength: Returned if the signature data length is incorrect.
* DiceError::Ed25519Header: Returned if the Ed25519 signature data is not verifiable.
* DiceError::Ed25519Pubkey: Returned if the public key in the signature does not match the house's public key.
* DiceError::Ed25519Signature: Returned if the signature or message does not match.
* DiceError::Overflow: Returned if the payout calculation results in an overflow.