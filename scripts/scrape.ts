import { PGJSON, PGChunk, PGEssay } from '@/types';
import axios from 'axios';
import * as cheerio from 'cheerio'; //for parsing html
import {encode} from 'gpt-3-encoder';
import fs from "fs";
const tqdm = require('tqdm');

const BASE_URL = "http://www.paulgraham.com/";
const CHUNK_SIZE = 200;

const getLinks = async () => { //get links scraped from articles.html

    const html = await axios.get(`${BASE_URL}articles.html`);
    const $ = cheerio.load(html.data); //html data parsed

    const tables = $("table"); //get the table elements
    
    const linksArr: { url: string, title: string }[] = [];

    tables.each((i,table) =>{
        if(i==2) { //list of links are the second table (found using developer tools -> element)
            const links = $(table).find('a');
            links.each((i,link) => {
                const url = $(link).attr('href');
                const title = $(link).text();

                if(url && url.endsWith(".html")) //check if it's valid
                {
                    const linkObj = {
                        url,
                        title
                    };

                    linksArr.push(linkObj);
                }
            });
        }
    });

    return linksArr;
};

const getEssay = async (linkObj: {url: string, title: string}) => {//scrape essays and clean it 
    const {title, url} = linkObj;

    let essay: PGEssay = { //initializing
        title: "",
        url: "",
        date: "",
        thanks: "",
        content: "",
        length: 0,
        tokens: 0,
        chunks: []
    };

    const fullLink = BASE_URL + url;
    const html = await axios.get(fullLink);
    const $ = cheerio.load(html.data);
    const tables = $("table");

    tables.each((i,table)=>{
        if(i==1) //essay is in the first table, found using developer tools on the page itself
        {
            const text = $(table).text();
            
            let cleanedText = text.replace(/\s+/g, " "); //replace mutlispaces with a single space
            cleanedText = cleanedText.replace(/\.([a-zA-Z])/g, ". $1"); //add space after each fullstop

            const date = cleanedText.match(/([A-Z][a-z]+ [0-9]{4})/); //get date, it's in the form [Capital Letter][Rest of the letters] [YYYY]
            let dateStr = "";
            let textWithoutDate = "";

            if(date) {
                dateStr = date[0];
                textWithoutDate = cleanedText.replace(date[0],"");
            }

            let essayText = textWithoutDate.replace(/\n/g, " "); //removes \n with space
            let thanksTo = "";

            const split = essayText.split(". ").filter((s)=>s) //get all strings separated fullstop
            const lastSentence = split[split.length-1]; //gets last sentence

            if(lastSentence && lastSentence.includes("Thanks to"))
            {
                const thanksToSplit = lastSentence.split("Thanks to"); //gets the thanks to
                if(thanksToSplit[1].trim()[thanksToSplit[1].trim().length-1] === '.') //to put full stop
                {
                    thanksTo = "Thanks to " + thanksToSplit[1].trim()
                }
                else
                {
                    thanksTo = "Thanks to " + thanksToSplit[1].trim() + ".";
                }
                essayText = essayText.replace(thanksTo,"");
            }
            
            const trimmedContent = essayText.trim();

            essay = {
                title,
                url: fullLink,
                date: dateStr,
                thanks: thanksTo.trim(),
                content: trimmedContent,
                length: trimmedContent.length,
                tokens: encode(trimmedContent).length,
                chunks: [] 
            };
        }
    });
    return essay;
};

const chunkEssay = async(essay: PGEssay) => {// to get chunks of essay
    const {title, url, date, thanks, content, ...restProperties} = essay;

    let essayTextChunks = []; //contains uniform size chunks

    if (encode(content).length > CHUNK_SIZE)
    {
        const split = content.split(". ");
        let chunkText = "";
        for(const sentence of split)
        {
            const sentenceTokenLength = encode(sentence).length;
            const chunkTextTokenLength = encode(chunkText).length;
            
            if(chunkTextTokenLength + sentenceTokenLength > CHUNK_SIZE)
            {
                essayTextChunks.push(chunkText);
                chunkText = "";
            }

            if(sentence[sentence.length -1].match(/[a-z0-9]/i)) { //if sentence doesnt end with .
                chunkText += sentence + ". ";
            }
            else
            {
                chunkText += sentence + " ";
            }
        }
        essayTextChunks.push(chunkText.trim());
    }
    else
    {
        essayTextChunks.push(content.trim());
    }

    const essayChunks = essayTextChunks.map((text)=>{ //create PGChunks
        const trimmedText = text.trim();

        const chunk: PGChunk = {
            essay_title: title,
            essay_url: url,
            essay_date: date,
            essay_thanks: thanks,
            content: trimmedText,
            content_length: trimmedText.length,
            content_tokens: encode(trimmedText).length,
            embedding: []
        };
        
        return chunk;
    });

    if(essayChunks.length > 1) //for uniformity of chunk sizes
    {
        for(let i=0;i<essayChunks.length;i++)
        {
            const chunk = essayChunks[i];
            const prevChunk = essayChunks[i-1];
            if(chunk.content_tokens < 100 && prevChunk)
            {
                const mergedContentTokens = prevChunk.content_tokens + chunk.content_tokens;
                if(mergedContentTokens <= CHUNK_SIZE) 
                {
                    prevChunk.content += " " + chunk.content;
                    prevChunk.content_length += chunk.content_length;
                    prevChunk.content_tokens = mergedContentTokens;
                    essayChunks.splice(i,1);
                    i--;
                }
            }
        }
    }

    const chunkedSection: PGEssay = {
        ...essay,
        chunks: essayChunks
    };

    return chunkedSection;
}

(async () => {
    const links = await getLinks();

    let essays = [];

    for(let link of tqdm(links))
    {
        const essay = await getEssay(link);
        const chunkedEssay = await chunkEssay(essay);
        essays.push(chunkedEssay);
    }

    const json: PGJSON = {
        current_date: new Date().toISOString().split('T')[0],
        author: "Paul Graham",
        url: `${BASE_URL}articles.html`,
        length: essays.reduce((acc,essay)=> acc+essay.length,0),
        tokens: essays.reduce((acc,essay)=>acc+essay.tokens,0),
        essays
    };

    fs.writeFileSync("scripts/pg.json", JSON.stringify(json));

})();