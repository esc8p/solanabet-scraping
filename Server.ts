import express from "express";
import cors from "cors";
// @ts-ignore
import { GetHomepageMatches } from "./SpikeScrape";

const app = express();
app.use(cors());

const SERVER_PORT = 3333;

// let currentMatches: any[];

// (async () => {
//   console.log(`Making Vlr Home Request...`);
//   currentMatches = GetHomepageMatches();
// })();

app.get("/getvalorantmatches", async (req: any, res: any) => {
  if (req) {
    try {
      res.json(GetHomepageMatches());
    } catch (e) {
      console.log(`main block Error: ${e.message}`);
      res.json({ status: "Error", message: "An Error Has Occured" });
    }
  }
});

app.get("/", (req: any, res: any) => {
  if (req) {
    res.send("Hello World");
  }
});

app.listen(SERVER_PORT);
console.log(`Running Server @ Port: ${SERVER_PORT}`);
