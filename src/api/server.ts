import express from "express";
import { Connection } from "@solana/web3.js";
import cors from "cors";
import path from "path";
import * as blinks from "../blink/iBlinked";
import { RPC_URL } from "../utils/constants";

const app = express();
const connection = new Connection(RPC_URL);

// Add CORS middleware
app.use(cors());

app.use(express.json());

app.get("/actions.json", (req, res) => {
  res.sendFile(path.join(__dirname, "../actions.json"));
});

app.get("/test", (req, res) => {
  res.json({ message: "Server is running correctly" });
});

// Place Bet
app.get("/api/place-bet/:market", async (req, res) => {
  try {
    const { market } = req.params;
    const response = await blinks.handlePlaceBetGetRequest(market);
    res.json(response);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/api/place-bet/:market", async (req, res) => {
  try {
    const { market } = req.params;
    const { choice, amount, account } = req.body;
    const response = await blinks.handlePlaceBetPostRequest(
      market,
      choice,
      amount,
      account,
      connection
    );
    res.json(response);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Create Market
app.get("/api/create-market", async (req, res) => {
  try {
    const response = await blinks.handleCreateMarketGetRequest();
    res.json(response);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/api/create-market", async (req, res) => {
  try {
    console.log(
      "Received POST request to /api/create-market with body:",
      req.body
    );
    const { memecoinSymbol, feedSymbol, duration } = req.query;
    const account = req.body.account || req.query.account;

    if (!memecoinSymbol || !feedSymbol || !duration || !account) {
      console.log("Missing required parameters:", {
        memecoinSymbol,
        feedSymbol,
        duration,
        account,
      });
      return res.status(400).json({
        error: "Missing required parameters",
        missingParams: { memecoinSymbol, feedSymbol, duration, account },
      });
    }

    const response = await blinks.handleCreateMarketPostRequest(
      memecoinSymbol as string,
      feedSymbol as string,
      Number(duration),
      account,
      connection
    );
    res.json(response);
  } catch (error) {
    console.error("Error in POST /api/create-market:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Resolve Market
app.get("/api/resolve-market/:market", async (req, res) => {
  try {
    const { market } = req.params;
    const response = await blinks.handleResolveMarketGetRequest(market);
    res.json(response);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/api/resolve-market/:market", async (req, res) => {
  try {
    const { market } = req.params;
    const { account } = req.body;
    const response = await blinks.handleResolveMarketPostRequest(
      market,
      account,
      connection
    );
    res.json(response);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Claim Winnings
app.get("/api/claim-winnings/:market", async (req, res) => {
  try {
    const { market } = req.params;
    const response = await blinks.handleClaimWinningsGetRequest(market);
    res.json(response);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/api/claim-winnings/:market", async (req, res) => {
  try {
    const { market } = req.params;
    const { account } = req.body;
    const response = await blinks.handleClaimWinningsPostRequest(
      market,
      account,
      connection
    );
    res.json(response);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Cancel Bet
app.get("/api/cancel-bet/:market", async (req, res) => {
  try {
    const { market } = req.params;
    const response = await blinks.handleCancelBetGetRequest(market);
    res.json(response);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/api/cancel-bet/:market", async (req, res) => {
  try {
    const { market } = req.params;
    const { account } = req.body;
    const response = await blinks.handleCancelBetPostRequest(
      market,
      account,
      connection
    );
    res.json(response);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

app.options("*", cors());
