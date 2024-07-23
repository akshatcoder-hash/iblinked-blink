import { PublicKey } from '@solana/web3.js';

export const PROGRAM_ID = new PublicKey('2cg3renf4CzNLw8nJoAdxnyP4jLuww3oGJS1nj5UFB2F');
export const RPC_URL = 'https://api.mainnet-beta.solana.com';
export const USER_POSITION_SEED = 'user_position';
export const PRICE_FEED_CONFIG_SEED = 'price_feed_config';

export const TEAM_WALLET = new PublicKey('GerW59qscGWPJarbe8Px3sUVEXJ269Z9RQndYc9MWxCe');
export const MARKET_CREATION_AUTHORITY = new PublicKey('4EUxX4o9FHcspLkMnMrarfJ2fWkjaJvYwLntHusxYEQN');

export const MARKET_CREATION_FEE = 100_000_000;
export const MIN_BET_AMOUNT = 1_000_000;
export const STALENESS_THRESHOLD = 60;

export const MARKET_PDA_SEED = 'market';