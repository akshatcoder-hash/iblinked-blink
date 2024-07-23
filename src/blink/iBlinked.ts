import { ActionGetResponse, ActionPostResponse } from '@solana/actions';
import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import { AnchorProvider, Program, BN, Idl } from '@project-serum/anchor';
import { IDL, BlinkTake2 } from '../idl/blink_take_2';
import {   
  PROGRAM_ID, 
  USER_POSITION_SEED, 
  PRICE_FEED_CONFIG_SEED, 
  TEAM_WALLET, 
  MARKET_CREATION_AUTHORITY 
 } from '../utils/constants';

 function createProgram(connection: Connection) {
  console.log('Creating program with PROGRAM_ID:', PROGRAM_ID.toBase58());
  console.log('IDL:', JSON.stringify(IDL, null, 2));

  const wallet = {
    publicKey: PublicKey.default,
    signTransaction: async () => { throw new Error("Not implemented"); },
    signAllTransactions: async () => { throw new Error("Not implemented"); },
  };

  const provider = new AnchorProvider(connection, wallet, AnchorProvider.defaultOptions());

  try {
    // Verify that the IDL is not undefined
    if (!IDL || typeof IDL !== 'object' || !('instructions' in IDL)) {
      throw new Error('Invalid IDL structure');
    }

    const program = new Program(IDL as Idl, PROGRAM_ID, provider);
    console.log('Program created successfully');
    return program;
  } catch (error) {
    console.error('Error creating program:', error);
    throw error;
  }
}

// Helper function to get Pyth price feed address
function getPythPriceFeedAddress(symbol: string): PublicKey {
  const pythFeeds: {[key: string]: string} = {
    'SOL': 'H6ARHf6YXhGYeQfUzQNGk6rDNnLBQKrenN712K4AQJEG',
    'BTC': 'GVXRSBjFk6e6J3NbVPXohDJetcTjaeeuykUpbQF8UoMU',
    // Add more symbols and their corresponding Pyth feed addresses
  };

  const feedAddress = pythFeeds[symbol.toUpperCase()];
  if (!feedAddress) {
    throw new Error(`No Pyth price feed found for symbol: ${symbol}`);
  }

  return new PublicKey(feedAddress);
}

// Helper function to derive price feed config PDA
function derivePriceFeedConfigPDA(priceFeed: PublicKey): PublicKey {
  const [priceFeedConfigPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from(PRICE_FEED_CONFIG_SEED), priceFeed.toBuffer()],
    PROGRAM_ID
  );
  return priceFeedConfigPDA;
}

// Create Market
export async function handleCreateMarketGetRequest(): Promise<ActionGetResponse> {
  return {
    icon: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
    label: 'Create Market',
    title: 'Create New Market',
    description: 'Create a new prediction market for a memecoin.',
    links: {
      actions: [
        {
          label: 'Create Market',
          href: '/api/create-market',
          parameters: [
            { name: 'memecoinSymbol', label: 'Memecoin Symbol', required: true },
            { name: 'feedSymbol', label: 'Price Feed Symbol (e.g., SOL, BTC)', required: true },
            { name: 'duration', label: 'Market Duration (seconds)', required: true }
          ]
        }
      ]
    }
  };
}

export async function handleCreateMarketPostRequest(
  memecoinSymbol: string,
  feedSymbol: string,
  duration: number,
  account: string,
  connection: Connection
): Promise<ActionPostResponse> {
  try {
    console.log('Creating market with params:', { memecoinSymbol, feedSymbol, duration, account });

    if (!memecoinSymbol || !feedSymbol || !duration || !account) {
      throw new Error(`Missing required parameters: ${JSON.stringify({ memecoinSymbol, feedSymbol, duration, account })}`);
    }

    const program = createProgram(connection);
    console.log('Program created successfully');

    const authorityPubkey = new PublicKey(account);
    console.log('Authority pubkey:', authorityPubkey.toBase58());

    const priceFeed = getPythPriceFeedAddress(feedSymbol);
    console.log('Price feed address:', priceFeed.toBase58());

    const priceFeedConfig = derivePriceFeedConfigPDA(priceFeed);
    console.log('Price feed config PDA:', priceFeedConfig.toBase58());

    const [marketPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from('market'), authorityPubkey.toBuffer(), Buffer.from(memecoinSymbol)],
      program.programId
    );
    console.log('Market PDA:', marketPDA.toBase58());

    console.log('Creating instruction...');
    const instruction = await program.methods.createMarket(memecoinSymbol, feedSymbol, new BN(duration))
      .accounts({
        market: marketPDA,
        priceFeedConfig: priceFeedConfig,
        priceFeed: priceFeed,
        authority: authorityPubkey,
        teamWallet: TEAM_WALLET,
        systemProgram: PublicKey.default,
      })
      .instruction();
    console.log('Instruction created successfully');

    const transaction = new Transaction().add(instruction);
    console.log('Transaction created successfully');

    const serializedTransaction = transaction.serialize({requireAllSignatures: false, verifySignatures: false});
    console.log('Transaction serialized successfully');

    return {
      transaction: serializedTransaction.toString('base64'),
    };
  } catch (error) {
    console.error('Error in handleCreateMarketPostRequest:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    throw error;
  }
}

