import { PGEssay, PGJSON } from "@/types";
import { loadEnvConfig } from "@next/env";
import OpenAI from 'openai';
import { createClient } from "@supabase/supabase-js";
import fs from "fs";

loadEnvConfig("");

const generateEmbeddings = async (essays: PGEssay[]) => {

    const openai = new OpenAI({apiKey: process.env.OPENAI_API_KEY}); //connecting to openai     

    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!); //connecting to supabase

    for(let i=0;i<essays.length;i++)
    {
        const section = essays[i]; //each essay

        for(let j=0;j<section.chunks.length;j++)
        {
            const chunk = section.chunks[j]; //each chunk for which we need embedding
            const {essay_title, essay_url, essay_date, essay_thanks, content, content_length, content_tokens} = chunk;
            const embeddingResponse = await openai.embeddings.create({
                model: "text-embedding-ada-002",
                input: content
            });

            const embedding = embeddingResponse.data[0].embedding; //embedding

            const {data, error} = await supabase //inserting into table
            .from("paul_graham")
            .insert({
                essay_title,
                essay_url,
                essay_date,
                essay_thanks,
                content,
                content_length,
                content_tokens,
                embedding
            })
            .select("*");

            if(error){
                console.log("error",error);
            }
            else{
                console.log("saved",i,j);
            }
        }
    }
};

(async () => {
    const book: PGJSON = JSON.parse(fs.readFileSync("scripts/pg.json","utf8")); //reading the json file
    await generateEmbeddings(book.essays); //getting all the essays from json
})();