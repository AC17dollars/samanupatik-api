import express from 'express';
import axios from 'axios';
import cors from 'cors';

const PORT = process.env.PORT || 3000;

const app = express()
    .use(express.json())
    .use(cors());

let cachedData = { time: 0 };
let miscData = { time: 0 };
initialFetch().then((response) => { cachedData = response; console.log("Inital Fetch Complete") });

async function setCachedData() {
    const response = await axios.get("https://result.election.gov.np/JSONFiles/Election2079/Common/PRHoRPartyTop5.txt");
    cachedData.data = [];
    for (let i = 0; i < response.data.length; i++) {
        const singleData = {
            TotalVoteReceived: response.data[i].TotalVoteReceived,
            PoliticalPartyName: response.data[i].PoliticalPartyName,
            SymbolID: response.data[i].SymbolID
        };
        cachedData.data.push(singleData);
    };
    cachedData.time = Date.now();
}

function setCalcAndFlags() {
    cachedData.data.forEach(async (data) => {
        if(data.TotalVoteReceived < miscData.votesPerSeat){
            data.SamanupatikSeats = 0;
        } else {
            data.SamanupatikSeats = (data.TotalVoteReceived + miscData.zeroSeatedDivide) / miscData.votesPerSeat;
        }
            data.Logo = `https://result.election.gov.np/Images/symbol-hor-pa/${data.SymbolID}.jpg?v=0.1`;
    });
}

async function setMiscData() {
    miscData.totalVotes = 0;

    if (!((Date.now() - cachedData.time) <= 60000)) {
        try {
            await setCachedData();
        } catch (err) {
            console.log("Fetch Error in /misc");
            return "ERROR";
        }
    }
    for (let i = 0; i < cachedData.data.length; i++) {
        miscData.totalVotes += cachedData.data[i].TotalVoteReceived;
    }

    miscData.votesPerSeat = miscData.totalVotes / 110;

    miscData.zeroSeatedVotes = 0;
    miscData.zeroSeatedCount = 0;
    for (let i = 0; i < cachedData.data.length; i++) {
        if (cachedData.data[i].TotalVoteReceived < miscData.votesPerSeat) {
            miscData.zeroSeatedVotes += cachedData.data[i].TotalVoteReceived;
            miscData.zeroSeatedCount += 1;
        }
    }
    miscData.zeroSeatedDivide = miscData.zeroSeatedVotes / (cachedData.data.length - miscData.zeroSeatedCount);
    return miscData;
}

async function initialFetch() {
    cachedData.data = [];
    try {
        await setCachedData();
        await setMiscData();
        setCalcAndFlags();
    } catch (err) {
        console.log("initial fetch error");
        console.log(err);
    }
    return cachedData;
}

app.get("/", async (req, res) => {
    try {
        if ((Date.now() - cachedData.time) <= 60000) {
            res.send(cachedData.data);
        } else {
            await setCachedData();
            await setMiscData();
            setCalcAndFlags();
            res.send(cachedData.data);
        }
    } catch (err) {
        res.status(500).send("Internal Error");
    }
});

app.get("/misc", async (req, res) => {
    const result = await setMiscData();
    if (result === "ERROR") {
        res.status(500).send("Fetch Error");
    } else {
        res.send(miscData);
    }
});



app.listen(PORT, () => {
    console.log(`Server started at port ${PORT}`);
});