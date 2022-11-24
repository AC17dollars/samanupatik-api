import express from 'express';
import axios from 'axios';
import cors from 'cors';

const PORT = process.env.PORT || 3000;

const app = express()
    .use(express.json())
    .use(cors());

let cachedData = {time:0};
initialFetch().then((response)=>{cachedData=response});

async function initialFetch() {
    let cachedData = {time:0};
    cachedData.data = [];
    try {
        const response = await axios.get("https://result.election.gov.np/JSONFiles/Election2079/Common/PRHoRPartyTop5.txt");
        cachedData.data = [];
        for(let i=0; i<response.data.length; i++){
            const singleData = {
                TotalVoteReceived: response.data[i].TotalVoteReceived,
                PoliticalPartyName: response.data[i].PoliticalPartyName,
                SymbolID: response.data[i].SymbolID
            };
            cachedData.data.push(singleData);
        }
        cachedData.time = Date.now();
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
            const response = await axios.get("https://result.election.gov.np/JSONFiles/Election2079/Common/PRHoRPartyTop5.txt");
            cachedData.data = [];
            for(let i=0; i<response.data.length; i++){
                const singleData = {
                    TotalVoteReceived: response.data[i].TotalVoteReceived,
                    PoliticalPartyName: response.data[i].PoliticalPartyName,
                    SymbolID: response.data[i].SymbolID
                };
                cachedData.data.push(singleData);
            }
            cachedData.time = Date.now();
            res.send(cachedData.data);
        }
    } catch (err) {
        res.status(500).send("Internal Error");
    }
});

app.get("/misc", async (req, res) => {
    let totalVotes = 0;
    
    if (!((Date.now() - cachedData.time) <= 60000)) {
        try{
            const response = await axios.get("https://result.election.gov.np/JSONFiles/Election2079/Common/PRHoRPartyTop5.txt");
            cachedData.data = [];
            for(let i=0; i<response.data.length; i++){
                const singleData = {
                    TotalVoteReceived: response.data[i].TotalVoteReceived,
                    PoliticalPartyName: response.data[i].PoliticalPartyName,
                    SymbolID: response.data[i].SymbolID
                };
                cachedData.data.push(singleData);
            }
            cachedData.time = Date.now();
        }catch(err){
            console.log("Fetch Error in /misc");
            res.status(500).send("Error. Try Again");
        }
    }
    for (let i = 0; i < cachedData.data.length; i++) {
        totalVotes += cachedData.data[i].TotalVoteReceived;
    }

    let votesPerSeat = totalVotes/110;

    let zeroSeatedVotes = 0;
    let zeroSeatedCount = 0;
    for(let i =0; i< cachedData.data.length; i++){
        if(cachedData.data[i].TotalVoteReceived < votesPerSeat){
            zeroSeatedVotes += cachedData.data[i].TotalVoteReceived;
            zeroSeatedCount += 1;
        }
    }
    let zeroSeatedDivide = zeroSeatedVotes/(cachedData.data.length - zeroSeatedCount);

    res.send ({totalVotes, votesPerSeat, zeroSeatedCount, zeroSeatedVotes, zeroSeatedDivide});
    

});



app.listen(PORT, () => {
    console.log(`Server started at port ${PORT}`);
});