// Place Bet
export async function handlePlaceBetGetRequest(market: string): Promise<ActionGetResponse> {
  return {
    icon: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', // 1x1 transparent GIF
    label: 'Place Bet',
    title: 'Place Bet',
    description: 'Place a bet on the market outcome.',
    links: {
      actions: [
        {
          label: 'Bet Up',
          href: `/api/place-bet/${market}?choice=true`,
          parameters: [
            {
              name: 'amount',
              label: 'Bet Amount (lamports)',
              required: true
            }
          ]
        },
        {
          label: 'Bet Down',
          href: `/api/place-bet/${market}?choice=false`,
          parameters: [
            {
              name: 'amount',
              label: 'Bet Amount (lamports)',
              required: true
            }
          ]
        },
      ],
    },
  };
}

export async function handlePlaceBetPostRequest(
  market: string,
  choice: boolean,
  amount: number,
  account: string,
  connection: Connection
): Promise<ActionPostResponse> {
  try {
    const program = createProgram(connection);
    
    const marketPubkey = new PublicKey(market);
    const userPubkey = new PublicKey(account);
    
    const [userPositionPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from(USER_POSITION_SEED), marketPubkey.toBuffer(), userPubkey.toBuffer()],
      program.programId
    );
    
    const instruction = await program.methods.placeBet(new BN(amount), choice)
      .accounts({
        market: marketPubkey,
        userPosition: userPositionPDA,
        user: userPubkey,
        systemProgram: PublicKey.default,
      })
      .instruction();
    
    const transaction = new Transaction().add(instruction);
    
    return {
      transaction: transaction.serialize({requireAllSignatures: false, verifySignatures: false}).toString('base64'),
    };
  } catch (error) {
    console.error('Error in handlePlaceBetPostRequest:', error);
    throw new Error('Failed to create place bet transaction');
  }
}

// Resolve Market
export async function handleResolveMarketGetRequest(market: string): Promise<ActionGetResponse> {
  return {
    icon: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', // 1x1 transparent GIF
    label: 'Resolve Market',
    title: 'Resolve Market',
    description: 'Resolve the market outcome.',
    links: {
      actions: [
        {
          label: 'Resolve',
          href: `/api/resolve-market/${market}`
        }
      ]
    }
  };
}

export async function handleResolveMarketPostRequest(
  market: string,
  account: string,
  connection: Connection
): Promise<ActionPostResponse> {
  try {
    const program = createProgram(connection);
    const marketPubkey = new PublicKey(market);
    const authorityPubkey = new PublicKey(account);

    const marketAccount = await program.account.market.fetch(marketPubkey);

    const priceFeed = getPythPriceFeedAddress(marketAccount.feedId);
    const priceFeedConfig = derivePriceFeedConfigPDA(priceFeed);

    const instruction = await program.methods.resolveMarket()
      .accounts({
        market: marketPubkey,
        authority: authorityPubkey,
        priceFeedConfig: priceFeedConfig,
        priceFeed: priceFeed,
      })
      .instruction();
    
    const transaction = new Transaction().add(instruction);
    
    return {
      transaction: transaction.serialize({requireAllSignatures: false, verifySignatures: false}).toString('base64'),
    };
  } catch (error) {
    console.error('Error in handleResolveMarketPostRequest:', error);
    throw new Error('Failed to create resolve market transaction');
  }
}

