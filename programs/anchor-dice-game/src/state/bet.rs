use anchor_lang::prelude::*;

#[account]
// #[derive(InitSpace)] // You need to add the 8 bytes for the anchor account discriminator upon account init
pub struct Bet {
    pub player: Pubkey,
    pub seed: u128,
    pub slot: u64,
    pub amount: u64,
    pub roll: u8,
    pub bump: u8,
}

impl Bet {
    pub const INIT_SPACE: usize = 8 + 32 + 16 + 8 + 8 + 1 + 1; 

    pub fn to_slice(&self) -> Vec<u8> {
        let mut info = self.player.to_bytes().to_vec();
        
        info.extend_from_slice(&self.seed.to_le_bytes());
        info.extend_from_slice(&self.slot.to_le_bytes());
        info.extend_from_slice(&self.amount.to_le_bytes());
        info.extend_from_slice(&[self.roll, self.bump]);
        
        info
    }
}

#[event]
pub struct BetEvent {
    pub bet: u8,
}
