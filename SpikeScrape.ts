// import cheerio from "cheerio";
import axios from "axios";
import axiosCookieJarSupport from "axios-cookiejar-support";
import tough from "tough-cookie";
import { readFile } from "fs";
import HttpsProxyAgent from "https-proxy-agent";

// import { promises as fs } from "fs";
import * as cheerio from "cheerio";

let currentMatches: any[];

const spikeHomeURL: string = "https://www.thespike.gg/";
const spikeMatchesURL: string = "https://www.thespike.gg/matches/";

let proxyList: string[];

axiosCookieJarSupport(axios);

const GetRandomProxyAgent = () => {
  // console.log("proxyList", proxyList);
  const randomProxy = proxyList[Math.floor(Math.random() * proxyList.length)]
    .replace("\r", "")
    .split(":");
  // @ts-ignore
  const randomProxyAgent: any = new HttpsProxyAgent(
    `http://${randomProxy[2]}:${randomProxy[3]}@${randomProxy[0]}:${randomProxy[1]}`
  );
  console.log(`Random Proxy Used:`, randomProxy);
  return randomProxyAgent;
};

// @ts-ignore
const GetHomePage = async (
  reqURL: string,
  cookieJar: tough.CookieJar,
  randomProxyAgent: any
) => {
  try {
    const homePage: any = await axios.get(reqURL, {
      jar: cookieJar, // tough.CookieJar or boolean
      withCredentials: true, // If true, send cookie stored in jar
      headers: {
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.93 Safari/537.36",
      },
      httpsAgent: randomProxyAgent,
    });
    return homePage.status === 200 ? true : false;
  } catch (error) {
    console.log(`GetHomePage Error: ${error.message}`);
  }
};

const GetSpikeMatches = async (
  cookieJar: tough.CookieJar,
  randomProxyAgent: any
) => {
  try {
    const matchesRes: any = await axios.get(spikeMatchesURL, {
      jar: cookieJar, // tough.CookieJar or boolean
      withCredentials: true, // If true, send cookie stored in jar
      headers: {
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.93 Safari/537.36",
      },
      httpsAgent: randomProxyAgent,
    });
    return matchesRes.status === 200 ? matchesRes.data : false;
  } catch (error) {}
};

// * Get home session cookie
// * Make matches request
// * Return matches
const GetMatches = async (cookieJar: tough.CookieJar) => {
  try {
    const randomProxyAgent = GetRandomProxyAgent();
    const homePageRes = await GetHomePage(
      spikeHomeURL,
      cookieJar,
      randomProxyAgent
    );
    if (homePageRes) {
      // * Home page request was 200, make request to matches page now with cookieJar
      console.log(`Making match request:`);
      const matchesPage = await GetSpikeMatches(cookieJar, randomProxyAgent);
      return matchesPage;
    }
  } catch (e) {
    console.log(`GetMatches() Error: ${e.message}`);
    throw new Error(e.message);
  }
};

const ScrapeHTML = async (cookieJar: tough.CookieJar) => {
  try {
    const getMatchesRes = await GetMatches(cookieJar);
    // console.log(getMatchesRes);
    const $ = cheerio.load(getMatchesRes);
    const matchesOverview = $(`#match-overview > ul > * > a`);
    // const matchesOverview = $(`#match-overview > ul > li:nth-child(2) > a`);
    const finalMatchList: any[] = [];

    // @ts-ignore
    matchesOverview.each((i, el) => {
      let matchTeams = $(el)
        .find(".match-info-match")
        .text()
        .split(" vs ")
        .join()
        .replace(/\s +/g, "")
        .split(" ,");

      const tournamentTitle = $(el).find(".match-info-event").text();

      // * 24 time of match start
      // * Dependant on locale of proxy IP address used to make request.
      const matchStart = $(el)
        .find(".non-countdown")
        .text()
        .replace("\n", "")
        .replace(/^\s+|\s+$|\s+(?=\s)/g, "");

      const allLogos: string[] = [];

      $(el)
        .find(".match-info-match img")
        // @ts-ignore
        .each((i, el) => {
          const teamLogo = $(el).attr("src");
          allLogos.push(teamLogo as string);
        });

      const teamLogos: string[] = [];

      teamLogos.push(allLogos[0]);
      teamLogos.push(allLogos[allLogos.length - 1]);
      if (i === 0) {
        console.log(allLogos);
        console.log(teamLogos);
      }
      const matchLink = `https://thespike.gg${$(el).attr("href")}`;

      const matchID = $(el)
        .attr("href")
        ?.split("/")
        .find((value) => {
          if (/^-?\d+$/.test(value)) {
            return value;
          } else {
            return false;
          }
        });

      // console.log(matchTeams, teamLogos, matchLink, matchID);
      if (
        matchTeams[0].toLowerCase() !== "tbd" &&
        matchTeams[1].toLowerCase() !== "tbd"
      ) {
        finalMatchList.push({
          sport: "Valorant",
          tournamentTitle,
          teamOne: matchTeams[0],
          teamOneOdds: 1.0,
          teamOneImageURL: teamLogos[0],
          teamTwo: matchTeams[1],
          teamTwoOdds: 1.0,
          teamTwoImageURL: teamLogos[1],
          matchLink,
          matchID,
          matchStart,
        });
      }
    });
    console.log(`finalMatchList ${finalMatchList.length}`);
    return finalMatchList;
  } catch (e) {
    throw new Error(e.message);
  }
};

(async () => {
  try {
    await readFile("./Proxies.txt", "utf8", async (err, data) => {
      if (err) throw err;
      proxyList = data.split("\n");
      if (proxyList !== undefined) {
        console.log(`Making Vlr Home Request... ${proxyList}`);
        const cookieJar = new tough.CookieJar();
        currentMatches = await ScrapeHTML(cookieJar);
      }
    });
  } catch (e) {
    console.log(`main block Error: ${e.message}`);
  }
})();

export const GetHomepageMatches = () => {
  return currentMatches;
};
