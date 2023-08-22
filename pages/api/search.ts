import { supabaseAdmin} from "@/utils";

export const config = {
    runtime: "edge" //edge function
};

//search handler
const handler = async (req: Request): Promise<Response> => { //gets a request, returns a Promise of response
    try
    {
        const {query } = (await req.json()) as { //request body, for now we are just taking prompt
            query: string;
        };

        const input = query.replace("/\n/g", " "); //removes new lines from query

        const res = await fetch("https://api.openai.com/v1/embeddings", { //get query embeddings
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
            },
            method: "POST",
            body: JSON.stringify({
                model: "text-embedding-ada-002",
                input
            })
        });

        const json = await res.json();
        const embedding = json.data[0].embedding;

        const {data: chunks, error} = await supabaseAdmin.rpc("paul_graham_search",{ //make server side routine call for matched chunks
            query_embedding: embedding,
            similarity_threshold: 0.01,
            match_count: 5
        });

        if(error) {
            console.log(error);
            return new Response("Error", {status: 500});
        }

        return new Response(JSON.stringify(chunks), {status: 200}); //return chunks in JSON
    }
    catch(error)
    {
        return new Response("Error", {status: 500});
    }
};

export default handler;