// Claim Winnings
export async function handleClaimWinningsGetRequest(market: string): Promise<ActionGetResponse> {
  return {
    icon: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', // 1x1 transparent GIF
    label: 'Claim Winnings',
    title: 'Claim Winnings',
    description: 'Claim your winnings from the market.',
    links: {
      actions: [
        {
          label: 'Claim',
          href: `/api/claim-winnings/${market}`
        }
      ]
    }
  };
}

export async function handleClaimWinningsPostRequest(
  market: string,
  account: string,
  connection: Connection
): Promise<ActionPostResponse> {
  try {
    const program = createProgram(connection);
    const marketPubkey = new PublicKey(market);
    const userPubkey = new PublicKey(account);
    
    const [userPositionPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from(USER_POSITION_SEED), marketPubkey.toBuffer(), userPubkey.toBuffer()],
      program.programId
    );
    
    const instruction = await program.methods.claimWinnings()
      .accounts({
        market: marketPubkey,
        userPosition: userPositionPDA,
        user: userPubkey,
        systemProgram: PublicKey.default,
      })
      .instruction();
    
    const transaction = new Transaction().add(instruction);
    
    return {
      transaction: transaction.serialize({requireAllSignatures: false, verifySignatures: false}).toString('base64'),
    };
  } catch (error) {
    console.error('Error in handleClaimWinningsPostRequest:', error);
    throw new Error('Failed to create claim winnings transaction');
  }
}

// Cancel Bet
export async function handleCancelBetGetRequest(market: string): Promise<ActionGetResponse> {
  return {
    icon: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', // 1x1 transparent GIF
    label: 'Cancel Bet',
    title: 'Cancel Bet',
    description: 'Cancel your bet on the market.',
    links: {
      actions: [
        {
          label: 'Cancel',
          href: `/api/cancel-bet/${market}`
        }
      ]
    }
  };
}

export async function handleCancelBetPostRequest(
  market: string,
  account: string,
  connection: Connection
): Promise<ActionPostResponse> {
  try {
    const program = createProgram(connection);
    const marketPubkey = new PublicKey(market);
    const userPubkey = new PublicKey(account);
    
    const [userPositionPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from(USER_POSITION_SEED), marketPubkey.toBuffer(), userPubkey.toBuffer()],
      program.programId
    );
    
    const instruction = await program.methods.cancelBet()
      .accounts({
        market: marketPubkey,
        userPosition: userPositionPDA,
        user: userPubkey,
        systemProgram: PublicKey.default,
      })
      .instruction();
    
    const transaction = new Transaction().add(instruction);
    
    return {
      transaction: transaction.serialize({requireAllSignatures: false, verifySignatures: false}).toString('base64'),
    };
  } catch (error) {
    console.error('Error in handleCancelBetPostRequest:', error);
    throw new Error('Failed to create cancel bet transaction');
  }
}

// Initialize Price Feed
export async function handleInitializePriceFeedGetRequest(): Promise<ActionGetResponse> {
  return {
    icon: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', // 1x1 transparent GIF
    label: 'Initialize Price Feed',
    title: 'Initialize Price Feed',
    description: 'Initialize a new price feed configuration',
    links: {
      actions: [
        {
          label: 'Initialize',
          href: '/api/initialize-price-feed',
          parameters: [
            { name: 'feedSymbol', label: 'Price Feed Symbol (e.g., SOL, BTC)', required: true }
          ]
        }
      ]
    }
  };
}

export async function handleInitializePriceFeedPostRequest(
  feedSymbol: string,
  account: string,
  connection: Connection
): Promise<ActionPostResponse> {
  try {
    const program = createProgram(connection);
    const payerPubkey = new PublicKey(account);
    
    const priceFeed = getPythPriceFeedAddress(feedSymbol);
    const priceFeedConfig = derivePriceFeedConfigPDA(priceFeed);
    
    const instruction = await program.methods.initializePriceFeed(priceFeed)
      .accounts({
        priceFeedConfig: priceFeedConfig,
        payer: payerPubkey,
        systemProgram: PublicKey.default,
      })
      .instruction();
    
    const transaction = new Transaction().add(instruction);
    
    return {
      transaction: transaction.serialize({requireAllSignatures: false, verifySignatures: false}).toString('base64'),
    };
  } catch (error) {
    console.error('Error in handleInitializePriceFeedPostRequest:', error);
    throw new Error('Failed to create initialize price feed transaction');
  }
}