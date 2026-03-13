import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

let amadeusToken = "";
let tokenExpiry = 0;

async function getAmadeusToken() {
  if (amadeusToken && Date.now() < tokenExpiry) {
    return amadeusToken;
  }

  const clientId = process.env.AMADEUS_CLIENT_ID;
  const clientSecret = process.env.AMADEUS_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("AMADEUS_CLIENT_ID and AMADEUS_CLIENT_SECRET are required");
  }

  const response = await fetch("https://test.api.amadeus.com/v1/security/oauth2/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get Amadeus token: ${error}`);
  }

  const data = await response.json();
  amadeusToken = data.access_token;
  tokenExpiry = Date.now() + (data.expires_in - 60) * 1000; // Buffer of 60 seconds
  return amadeusToken;
}

app.get("/api/amadeus-status", async (req, res) => {
  try {
    const token = await getAmadeusToken();
    res.json({ status: "connected", token_active: !!token });
  } catch (error: any) {
    res.status(500).json({ status: "error", message: error.message });
  }
});

// API Routes
app.get("/api/city-search", async (req, res) => {
  try {
    const { keyword, subType = "CITY,AIRPORT" } = req.query;
    if (!keyword) return res.status(400).json({ error: "Keyword is required" });

    const token = await getAmadeusToken();
    
    // Using the locations endpoint as it's best for general keyword/IATA search
    const url = `https://test.api.amadeus.com/v1/reference-data/locations?subType=${subType}&keyword=${keyword}&view=LIGHT&page[limit]=10`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/flight-search", async (req, res) => {
  try {
    const { originLocationCode, destinationLocationCode, departureDate, returnDate, adults, children, travelClass } = req.query;

    if (!originLocationCode || !destinationLocationCode || !departureDate || !adults) {
      return res.status(400).json({ error: "Missing required parameters" });
    }

    const token = await getAmadeusToken();
    const params = new URLSearchParams({
      originLocationCode: originLocationCode as string,
      destinationLocationCode: destinationLocationCode as string,
      departureDate: departureDate as string,
      adults: adults as string,
      max: "10",
      currencyCode: "EUR",
    });

    if (returnDate) {
      params.append("returnDate", returnDate as string);
    }
    
    if (children && parseInt(children as string) > 0) {
      params.append("children", children as string);
    }

    if (travelClass) {
      params.append("travelClass", travelClass as string);
    }

    const response = await fetch(
      `https://test.api.amadeus.com/v2/shopping/flight-offers?${params.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const data = await response.json();
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
