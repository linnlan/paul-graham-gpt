import { Navbar } from "@/components/Navbar";
import Head from "next/head";
import { IconSearch, IconArrowRight, IconExternalLink } from "@tabler/icons-react";
import { KeyboardEvent, useRef, useState } from "react";
import { PGChunk } from "@/types";
import endent from "endent";
import { Answer } from "@/components/Answer/Answer";
import { Footer } from "@/components/Footer";

export default function Home() {

  const inputRef = useRef<HTMLInputElement>(null); 
  
  const [query, setQuery] = useState<string>("");
  const [answer, setAnswer] = useState<string>("");
  const [chunks, setChunks] = useState<PGChunk[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const handleAnswer = async () => {
    if(!query) {
      alert("Please enter a query");
      return;
    }
    
    setAnswer("");
    setChunks([]);

    setLoading(true);

    const searchResponse = await fetch("/api/search",{  //get relevant passages for query
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({query})
    });

    if(!searchResponse.ok) {
      setLoading(false);
      throw new Error(searchResponse.statusText);
    }

    const results: PGChunk[] = await searchResponse.json();
    setChunks(results);
    
    const prompt = endent` 
    Use the following passages to provide an answer to the query: "${query}"  

    ${results?.map((d: any) => d.content).join("\n\n")}
    `;
    //endent preserves indentation of string

    const answerResponse = await fetch("/api/answer",{ //use relevant passages to get an answer from gpt
      method: "POST",
      headers:{
        "Content-Type": "application/json"
      },
      body: JSON.stringify({prompt})
    });

    if(!answerResponse.ok)
    {
      setLoading(false);
      throw new Error(answerResponse.statusText);
    }
    
    const data = answerResponse.body;

    if(!data)
    {
      return;
    }

    setLoading(false);
    
    const reader = data.getReader();
    const decoder = new TextDecoder();
    let done = false; //boolean true is returned once streaming is done

    while(!done)
    {
      const { value, done: doneReading } = await reader.read();
      done = doneReading;
      const chunkValue = decoder.decode(value);
      setAnswer((prev) => prev + chunkValue);
    }

    inputRef.current?.focus();

  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if(e.key === "Enter") {
      handleAnswer();
    }
  }

  return (
    <>
      <Head>
        <title>Paul Graham GPT</title>
        <meta
          name="description"
          content={`AI-powered search and chat for Paul Graham's essays.`}
        />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1"
        />
        <link
          rel="icon"
          href="/favicon.ico"
        />
      </Head>

      <div className="flex flex-col h-screen">
        <Navbar/>
        <div className="flex-1 overflow-auto">
          <div className="mx-auto flex h-full w-full max-w-[750px] flex-col items-center px-3 pt-4 sm:pt-8">

              <div className="relative w-full mt-4"> {/*search bar*/}
                <IconSearch className="absolute top-3 w-10 left-1 h-6 rounded-full opacity-50 sm:left-3 sm:top-4 sm:h-8" />

                <input
                  ref={inputRef}
                  className="h-12 w-full rounded-full border border-zinc-600 pr-12 pl-11 focus:border-zinc-800 focus:outline-none focus:ring-1 focus:ring-zinc-800 sm:h-16 sm:py-2 sm:pr-16 sm:pl-16 sm:text-lg"
                  type="text"
                  placeholder="How do I start a startup?"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                />

                <button>
                  <IconArrowRight
                    className="absolute right-2 top-2.5 h-7 w-7 rounded-full bg-blue-500 p-1 hover:cursor-pointer hover:bg-blue-600 sm:right-3 sm:top-3 sm:h-10 sm:w-10 text-white"
                    onClick={handleAnswer}
                  />
                </button>
              </div>
              

            {loading ? (
              <div className = "mt-6 w-full">
                
                <div className="font-bold text-2xl">Answer</div>
                  <div className="animate-pulse mt-2">
                    <div className="h-4 bg-gray-300 rounded"></div>
                    <div className="h-4 bg-gray-300 rounded mt-2"></div>
                    <div className="h-4 bg-gray-300 rounded mt-2"></div>
                    <div className="h-4 bg-gray-300 rounded mt-2"></div>
                    <div className="h-4 bg-gray-300 rounded mt-2"></div>
                  </div>

                <div className="font-bold text-2xl mt-6">Passages</div>
                  <div className="animate-pulse mt-2">
                    <div className="h-4 bg-gray-300 rounded"></div>
                    <div className="h-4 bg-gray-300 rounded mt-2"></div>
                    <div className="h-4 bg-gray-300 rounded mt-2"></div>
                    <div className="h-4 bg-gray-300 rounded mt-2"></div>
                    <div className="h-4 bg-gray-300 rounded mt-2"></div>
                </div>

              </div>
            ): answer ? (
              <div className="mt-6">
                <div className="font-bold text-2xl mb-2">Answer</div>
                <Answer text={answer} />

                <div className = "mt-6 mb-16">
                  <div className = "font-bold text-2x1">Passages</div>

                  {chunks.map((chunk,index) => (
                    <div key={index}>
                      <div className="mt-4 border border-zinc-600 rounded-lg p-4">
                        <div className="flex justify-between">
                          <div>
                            <div className="font-bold text-x1">{chunk.essay_title}</div>
                            <div className="mt-1 font-bold text-sm">{chunk.essay_date}</div>
                          </div>
                          <a
                            className="hover:opacity-50 m1-2"
                            href={chunk.essay_url}
                            target="_blank"
                            rel="noreferrer"
                          >
                            <IconExternalLink/>
                          </a>
                        </div>
                        <div className="mt-2">{chunk.content}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>    
            ) : chunks.length > 0 ? (
              <div className = "mt-6 mb-16">
                <div className = "font-bold text-2x1">Passages</div>

                {chunks.map((chunk,index) => (
                  <div key={index}>
                    <div className="mt-4 border border-zinc-600 rounded-lg p-4">
                      <div className="flex justify-between">
                        <div>
                          <div className="font-bold text-x1">{chunk.essay_title}</div>
                          <div className="mt-1 font-bold text-sm">{chunk.essay_date}</div>
                        </div>
                        <a
                          className="hover:opacity-50 m1-2"
                          href={chunk.essay_url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <IconExternalLink/>
                        </a>
                      </div>
                      <div className="mt-2">{chunk.content}</div>
                    </div>
                  </div>
                ))}
              </div>
            ): (
              <div className="mt-6 text-center text-lg">{`AI-powered search & chat for Paul Graham's essays.`}</div>
            )}
          </div>
        </div>
        <Footer/>
      </div>
    </>
  );
}
