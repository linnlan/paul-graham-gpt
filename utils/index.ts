import { createClient } from "@supabase/supabase-js";
import { OpenAIModel } from "@/types";
import { createParser, ParsedEvent, ReconnectInterval } from "eventsource-parser";

export const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!); //connecting to supabase

export const OpenAIStream = async(prompt: string) => { //openai stream task
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    const res = await fetch("https://api.openai.com/v1/chat/completions",{ //chat completion task
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
        },
        method: "POST",
        body: JSON.stringify({
            model: OpenAIModel.DAVINCI_TURBO,
            messages: [
                {
                    role: "system",
                    content: "You are a helpful assistant that accurately answers queries using Paul Graham's essays. Use the text provided to form your answer, but avoid copying word-for-word from the essays. Try to use your own words when possible. Keep your answer under 5 sentences. Be accurate, helpful, concise, and clear."
                },
                {
                    role: "user",
                    content: prompt
                }
            ],
            max_tokens: 150,
            temperature: 0.0,
            stream: true
        })
    });

    if(res.status!==200) {
        throw new Error("OpenAI API returned an error");
    }

    const stream = new ReadableStream({ //readable stream of data
        async start(controller) { //start() is called when stream starts with controller object to control the stream
            const onParse = (event: ParsedEvent | ReconnectInterval) => { //ParsedEvent - structured server sent event containing data in form of payload. ReconnectInterval - contains data to tell in how much time client should attempt to reconnect 
                if(event.type === 'event') {
                    const data = event.data; //get the data

                    if(data==="[DONE]")
                    {
                        controller.close(); //if done, close the stream
                        return;
                    }
                    try{
                        const json = JSON.parse(data);
                        const text = json.choices[0].delta.content; 
                        const queue = encoder.encode(text); //content is text-encoded
                        controller.enqueue(queue); //content is queued
                    }
                    catch(e) {
                        controller.error(e);
                    }
                }
            };

            const parser = createParser(onParse); //parser created which used onParse function to manage the stream

            for await(const chunk of res.body as any){
                parser.feed(decoder.decode(chunk)); //decode the chunk and feed to the parser
            }
        }
    });
    return stream;
};